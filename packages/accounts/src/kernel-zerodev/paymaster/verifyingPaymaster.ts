import { deepHexlify, resolveProperties, type UserOperationStruct } from "@alchemy/aa-core";
import { ErrTransactionFailedGasChecks } from "../errors";
import type { IPaymasterDataMiddleware, PaymasterCommonConfig, PaymasterConfig } from "../middleware/types";
import { AbstractPaymasterDataMiddleware } from "./base";

export class VerifyingPaymasterDataMiddleware extends AbstractPaymasterDataMiddleware<'VERIFYING_PAYMASTER'> implements IPaymasterDataMiddleware {
    constructor(public paymasterConfig: PaymasterConfig<'VERIFYING_PAYMASTER'>, public commonCfg: PaymasterCommonConfig) {
        super(paymasterConfig, commonCfg)
    }

    async getPaymasterResponse(struct: UserOperationStruct): Promise<UserOperationStruct> {
        const partialStruct = {
            ...struct,
            signature: "0x4046ab7d9c387d7a5ef5ca0777eded29767fd9863048946d35b3042d2f7458ff7c62ade2903503e15973a63a296313eab15b964a18d79f4b06c8c01c7028143c1c"
        }
        const hexifiedUserOp = deepHexlify(await resolveProperties(partialStruct));

        const paymasterResp = await this.signUserOp(
            hexifiedUserOp,
        )

        if (paymasterResp) {
            return {
                ...partialStruct,
                ...paymasterResp,
                signature: ""
            };
        }

        if (paymasterResp === undefined) {
            console.log(ErrTransactionFailedGasChecks)
        }

        return {
            ...partialStruct,
            signature: ""
        };

    }
}