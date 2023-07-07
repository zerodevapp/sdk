import {
  type PromiseOrValue,
  type BytesLike,
  type UserOperationCallData,
  type UserOperationStruct,
} from "@alchemy/aa-core";
import axios from "axios";
import { type Hex, toHex, decodeFunctionData, encodeFunctionData } from "viem";
import { ERC20Abi } from "../abis/ERC20Abi.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import { MultiSendAbi } from "../abis/MultiSendAbi.js";
import {
  PAYMASTER_URL,
  ENTRYPOINT_ADDRESS,
  MULTISEND_ADDR,
  ERC20_APPROVAL_AMOUNT,
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
import { type PaymasterConfig } from "./types.js";
import { getChainId } from "../api/index.js";

export class TokenPaymaster extends Paymaster {
  constructor(
    provider: ZeroDevProvider,
    protected paymasterConfig: PaymasterConfig<"TOKEN_PAYMASTER">
  ) {
    super(provider);
  }
  async getPaymasterAddress(): Promise<Hex | undefined> {
    const chainId = await getChainId(this.provider.getProjectId());

    try {
      const { data: paymasterResp } = await axios.post(
        `${PAYMASTER_URL}/getPaymasterAddress`,
        {
          chainId,
          entryPointAddress: ENTRYPOINT_ADDRESS,
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
    callData: PromiseOrValue<BytesLike>
  ): Promise<UserOperationCallDataWithDelegate | undefined> {
    try {
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
      }
    } catch (error) {}
    return;
  }

  async getERC20UserOp(
    struct: UserOperationStruct,
    mainCall: UserOperationCallDataWithDelegate,
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
      const erc20CallData = await this.provider.account.encodeBatchExecute([
        approveData,
        mainCall,
      ]);
      return {
        ...struct,
        callData: erc20CallData,
        callGasLimit: await this.provider.rpcClient.estimateGas({
          account: ENTRYPOINT_ADDRESS,
          to: await this.provider.getAddress(),
          data: erc20CallData,
        }),
      };
    } catch (error) {
      return;
    }
  }

  async getPaymasterResponse(
    struct: UserOperationStruct
  ): Promise<UserOperationStruct> {
    try {
      const mainCall = await this.decodeMainCallFromCallData(struct.callData);
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
      let paymasterAddress = await this.getPaymasterAddress();
      if (gasTokenAddress !== undefined && paymasterAddress !== undefined) {
        const erc20UserOp = await this.getERC20UserOp(
          struct,
          mainCall,
          gasTokenAddress,
          paymasterAddress
        );
        if (!erc20UserOp) {
          return struct;
        }
        const paymasterResp = await this.signUserOp(
          struct,
          struct.callData,
          gasTokenAddress,
          erc20UserOp,
          erc20UserOp.callData
        );
        if (paymasterResp) {
          return {
            ...struct,
            ...paymasterResp,
          };
        }
      }
    } catch (error) {
      return struct;
    }
    return struct;
  }
}
