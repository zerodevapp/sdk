import { deepHexlify, resolveProperties, type UserOperationStruct } from "@alchemy/aa-core";
import { ErrTransactionFailedGasChecks } from "../errors";
import type { IPaymasterDataMiddleware, PaymasterCommonConfig, PaymasterConfig } from "../middleware/types";
import { AbstractPaymasterDataMiddleware } from "./base";

export class VerifyingPaymasterDataMiddleware extends AbstractPaymasterDataMiddleware<'VERIFYING_PAYMASTER'> implements IPaymasterDataMiddleware {
    constructor(public paymasterConfig: PaymasterConfig<'VERIFYING_PAYMASTER'>, public commonCfg: PaymasterCommonConfig) {
        super(paymasterConfig, commonCfg)
    }

    async getPaymasterResponse(struct: UserOperationStruct): Promise<UserOperationStruct> {
        const hexifiedUserOp = deepHexlify(await resolveProperties(struct));

        const paymasterResp = await this.signUserOp(
            hexifiedUserOp,
        )

        if (paymasterResp) {
            return {
                ...struct,
                ...paymasterResp,
                signature: ""
            };
        }

        if (paymasterResp === undefined) {
            console.log(ErrTransactionFailedGasChecks)
        }

        return {
            ...struct,
            signature: ""
        };

    }
}