import {
  deepHexlify,
  type BytesLike,
  type PromiseOrValue,
  type UserOperationStruct,
  resolveProperties,
} from "@alchemy/aa-core";
import axios from "axios";
import { ENTRYPOINT_ADDRESS, PAYMASTER_URL } from "../constants.js";
import type { ZeroDevProvider } from "../provider.js";
import { hexifyUserOp } from "../utils/ERC4337-utils.js";
import type { PaymasterAndBundlerProviders } from "./types.js";
import { getChainId } from "../api/index.js";

export abstract class Paymaster {
  constructor(protected provider: ZeroDevProvider) {}
  abstract getPaymasterResponse(
    struct: UserOperationStruct,
    paymasterProvider?: PaymasterAndBundlerProviders,
    shouldOverrideFee?: boolean,
    shouldConsume?: boolean
  ): Promise<UserOperationStruct | undefined>;
  protected async signUserOp({
    userOp,
    callData,
    gasTokenAddress,
    erc20UserOp,
    erc20CallData,
    paymasterProvider,
    shouldOverrideFee = false,
    shouldConsume = true,
  }: {
    userOp: UserOperationStruct;
    callData?: PromiseOrValue<BytesLike>;
    gasTokenAddress?: string;
    erc20UserOp?: Partial<UserOperationStruct>;
    erc20CallData?: PromiseOrValue<BytesLike>;
    paymasterProvider?: PaymasterAndBundlerProviders;
    shouldOverrideFee?: boolean;
    shouldConsume?: boolean;
  }): Promise<any> {
    const hexifiedUserOp = deepHexlify(await resolveProperties(userOp));
    let resolvedERC20UserOp;
    let hexifiedERC20UserOp: any;
    if (erc20UserOp) {
      resolvedERC20UserOp = await resolveProperties(erc20UserOp);

      hexifiedERC20UserOp = hexifyUserOp(resolvedERC20UserOp);
    }
    const chainId = await getChainId(this.provider.getProjectId());
    if (!chainId) throw new Error("ChainId not found");
    let requestBodyParams = Object.fromEntries(
      Object.entries({
        projectId: this.provider.getProjectId(),
        chainId,
        userOp: hexifiedUserOp,
        entryPointAddress: ENTRYPOINT_ADDRESS,
        callData: callData instanceof Promise ? await callData : callData,
        gasTokenData:
          gasTokenAddress && hexifiedERC20UserOp && erc20CallData
            ? {
                tokenAddress: gasTokenAddress,
                erc20UserOp: hexifiedERC20UserOp,
                erc20CallData:
                  erc20CallData instanceof Promise
                    ? await erc20CallData
                    : erc20CallData,
              }
            : undefined,
        tokenAddress: gasTokenAddress,
        erc20UserOp: hexifiedERC20UserOp,
        erc20CallData:
          erc20CallData instanceof Promise
            ? await erc20CallData
            : erc20CallData,
        paymasterProvider,
        shouldOverrideFee,
        shouldConsume,
      }).filter(([_, value]) => value !== undefined)
    );
    const { data: paymasterResp } = await axios.post(
      `${PAYMASTER_URL}/getPaymasterAndData`,
      {
        ...requestBodyParams,
      },
      { headers: { "Content-Type": "application/json" } }
    );
    return paymasterResp;
  }
}
