import { deepHexlify, type BytesLike, type PromiseOrValue, type UserOperationStruct, resolveProperties } from "@alchemy/aa-core";
import axios from "axios";
import { ENTRYPOINT_ADDRESS, PAYMASTER_URL } from "../constants";
import type { ZeroDevProvider } from "../provider";
import { hexifyUserOp } from "../utils/ERC4337-utils";


export abstract class Paymaster {
    constructor(protected provider: ZeroDevProvider) { }
    abstract getPaymasterResponse(struct: UserOperationStruct): Promise<UserOperationStruct>;
    protected async signUserOp(
        userOp: UserOperationStruct,
        callData?: PromiseOrValue<BytesLike>,
        gasTokenAddress?: string,
        erc20UserOp?: Partial<UserOperationStruct>,
        erc20CallData?: PromiseOrValue<BytesLike>
    ): Promise<any> {
        try {
            const hexifiedUserOp = deepHexlify(await resolveProperties(userOp));
            let resolvedERC20UserOp;
            let hexifiedERC20UserOp: any;
            if (erc20UserOp) {

                resolvedERC20UserOp = await resolveProperties(erc20UserOp)

                hexifiedERC20UserOp = hexifyUserOp(resolvedERC20UserOp)

            }
            let requestBodyParams = Object.fromEntries(Object.entries({
                projectId: this.provider.getProjectId(),
                chainId: this.provider.getChain().id,
                userOp: hexifiedUserOp,
                entryPointAddress: ENTRYPOINT_ADDRESS,
                callData: callData instanceof Promise ? await callData : callData,
                tokenAddress: gasTokenAddress,
                erc20UserOp: hexifiedERC20UserOp,
                erc20CallData: erc20CallData instanceof Promise ? await erc20CallData : erc20CallData
            }).filter(([_, value]) => value !== undefined));
            const { data: paymasterResp } = await axios.post(`${PAYMASTER_URL}/sign`, {
                ...requestBodyParams
            }, { headers: { 'Content-Type': 'application/json' } })
            return paymasterResp
        } catch (error) {
            console.log(error)
            return undefined
        }
    }
}