import { deepHexlify, resolveProperties, type UserOperationStruct } from "@alchemy/aa-core";
import { ENTRYPOINT_ADDRESS, PAYMASTER_URL } from "../constants";
import { getGasTokenAddress, type PaymasterCommonConfig, type PaymasterConfig } from "../middleware/types";
import { AbstractPaymasterDataMiddleware } from "./base";
import axios from "axios";
import { ErrTransactionFailedGasChecks } from "../errors";

export class TokenPaymasterDataMiddleware extends AbstractPaymasterDataMiddleware<'TOKEN_PAYMASTER'>{

    constructor(public paymasterConfig: PaymasterConfig<'TOKEN_PAYMASTER'>, public commonCfg: PaymasterCommonConfig) {
        super(paymasterConfig, commonCfg)
    }
    async getPaymasterAddress(): Promise<string | undefined> {
        try {
            const { data: paymasterResp } = await axios.post(`${PAYMASTER_URL}/getPaymasterAddress`, {
                body: JSON.stringify({
                    chainId: this.commonCfg.chainId,
                    entryPointAddress: ENTRYPOINT_ADDRESS
                }),
            }, { headers: { 'Content-Type': 'application/json' } })
            return paymasterResp
        } catch (e) {
            console.log(e)
            return undefined
        }
    }

    async getPaymasterResponse(struct: UserOperationStruct): Promise<UserOperationStruct> {
        const gasTokenAddress = getGasTokenAddress(this.paymasterConfig.gasToken, this.commonCfg.chainId);
        if (gasTokenAddress !== undefined) {
            const hexifiedUserOp = deepHexlify(await resolveProperties(struct));

            const paymasterResp = await this.signUserOp(
                hexifiedUserOp,
                gasTokenAddress
            );

            if (paymasterResp) {
                return {
                    ...struct,
                    ...paymasterResp,
                    signature: ""
                };
            }
            console.log(ErrTransactionFailedGasChecks);
        }
        return {
            ...struct,
            signature: ""
        };
    }
}