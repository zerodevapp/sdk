import {
  type PromiseOrValue,
  type BytesLike,
  type UserOperationCallData,
  type UserOperationStruct,
  type BatchUserOperationCallData,
} from "@alchemy/aa-core";
import axios from "axios";
import {
  type Hex,
  toHex,
  decodeFunctionData,
  encodeFunctionData,
  isAddress,
} from "viem";
import { ERC20Abi } from "../abis/ERC20Abi.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import {
  PAYMASTER_URL,
  ENTRYPOINT_ADDRESS,
  ERC20_APPROVAL_AMOUNT,
  MULTISEND_ADDR,
} from "../constants.js";
import {
  AccountNotConnected,
  IncorrectCallDataForTokenPaymaster,
} from "../errors.js";
import type { ZeroDevProvider } from "../provider.js";
import {
  getGasTokenAddress,
  type UserOperationCallDataWithDelegate,
} from "../utils.js";
import { Paymaster } from "./base.js";
import {
  type PaymasterAndBundlerProviders,
  type PaymasterConfig,
} from "./types.js";
import { getChainId } from "../api/index.js";
import { MultiSendAbi } from "../abis/MultiSendAbi.js";

export function isBatchUserOperationCallData(
  data: any
): data is BatchUserOperationCallData {
  return data && Array.isArray(data);
}
export class TokenPaymaster extends Paymaster {
  constructor(
    provider: ZeroDevProvider,
    protected paymasterConfig: PaymasterConfig<"TOKEN_PAYMASTER">
  ) {
    super(provider);
  }
  async getPaymasterAddress(
    paymasterProvider?: PaymasterAndBundlerProviders
  ): Promise<Hex | undefined> {
    const chainId = await getChainId(this.provider.getProjectId());

    try {
      const { data: paymasterResp } = await axios.post(
        `${PAYMASTER_URL}/getPaymasterAddress`,
        {
          chainId,
          entryPointAddress: ENTRYPOINT_ADDRESS,
          paymasterProvider,
        },
        { headers: { "Content-Type": "application/json" } }
      );
      return paymasterResp as Hex;
    } catch (e) {
      console.log(e);
      return undefined;
    }
  }
  async decodeMainCallFromCallData(
    kernelAddress: PromiseOrValue<string>,
    callData: PromiseOrValue<BytesLike>
  ): Promise<
    | UserOperationCallData
    | BatchUserOperationCallData
    | UserOperationCallDataWithDelegate
    | undefined
  > {
    let data: Hex = "0x";
    if (callData instanceof Promise) {
      const _data = await callData;
      if (_data instanceof Uint8Array) {
        data = toHex(_data);
      } else {
        data = _data as Hex;
      }
    } else if (callData instanceof Uint8Array) {
      data = toHex(callData);
    } else {
      data = callData as Hex;
    }

    try {
      const { functionName, args } = decodeFunctionData({
        abi: KernelAccountAbi,
        data: data,
      });
      if (functionName === "execute") {
        const [target, value, data] = args;
        let msFuntionName;
        try {
          ({ functionName: msFuntionName } = decodeFunctionData({
            abi: MultiSendAbi,
            data,
          }));
        } catch (error) {}
        let mainCall:
          | UserOperationCallData
          | UserOperationCallDataWithDelegate = {
          target,
          value: value ?? 0n,
          data,
        };
        if (msFuntionName === "multiSend") {
          mainCall = {
            ...mainCall,
            target: MULTISEND_ADDR,
            delegateCall: true,
            data,
          };
        }
        return mainCall;
      } else if (functionName === "executeBatch") {
        const [txs] = args;
        return txs.map((tx) => ({
          target: tx.to,
          value: tx.value ?? 0n,
          data: tx.data,
        }));
      }
    } catch (error) {
      return {
        target: (kernelAddress instanceof Promise
          ? await kernelAddress
          : kernelAddress) as Hex,
        data,
        value: 0n,
        delegateCall: true,
      };
    }
    return;
  }

  async getERC20UserOp<
    T extends UserOperationCallData | BatchUserOperationCallData
  >(
    struct: UserOperationStruct,
    mainCall: T,
    gasTokenAddress: Hex,
    paymasterAddress: Hex
  ): Promise<UserOperationStruct | undefined> {
    try {
      const approveData: UserOperationCallData = {
        target: gasTokenAddress,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: ERC20Abi,
          functionName: "approve",
          args: [paymasterAddress, ERC20_APPROVAL_AMOUNT[gasTokenAddress]],
        }),
      };
      if (!this.provider.account) {
        throw AccountNotConnected;
      }

      let calls: BatchUserOperationCallData;

      if (isBatchUserOperationCallData(mainCall)) {
        calls = [approveData, ...mainCall];
      } else {
        calls = [approveData, mainCall];
      }
      const erc20CallData = await this.provider.account.encodeBatchExecute(
        calls
      );
      return {
        ...struct,
        callData: erc20CallData,
        callGasLimit: await this.provider.rpcClient.estimateGas({
          account: ENTRYPOINT_ADDRESS,
          to: await this.provider.getAddress(),
          data: erc20CallData,
        }),
        signature: await this.provider
          .getAccount()
          .getValidator()
          .getDynamicDummySignature(
            (await struct.sender) as Hex,
            erc20CallData
          ),
      };
    } catch (error) {
      return;
    }
  }

  async getPaymasterResponse(
    struct: UserOperationStruct,
    paymasterProvider?: PaymasterAndBundlerProviders,
    shouldOverrideFee?: boolean
  ): Promise<UserOperationStruct | undefined> {
    const mainCall = await this.decodeMainCallFromCallData(
      struct.sender,
      struct.callData
    );
    if (!mainCall) {
      throw IncorrectCallDataForTokenPaymaster;
    }
    const chainId = await getChainId(this.provider.getProjectId());
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const gasTokenAddress = getGasTokenAddress(
      this.paymasterConfig.gasToken,
      chainId
    );
    let paymasterAddress = await this.getPaymasterAddress(paymasterProvider);
    if (
      gasTokenAddress !== undefined &&
      paymasterAddress !== undefined &&
      isAddress(paymasterAddress)
    ) {
      const erc20UserOp = await this.getERC20UserOp(
        struct,
        mainCall,
        gasTokenAddress,
        paymasterAddress
      );
      if (!erc20UserOp) {
        return;
      }
      const paymasterResp = await this.signUserOp({
        userOp: struct,
        callData: struct.callData,
        gasTokenAddress,
        erc20UserOp,
        erc20CallData: erc20UserOp.callData,
        paymasterProvider,
        shouldOverrideFee,
      });
      return paymasterResp;
    }
    return;
  }
}
