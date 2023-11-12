import { ECDSAValidator } from "../validator/ecdsa-validator.js";
import { LocalAccountSigner } from "@alchemy/aa-core";
import { config } from "./config/index.js";
import type { PrivateKeyAccount } from "viem";
import { ECDSA_VALIDATOR_ADDRESS } from "../constants.js";

describe("Base Validator Test", async () => {
  const dummyPrivateKey =
    "0x022430a80f723d8789f0d4fb346bdd013b546e4b96fcacf8aceca2b1a65a19dc";
  const dummyAddress = "0xabcfC3DB1e0f5023F5a4f40c03D149f316E6A5cc";
  const signer: LocalAccountSigner<PrivateKeyAccount> =
    LocalAccountSigner.privateKeyToAccountSigner(dummyPrivateKey);

  const validator = await ECDSAValidator.init({
    owner: signer,
    projectId: config.projectId,
  });

  it("should return proper validator address", async () => {
    expect(await validator.getAddress()).toMatchInlineSnapshot(
      `"${ECDSA_VALIDATOR_ADDRESS}"`
    );
  });

  it("should return proper owner address", async () => {
    expect(await validator.getOwner()).eql(dummyAddress);
  });

  it("should sign hash properly", async () => {
    expect(
      await validator.signMessage("0xabcfC3DB1e0f5023F5a4f40c03D149f316E6A5cc")
    ).eql(
      "0x91b6680c8f442f46ca71fee15cdd8c9e25693baeb4006d1908a453fd145315ce21a5e7f2ce9760fc993d65e8450fa5225d8dee12972886bdacbb989ca0b09c6c1b"
    );
  });

  it("should sign hash properly without 0x", async () => {
    expect(await validator.signMessage("icanbreakthistestcase")).eql(
      "0xabd26de022c2785a7d86c5c388f4adef5d93358b39fbb757463bc9edc78b7b86566cb1ab8c7ff3a52b10d98de6398aacc7b48aec92a3e280065a47b9698209541b"
    );
  });

  it("should return proper validation signature", async () => {
    expect(
      await validator.signMessage(
        "0xbc7299170f076afcbafe11da04482e72e3beccabcd82de0cd2797500e81b76c4"
      )
    ).eql(
      "0xadf6b82bdb755049fce2a0d479dcb98b219c9ebf26865dc0789376b082569abf5ac0c950ae1a3b8a75e1930f6b594d0ef70a8007427089afa04f83a73da7abbc1b"
    );
  });
});
