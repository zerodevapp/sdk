import { type UserOperationStruct, deepHexlify, resolveProperties } from "@alchemy/aa-core";
import { Paymaster,  } from "./base";
import type { ZeroDevProvider } from "../provider";
import type { PaymasterConfig } from "./types";

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
