import { type Address, type Chain, encodeFunctionData } from "viem";
import {
  deepHexlify, resolveProperties,
  type SmartAccountProviderOpts,
  BaseSmartContractAccount,
  getChain,
  type UserOperationCallData,
  type BatchUserOperationCallData,
  type SendUserOperationResult,
  asyncPipe,
  noOpMiddleware,
  type UserOperationStruct,
  getUserOperationHash,
  type BytesLike
} from "@alchemy/aa-core";
import { BUNDLER_URL, ERC20_APPROVAL_AMOUNT } from "./constants";
import { getGasTokenAddress, type PaymasterConfig, type PaymasterPolicy } from "./middleware/types";
import { withZeroDevPaymasterAndData } from "./middleware/paymaster";
import type { KernelSmartContractAccount } from "./account";
import type { TokenPaymasterDataMiddleware } from "./paymaster/token-paymaster";
import { withZeroDevGasEstimator } from "./middleware/gas-estimator";
import { BaseZeroDevProvider } from "./provider/base-provider";
import { isValidRequest } from "./utils/ERC4337-utils";
import { ERC20Abi } from "./abis/ERC20Abi";
import { defaultPaymasterConfig } from "./paymaster/types";


export type ZeroDevProviderConfig = {
  projectId: string;
  chain: Chain | number;
  entryPointAddress: Address;
  paymasterConfig?: PaymasterConfig<PaymasterPolicy>;
  rpcUrl?: string;
  account?: BaseSmartContractAccount;
  opts?: SmartAccountProviderOpts;
};

export class ZeroDevProvider extends BaseZeroDevProvider {

  constructor({
    projectId,
    chain,
    entryPointAddress,
    paymasterConfig,
    rpcUrl = BUNDLER_URL,
    account,
    opts,
  }: ZeroDevProviderConfig) {
    const _chain = typeof chain === "number" ? getChain(chain) : chain;

    super(projectId, _chain, entryPointAddress, rpcUrl, paymasterConfig, account, opts);

    withZeroDevPaymasterAndData(this, paymasterConfig ?? defaultPaymasterConfig, { chainId: _chain.id, projectId });
    withZeroDevGasEstimator(this);

  }

  sendUserOperation = async (
    data: UserOperationCallData | BatchUserOperationCallData,
    delegateCall: boolean = false
  ): Promise<SendUserOperationResult> => {
    if (!this.account) {
      throw new Error("account not connected!");
    }

    let callData: BytesLike = await this.getEncodedCallData(data, delegateCall);

    const initCode = await this.account.getInitCode();
    const uoStruct = await asyncPipe(
      this.dummyPaymasterDataMiddleware,
      this.feeDataGetter,
      this.gasEstimator,
      this.paymasterDataMiddleware,
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

    request.signature = (await this.account.signMessage(
      getUserOperationHash(
        request,
        this.entryPointAddress as `0x${string}`,
        BigInt(this.chain.id)
      )
    )) as `0x${string}`;

    // [TODO] - Better error handling
    return {
      hash: await this.rpcClient.sendUserOperation(
        request,
        this.entryPointAddress
      ),
      request,
    };
  };

  getEncodedCallData = async (
    data: UserOperationCallData | BatchUserOperationCallData,
    delegateCall: boolean = false
  ): Promise<BytesLike> => {

    let callData: BytesLike = "0x";
    if (!this.account) {
      throw new Error("account not connected!");
    }

    if (this.paymasterConfig.policy === "TOKEN_PAYMASTER") {
      const gasTokenAddress = getGasTokenAddress((this.paymasterConfig as PaymasterConfig<"TOKEN_PAYMASTER">).gasToken, this.paymaster.commonCfg.chainId);
      const paymasterAddress = await (this.paymaster as TokenPaymasterDataMiddleware).getPaymasterAddress();
      if (gasTokenAddress !== undefined && paymasterAddress !== undefined) {
        const approveData: UserOperationCallData = {
          target: gasTokenAddress,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: ERC20Abi,
            functionName: "approve",
            args: [paymasterAddress, ERC20_APPROVAL_AMOUNT[gasTokenAddress]],
          })
        }
        if (Array.isArray(data)) {
          callData = await this.account.encodeBatchExecute([approveData, ...data]);
        } else {
          callData = await this.account.encodeBatchExecute([approveData, data]);
        }
      }

    } else if (Array.isArray(data)) {
      callData = await this.account.encodeBatchExecute(data);
    } else if (delegateCall) {
      callData = await (this.account as KernelSmartContractAccount).encodeExecuteDelegate(data.target, data.value ?? 0n, data.data);
    } else {
      callData = await this.account.encodeExecute(data.target, data.value ?? 0n, data.data);
    }
    return callData;
  }

  request: (args: { method: string; params?: any[] }) => Promise<any> = async (
    args
  ) => {
    const { method, params } = args;
    if (method === "personal_sign") {
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
    } else {
      return super.request(args)
    }
  };

}
