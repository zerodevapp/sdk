import {
  fromHex,
  type Address,
  type Chain,
  type Hash,
  type Hex,
  type HttpTransport,
  type RpcTransactionRequest,
  getAbiItem,
} from "viem";
import {
  deepHexlify,
  resolveProperties,
  type SmartAccountProviderOpts,
  type UserOperationCallData,
  type BatchUserOperationCallData,
  type SendUserOperationResult,
  asyncPipe,
  noOpMiddleware,
  type UserOperationStruct,
  type BytesLike,
  SmartAccountProvider,
  type AccountMiddlewareFn,
  type UserOperationOverrides,
  EntryPointAbi,
} from "@alchemy/aa-core";
import {
  BUNDLER_URL,
  DEFAULT_SEND_TX_MAX_RETRIES,
  DEFAULT_SEND_TX_RETRY_INTERVAL_MS,
  ENTRYPOINT_ADDRESS,
  minPriorityFeePerBidDefaults,
} from "./constants.js";
import { KernelSmartContractAccount, isKernelAccount } from "./account.js";
import { withZeroDevGasEstimator } from "./middleware/gas-estimator.js";
import { isValidRequest } from "./utils/ERC4337-utils.js";
import { InvalidOperation } from "./errors.js";
import { withZeroDevPaymasterAndData } from "./middleware/paymaster.js";
import { createZeroDevPublicErc4337Client } from "./client/create-client.js";
import type {
  PaymasterAndBundlerProviders,
  PaymasterConfig,
  PaymasterPolicy,
} from "./paymaster/types.js";
import { getChain } from "./utils.js";

export type FeeOptions = {
  maxFeePerGasBufferPercentage?: number;
  maxPriorityFeePerGasBufferPercentage?: number;
};
export type ZeroDevProviderConfig = {
  projectId: string;
  chain: Chain | number;
  entryPointAddress?: Address;
  rpcUrl?: string;
  account?: KernelSmartContractAccount;
  bundlerProvider?: PaymasterAndBundlerProviders;
  opts?: SmartAccountProviderOpts & {
    sendTxMaxRetries?: number;
    sendTxRetryIntervalMs?: number;
    feeOptions?: FeeOptions;
  };
};

export enum Operation {
  Call = 0,
  DelegateCall = 1,
}

type UserOpDataOperationTypes<T> = T extends UserOperationCallData
  ? Operation.Call | Operation.DelegateCall
  : T extends BatchUserOperationCallData
  ? Operation.Call
  : never;

export class ZeroDevProvider extends SmartAccountProvider<HttpTransport> {
  protected projectId: string;
  protected sendTxMaxRetries: number;
  protected sendTxRetryIntervalMs: number;
  readonly bundlerProvider?: PaymasterAndBundlerProviders;
  private _txMaxRetries: number;
  private _txRetryIntervalMs: number;
  private _shouldConsume: boolean = true;
  public feeOptions: Required<FeeOptions>;

  constructor({
    projectId,
    chain,
    entryPointAddress = ENTRYPOINT_ADDRESS,
    rpcUrl = BUNDLER_URL,
    account,
    bundlerProvider,
    opts,
  }: ZeroDevProviderConfig) {
    const _chain = typeof chain === "number" ? getChain(chain) : chain;
    const rpcClient = createZeroDevPublicErc4337Client({
      chain: _chain,
      rpcUrl,
      projectId,
      bundlerProvider,
    });

    super(rpcClient, entryPointAddress, _chain, account, {
      ...opts,
      txMaxRetries: opts?.txMaxRetries ?? 20,
      txRetryIntervalMs: opts?.txRetryIntervalMs ?? 10000,
      minPriorityFeePerBid:
        opts?.minPriorityFeePerBid ??
        minPriorityFeePerBidDefaults.get(_chain.id),
    });

    this.feeOptions = {
      maxFeePerGasBufferPercentage:
        opts?.feeOptions?.maxFeePerGasBufferPercentage ?? 0,
      maxPriorityFeePerGasBufferPercentage:
        opts?.feeOptions?.maxPriorityFeePerGasBufferPercentage ?? 13,
    };
    this._txMaxRetries = opts?.txMaxRetries ?? 20;
    this._txRetryIntervalMs = opts?.txRetryIntervalMs ?? 5000;
    this.bundlerProvider = bundlerProvider;
    this.projectId = projectId;
    this.sendTxMaxRetries =
      opts?.sendTxMaxRetries ?? DEFAULT_SEND_TX_MAX_RETRIES;
    this.sendTxRetryIntervalMs =
      opts?.sendTxRetryIntervalMs ?? DEFAULT_SEND_TX_RETRY_INTERVAL_MS;

    withZeroDevGasEstimator(this);
  }

  getProjectId = (): string => this.projectId;

  shouldConsume = (): boolean => this._shouldConsume;

