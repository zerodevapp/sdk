import {
  type UserOperationStruct,
  deepHexlify,
  resolveProperties,
} from "@alchemy/aa-core";
import { Paymaster } from "./base.js";
import type { ZeroDevProvider } from "../provider.js";
import type { PaymasterAndBundlerProviders, PaymasterConfig } from "./types.js";

export class VerifyingPaymaster extends Paymaster {
  constructor(
    provider: ZeroDevProvider,
    _: PaymasterConfig<"VERIFYING_PAYMASTER">
  ) {
    super(provider);
  }
  async getPaymasterResponse(
    struct: UserOperationStruct,
    paymasterProvider?: PaymasterAndBundlerProviders,
    shouldOverrideFee?: boolean
  ): Promise<UserOperationStruct | undefined> {
    try {
      const hexifiedUserOp = deepHexlify(await resolveProperties(struct));
      const paymasterResp = await this.signUserOp({
        userOp: hexifiedUserOp,
        paymasterProvider,
        shouldOverrideFee,
      });
      if (paymasterResp) {
        return paymasterResp;
      }
    } catch (error) {
      console.log(error);
    }
    return;
  }
}
