import { LocalAccountSigner } from "@alchemy/aa-core";
import { config } from "./kernel-account.test.js";
import type { PrivateKeyAccount } from "viem";
import { SocialRecoveryValidator } from "../validator/social-recovery-validator.js";
import { MockSigner } from "./mocks/mock-signer.js";
import { SocialRecoveryProvider } from "../validator-provider/social-recovery-provider.js";

describe("Recovery Validator Test", async () => {
    const owner = LocalAccountSigner.privateKeyToAccountSigner(config.privateKey);
    const mockOwner = new MockSigner();
    let socialRecoveryProvider = await SocialRecoveryProvider.init({
      projectId: config.projectId,
      owner: mockOwner,
    });


    const validator = await SocialRecoveryValidator.init({
        owner: mockOwner,
        projectId: config.projectId,
    });

    it(
        "getAddress returns valid counterfactual address",
        async () => {    
          expect(await socialRecoveryProvider.getAddress()).eql(
            "0x97925A25C6B8E8902D2c68A4fcd90421a701d2E8"
          )}
    );

    it("should return proper validator address", async () => {
        expect(await validator.getAddress()).toMatchInlineSnapshot(
          `"${'0x113EAAF894AF251Ae61E83Ea78Baced99d81F1dc'}"`
        );
      });
          
});