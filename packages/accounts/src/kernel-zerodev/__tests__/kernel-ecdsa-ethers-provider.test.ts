import { Wallet } from "@ethersproject/wallet";
import { ZeroDevEthersProvider } from "../ethers-provider/ethers-provider.js";
import { config } from "./kernel-account.test.js";
import { convertEthersSignerToAccountSigner } from "../utils.js";

const OWNER_MNEMONIC =
  "resource stem valve plug twice palace march notice olive skin stuff midnight";

describe("Kernel ECDSA ethers provider tests", async () => {
  const owner = Wallet.fromMnemonic(OWNER_MNEMONIC);
  const provider = await ZeroDevEthersProvider.init("ECDSA", {
    projectId: config.projectIdWithGasSponsorship,
    owner: convertEthersSignerToAccountSigner(owner),
    opts: {
      paymasterConfig: {
        policy: "VERIFYING_PAYMASTER",
      },
    },
  });

  const signer = provider.getAccountSigner();

  const accountAddress = "0x3E9CeB33014279583E3Ebf503b004D8EB1D4AEd1";
  it(
    "should succesfully get counterfactual address",
    async () => {
      expect(await signer.getAddress()).toMatchInlineSnapshot(
        `"${accountAddress}"`
      );
    },
    { timeout: 100000 }
  );

  it(
    "should execute successfully",
    async () => {
      const result = signer.sendUserOperation({
        target: "0xA02CDdFa44B8C01b4257F54ac1c43F75801E8175",
        data: "0x",
      });

      await expect(result).resolves.not.toThrowError();
    },
    { timeout: 100000 }
  );

  it("should correctly sign the message", async () => {
    expect(
      await signer.signMessage(
        "0xa70d0af2ebb03a44dcd0714a8724f622e3ab876d0aa312f0ee04823285d6fb1b"
      )
    ).toBe(
      "0x566416f35683834b67044d3d66aeede3b4f91cce8820cc370ebd52b8d60ef03c5f7772fe25c65d0a4d71a33292305fc4a62f10b548cba2b8f9b72f9cd82b31881b"
    );
  });

  it(
    "should fail to execute if account address is not deployed and not correct",
    async () => {
      const accountAddress = "0xc33AbD9621834CA7c6Fc9f9CC3c47b9c17B03f9F";
      const provider = await ZeroDevEthersProvider.init("ECDSA", {
        projectId: config.projectId,
        owner: convertEthersSignerToAccountSigner(owner),
        opts: {
          accountConfig: {
            accountAddress,
          },
        },
      });
      const signer = provider.getAccountSigner();

      const result = signer.sendUserOperation({
        target: (await signer.getAddress()) as `0x${string}`,
        data: "0x",
      });

      await expect(result).rejects.toThrowError();
    },
    { timeout: 100000 }
  );
});
