import { type UserOperationStruct, deepHexlify, resolveProperties } from "@alchemy/aa-core";
import { Paymaster,  } from "./base.js";
import type { ZeroDevProvider } from "../provider.js";
import type { PaymasterConfig } from "./types.js";

export class VerifyingPaymaster extends Paymaster {
    constructor(provider:ZeroDevProvider, _: PaymasterConfig<"VERIFYING_PAYMASTER">) {super(provider);}
    async getPaymasterResponse(struct: UserOperationStruct): Promise<UserOperationStruct> {
        try {
            const hexifiedUserOp = deepHexlify(await resolveProperties(struct));
            const paymasterResp = await this.signUserOp(hexifiedUserOp);
            if (paymasterResp) {
                return {
                    ...struct,
                    ...paymasterResp
                }
            }

        } catch (error) {
            return struct;
        }
        return struct;
    }
}
