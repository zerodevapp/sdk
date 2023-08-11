import { LocalAccountSigner } from "@alchemy/aa-core";
import { config } from "./kernel-account.test.js";
import { encodeFunctionData, type Hash, type PrivateKeyAccount } from "viem";
import { SocialRecoveryValidator } from "../validator/social-recovery-validator.js";
import { MockSigner } from "./mocks/mock-signer.js";
import { SocialRecoveryProvider } from "../validator-provider/social-recovery-provider.js";
import { SocialRecoveryValidatorAbi } from "../abis/SocialRecoveryValidatorAbi.js";

describe("Recovery Validator Test", async () => {
  const owner = LocalAccountSigner.privateKeyToAccountSigner(config.privateKey);
  const mockOwner = new MockSigner();

  const validator = await SocialRecoveryValidator.init({
    owner: mockOwner,
    projectId: config.projectId,
    validatorAddress: "0x862F3A0ab84f4e70cC338B876cC0cbacb2706Ac3",
  });

  it("should return proper validator address", async () => {
    expect(await validator.getAddress()).toMatchInlineSnapshot(
      `"${"0x862F3A0ab84f4e70cC338B876cC0cbacb2706Ac3"}"`
    );
  });

  it("should return correct owner address", async () => {
    expect(await validator.getOwner()).eql(await mockOwner.getAddress());
  });

  it("should sign hash properly", async () => {
    expect(
      await validator.signMessage("0xabcfC3DB1e0f5023F5a4f40c03D149f316E6A5cc")
    ).eql(
      "0x4d61c5c27fb64b207cbf3bcf60d78e725659cff5f93db9a1316162117dff72aa631761619d93d4d97dfb761ba00b61f9274c6a4a76e494df644d968dd84ddcdb1c"
    );
  });

  it("should sign hash properly without 0x", async () => {
    expect(await validator.signMessage("icanbreakthistestcase")).eql(
      "0x4d61c5c27fb64b207cbf3bcf60d78e725659cff5f93db9a1316162117dff72aa631761619d93d4d97dfb761ba00b61f9274c6a4a76e494df644d968dd84ddcdb1c"
    );
  });

  it(
    "should correctly make an api call to set guardians",
    async () => {
      const data = {
        guardians: {
          "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4": 100,
          "0x28a292f4dC182492F7E23CFda4354bff688f6ea8": 100,
        },
        threshold: 50,
        owneraddress: "0x7c8999dc9a822c1f0df42023113edb4fdd543266",
      };

      let socialRecoveryProvider = await SocialRecoveryProvider.init({
        projectId: config.projectId,
        owner,
        usePaymaster: false,
        opts: {
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });

      const response = await validator.setGuardian(
        data,
        socialRecoveryProvider
      );
      expect(response).toBeDefined();
    },
    { timeout: 100000 }
  );

  it.skip(
    "sendUserOperation should execute properly",
    async () => {
      let socialRecoveryProvider = await SocialRecoveryProvider.init({
        projectId: config.projectId,
        owner,
        usePaymaster: false,
        opts: {
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });

      await socialRecoveryProvider.getAccount().getInitCode();

      const result = socialRecoveryProvider.sendUserOperation({
        target: "0x28a292f4dC182492F7E23CFda4354bff688f6ea8",
        data: "0x",
        value: 0n,
      });
      await expect(result).resolves.not.toThrowError();
      await socialRecoveryProvider.waitForUserOperationTransaction(
        (
          await result
        ).hash as Hash
      );
    },
    { timeout: 100000 }
  );
});