  sendTransaction = async (
    request: RpcTransactionRequest,
    operation: UserOpDataOperationTypes<UserOperationCallData> = Operation.Call
  ): Promise<Hash> => {
    if (!request.to) {
      throw new Error("transaction is missing to address");
    }

    const overrides: UserOperationOverrides = {};
    if (request.maxFeePerGas) {
      overrides.maxFeePerGas = request.maxFeePerGas;
    }
    if (request.maxPriorityFeePerGas) {
      overrides.maxPriorityFeePerGas = request.maxPriorityFeePerGas;
    }

    const { hash } = await this.sendUserOperation(
      {
        target: request.to,
        data: request.data ?? "0x",
        value: request.value ? fromHex(request.value, "bigint") : 0n,
      },
      overrides,
      operation
    );

    return await this.waitForUserOperationTransaction(hash as Hash);
  };

  buildUserOperation = async <
    T extends UserOperationCallData | BatchUserOperationCallData
  >(
    data: T,
    overrides?: UserOperationOverrides,
    operation: UserOpDataOperationTypes<T> = Operation.Call as UserOpDataOperationTypes<T>
  ): Promise<UserOperationStruct> => {
    this._shouldConsume = false;
    if (!isKernelAccount(this.account)) {
      throw new Error("account not connected!");
    }
    if (!this.account.validator) {
      throw new Error("validator not connected!");
    }

    let callData: BytesLike = "0x";

    if (Array.isArray(data)) {
      if (operation === Operation.Call) {
        callData = await this.account.encodeBatchExecute(data);
      } else {
        throw InvalidOperation;
      }
    } else if (isKernelAccount(this.account)) {
      if (operation === Operation.DelegateCall) {
        callData = await this.account.encodeExecuteDelegate(
          data.target,
          data.value ?? 0n,
          data.data
        );
      } else if (operation === Operation.Call) {
        callData = await this.account.encodeExecute(
          data.target,
          data.value ?? 0n,
          data.data
        );
      } else {
        throw InvalidOperation;
      }
    } else {
      throw InvalidOperation;
    }

    const initCode = await this.account.getInitCode();
    const nonce = await this.account.getNonce();
    const result = await this._runMiddlewareStack(
      {
        initCode,
        sender: this.getAddress(),
        nonce,
        callData,
        signature: await this.account
          .getValidator()
          .getDynamicDummySignature(await this.getAddress(), callData as Hex),
      } as UserOperationStruct,
      overrides
    );
    this._shouldConsume = true;
    return result;
  };

  private _runMiddlewareStack = async (
    uo: UserOperationStruct,
    overrides?: UserOperationOverrides
  ): Promise<UserOperationStruct> => {
    const result = await asyncPipe(
      this.dummyPaymasterDataMiddleware,
      this.feeDataGetter,
      this.paymasterDataMiddleware,
      this.gasEstimator,
      this.customMiddleware ?? noOpMiddleware,
      async (struct) => ({ ...struct, ...overrides })
    )(uo);

    return deepHexlify(await resolveProperties<UserOperationStruct>(result));
  };

  sendUserOperation = async <
    T extends UserOperationCallData | BatchUserOperationCallData
  >(
    data: T,
    overrides?: UserOperationOverrides,
    operation: UserOpDataOperationTypes<T> = Operation.Call as UserOpDataOperationTypes<T>
  ): Promise<SendUserOperationResult> => {
    if (!this._shouldConsume)
      throw new Error(
        "Cannot send user operation while building user operation"
      );
    if (!isKernelAccount(this.account)) {
      throw new Error("account not connected!");
    }
    if (!this.account.validator) {
      throw new Error("validator not connected!");
    }

    let callData: BytesLike = "0x";

    if (Array.isArray(data)) {
      if (operation === Operation.Call) {
        callData = await this.account.encodeBatchExecute(data);
      } else {
        throw InvalidOperation;
      }
    } else if (isKernelAccount(this.account)) {
      if (operation === Operation.DelegateCall) {
        callData = await this.account.encodeExecuteDelegate(
          data.target,
          data.value ?? 0n,
          data.data
        );
      } else if (operation === Operation.Call) {
        callData = await this.account.encodeExecute(
          data.target,
          data.value ?? 0n,
          data.data
        );
      } else {
        throw InvalidOperation;
      }
    } else {
      throw InvalidOperation;
    }

    const initCode = await this.account.getInitCode();
    let hash: string = "";
    let i = 0;
    const nonce = await this.account.getNonce();
    let uoStruct: UserOperationStruct;
    let request: UserOperationStruct;
    let maxFeePerGas, maxPriorityFeePerGas;
    do {
      uoStruct = await asyncPipe(
        this.dummyPaymasterDataMiddleware,
        this.feeDataGetter,
        this.paymasterDataMiddleware,
        this.gasEstimator,
        this.customMiddleware ?? noOpMiddleware,
        async (struct) => ({ ...struct, ...overrides })
      )({
        initCode,
        sender: this.getAddress(),
        nonce,
        callData,
        signature: await this.account
          .getValidator()
          .getDynamicDummySignature(await this.getAddress(), callData as Hex),
        maxFeePerGas,
        maxPriorityFeePerGas,
      } as UserOperationStruct);
      request = deepHexlify(await resolveProperties(uoStruct));

      if (!isValidRequest(request)) {
        // this pretty prints the uo
        throw new Error(
          `Request is missing parameters. All properties on UserOperationStruct must be set. uo: ${JSON.stringify(
            request,
            null,
            2
          )}`
        );
      }

      await this.account.approvePlugin();

      request.signature = await this.account.validator.getSignature(request);
      try {
        hash = await this.rpcClient.sendUserOperation(
          request,
          this.entryPointAddress
        );
      } catch (error: any) {
        if (this.isReplacementOpError(error) && i++ < this.sendTxMaxRetries) {
          maxFeePerGas = (BigInt(request.maxFeePerGas) * 113n) / 100n;
          maxPriorityFeePerGas =
            (BigInt(request.maxPriorityFeePerGas) * 113n) / 100n;

          console.log(
            `After ${
              this.sendTxRetryIntervalMs / 60000
            } minutes, resending tx with Increased Gas fees: maxFeePerGas: ${maxFeePerGas}, maxPriorityFeePerGas: ${maxPriorityFeePerGas}`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, this.sendTxRetryIntervalMs)
          );
          continue;
        }
        throw this.unwrapError(error);
      }
    } while (hash === "");

