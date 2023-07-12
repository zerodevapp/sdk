import {
  type Address,
  type Chain,
  type HttpTransport,
  type RpcTransactionRequest,
} from "viem";
import {
  deepHexlify,
  resolveProperties,
  type SmartAccountProviderOpts,
  getChain,
  type UserOperationCallData,
  type BatchUserOperationCallData,
  type SendUserOperationResult,
  asyncPipe,
  noOpMiddleware,
  type UserOperationStruct,
  type BytesLike,
  SmartAccountProvider,
  type AccountMiddlewareFn,
} from "@alchemy/aa-core";
import { BUNDLER_URL, ENTRYPOINT_ADDRESS } from "./constants.js";
import { KernelSmartContractAccount, isKernelAccount } from "./account.js";
import { withZeroDevGasEstimator } from "./middleware/gas-estimator.js";
import { isValidRequest } from "./utils/ERC4337-utils.js";
import { InvalidOperation } from "./errors.js";
import { withZeroDevPaymasterAndData } from "./middleware/paymaster.js";
import { createZeroDevPublicErc4337Client } from "./client/create-client.js";
import type { PaymasterConfig, PaymasterPolicy } from "./paymaster/types.js";

export type ZeroDevProviderConfig = {
  projectId: string;
  chain: Chain | number;
  entryPointAddress?: Address;
  rpcUrl?: string;
  account?: KernelSmartContractAccount;
  opts?: SmartAccountProviderOpts;
};

export enum Operation {
  Call,
  DelegateCall,
}

type UserOpDataOperationTypes<T> = T extends UserOperationCallData
  ? Operation.Call | Operation.DelegateCall
  : T extends BatchUserOperationCallData
  ? Operation.Call
  : never;

export class ZeroDevProvider extends SmartAccountProvider<HttpTransport> {
  protected projectId: string;

  constructor({
    projectId,
    chain,
    entryPointAddress = ENTRYPOINT_ADDRESS,
    rpcUrl = BUNDLER_URL,
    account,
    opts,
  }: ZeroDevProviderConfig) {
    const _chain = typeof chain === "number" ? getChain(chain) : chain;
    const rpcClient = createZeroDevPublicErc4337Client({
      chain: _chain,
      rpcUrl,
      projectId,
    });

    super(rpcClient, entryPointAddress, _chain, account, opts);

    this.projectId = projectId;

    withZeroDevGasEstimator(this);
  }

  getProjectId = (): string => this.projectId;

  sendUserOperation = async <
    T extends UserOperationCallData | BatchUserOperationCallData
  >(
    data: T,
    operation: UserOpDataOperationTypes<T> = Operation.Call as UserOpDataOperationTypes<T>
  ): Promise<SendUserOperationResult> => {
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
    } else if (this.account instanceof KernelSmartContractAccount) {
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
    const uoStruct = await asyncPipe(
      this.dummyPaymasterDataMiddleware,
      this.feeDataGetter,
      this.paymasterDataMiddleware,
      this.gasEstimator,
      this.customMiddleware ?? noOpMiddleware
    )({
      initCode,
      sender: this.getAddress(),
      nonce: this.account.getNonce(),
      callData,
      signature: this.account.getDummySignature(),
    } as UserOperationStruct);

    const request = deepHexlify(await resolveProperties(uoStruct));
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

    request.signature = await this.account.validator.getSignature(request);

    return {
      hash: await this.rpcClient.sendUserOperation(
        request,
        this.entryPointAddress
      ),
      request,
    };
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
    struct.paymasterAndData =
      "0xfe7dbcab8aaee4eb67943c1e6be95b1d065985c6000000000000000000000000000000000000000000000000000001869aa31cf400000000000000000000000000000000000000000000000000000000000000007dfe2190f34af27b265bae608717cdc9368b471fc0c097ab7b4088f255b4961e57b039e7e571b15221081c5dce7bcb93459b27a3ab65d2f8a889f4a40b4022801b";
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
      case "personal_sign":
        if (!this.account) {
          throw new Error("account not connected!");
        }
        const [data, address] = params!;
        if (address !== (await this.getAddress())) {
          throw new Error(
            "cannot sign for address that is not the current account"
          );
        }
        // @ts-ignore
        return this.account.signWithEip6492(data);
      default:
        // @ts-ignore
        return this.rpcClient.request(args);
    }
  };
}
