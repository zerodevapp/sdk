import type { BytesLike, UserOperationStruct } from "@alchemy/aa-core"
import axios from "axios";
import type { PaymasterCommonConfig, PaymasterConfig, PaymasterPolicy } from "../middleware/types"
import { ENTRYPOINT_ADDRESS, PAYMASTER_URL } from "../constants";

export abstract class AbstractPaymasterDataMiddleware<T extends PaymasterPolicy> {
    constructor(public paymasterConfig: PaymasterConfig<T>, public commonCfg: PaymasterCommonConfig) { }
    abstract getPaymasterResponse(struct: UserOperationStruct): Promise<UserOperationStruct>;
    public async signUserOp(
        userOp: UserOperationStruct,
        callData?: BytesLike,
        gasTokenAddress?: string,
        erc20UserOp?: string,
        erc20CallData?: BytesLike
    ): Promise<UserOperationStruct | undefined> {
        try {
            let requestBodyParams = {
                projectId: this.commonCfg.projectId,
                chainId: this.commonCfg.chainId,
                userOp,
                entryPointAddress: ENTRYPOINT_ADDRESS,
                callData,
                tokenAddress: gasTokenAddress,
                erc20UserOp,
                erc20CallData
            };
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