    return {
      hash,
      request,
    };
  };

  isReplacementOpError(errorIn: any): boolean {
    if (errorIn.cause != null) {
      const failedOpMessage: string | undefined = errorIn?.cause?.message;
      return (
        (failedOpMessage?.includes(
          "replacement op must increase maxFeePerGas and MaxPriorityFeePerGas"
        ) ||
          failedOpMessage?.match(/.*replacement.*underpriced.*/) !== null) ??
        false
      );
    }
    return false;
  }

  unwrapError(errorIn: any): Error {
    if (errorIn?.cause != null) {
      let paymasterInfo: string = "";
      let failedOpMessage: string | undefined = errorIn?.cause?.message;
      if (failedOpMessage?.includes("FailedOp") === true) {
        // TODO: better error extraction methods will be needed
        const matched = failedOpMessage.match(/FailedOp\((.*)\)/);
        if (matched != null) {
          const split = matched[1].split(",");
          paymasterInfo = `(paymaster address: ${split[1]})`;
          failedOpMessage = split[2];
        }
      }
      const error = new Error(
        `The bundler has failed to include UserOperation in a batch: ${failedOpMessage} ${paymasterInfo}`
      );
      error.stack = errorIn.stack;
      return error;
    }
    return errorIn;
  }

  waitForUserOperationTransaction = async (hash: Hash): Promise<Hash> => {
    let blockNumber = await this.rpcClient.getBlockNumber();
    for (let i = 0; i < this._txMaxRetries; i++) {
      if (this.bundlerProvider === "GELATO") {
        const receipt = await this.getUserOperationReceipt(
          hash as `0x${string}`
        )
          // TODO: should maybe log the error?
          .catch(() => null);
        if (receipt) {
          return this.getTransaction(receipt.receipt.transactionHash).then(
            (x) => x.hash
          );
        }
      } else {
        const logs = await this.rpcClient.getLogs({
          address: ENTRYPOINT_ADDRESS,
          event: getAbiItem({ abi: EntryPointAbi, name: "UserOperationEvent" }),
          args: { userOpHash: hash },
          fromBlock: blockNumber - 100n,
        });
        if (logs.length) {
          return logs[0].transactionHash;
        }
      }
      await new Promise((resolve) =>
        setTimeout(resolve, this._txRetryIntervalMs)
      );
    }

    throw new Error("Failed to find transaction for User Operation");
  };

  getAccount: () => KernelSmartContractAccount = () => {
    if (!isKernelAccount(this.account)) {
      throw new Error("account not connected!");
    }
    return this.account;
  };

  dummyPaymasterDataMiddleware: AccountMiddlewareFn = async (
    struct: UserOperationStruct
  ): Promise<UserOperationStruct> => {
    struct.paymasterAndData = "0x";
    return struct;
  };

  withZeroDevPaymasterAndData(config: PaymasterConfig<PaymasterPolicy>) {
    if (!this.isConnected()) {
      throw new Error(
        "ZeroDevProvider: account is not set, did you call `connect` first?"
      );
    }

    return withZeroDevPaymasterAndData(this, config);
  }

  request: (args: { method: string; params?: any[] }) => Promise<any> = async (
    args
  ) => {
    const { method, params } = args;
    switch (method) {
      case "eth_chainId":
        return this.chain.id;
      case "eth_sendTransaction":
        const [tx] = params as [RpcTransactionRequest];
        return this.sendTransaction(tx);
      case "eth_signTypedData_v4":
        //@ts-expect-error
        return this.signTypedData(JSON.parse(params[1]));
      case "personal_sign":
        if (!this.account) {
          throw new Error("account not connected!");
        }
        const [data, address] = params!;
        if (address.toLowerCase() !== (await this.getAddress()).toLowerCase()) {
          throw new Error(
            "cannot sign for address that is not the current account"
          );
        }
        // @ts-ignore
        return this.account.signMessageWith6492(data);
      default:
        // @ts-ignore
        return this.rpcClient.request(args);
    }
  };
}
