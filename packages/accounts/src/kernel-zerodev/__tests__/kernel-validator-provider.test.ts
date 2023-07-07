import { createPublicClient, http, type Hex } from "viem";
import { polygonMumbai } from "viem/chains";
import { ECDSAValidatorAbi } from "../abis/ESCDAValidatorAbi.js";
import { config } from "./kernel-account.test.js";
import { LocalAccountSigner } from "@alchemy/aa-core";
import { generatePrivateKey } from "viem/accounts";
import { ECDSAProvider } from "../validator-provider/index.js";

// [TODO] - Organize the test code properly
describe("Kernel Validator Provider Test", async () => {
  const owner = LocalAccountSigner.privateKeyToAccountSigner(config.privateKey);
  const secondOwner = LocalAccountSigner.privateKeyToAccountSigner(
    generatePrivateKey()
  );

  const client = createPublicClient({
    chain: polygonMumbai,
    transport: http(),
  });

  let accountAddress: Hex = "0x";

  it(
    "should change owner in ECDSAValidator plugin to new owner",
    async () => {
      const ecdsaProvider = await ECDSAProvider.init({
        projectId: "c73037ef-8c0b-48be-a581-1f3d161151d3",
        owner,
        opts: {
          accountConfig: {
            index: 10041n,
          },
          paymasterConfig: {
            policy: "VERIFYING_PAYMASTER",
          },
        },
      });

      await ecdsaProvider.getAccount().getInitCode();
      accountAddress = await ecdsaProvider.getAccount().getAddress();
      const resp = await ecdsaProvider.changeOwner(
        await secondOwner.getAddress()
      );
      await ecdsaProvider.waitForUserOperationTransaction(resp.hash as Hex);
      let currentOwnerNow = await client.readContract({
        functionName: "ecdsaValidatorStorage",
        args: [await ecdsaProvider.getAccount().getAddress()],
        abi: ECDSAValidatorAbi,
        address: config.validatorAddress,
      });
      expect(currentOwnerNow).to.equal(await secondOwner.getAddress());
      console.log(
        `Owner changed from ${await owner.getAddress()} to ${currentOwnerNow}}`
      );
    },
    { timeout: 100000 }
  );

  it(
    "should change owner back to original owner in ECDSAValidator plugin",
    async () => {
      const ecdsaProvider = await ECDSAProvider.init({
        projectId: "c73037ef-8c0b-48be-a581-1f3d161151d3",
        owner: secondOwner,
        opts: {
          accountConfig: {
            index: 0n,
            accountAddress,
          },
          paymasterConfig: {
            policy: "VERIFYING_PAYMASTER",
          },
        },
      });

      await ecdsaProvider.getAccount().getInitCode();

      const resp2 = await ecdsaProvider.changeOwner(await owner.getAddress());
      await ecdsaProvider.waitForUserOperationTransaction(resp2.hash as Hex);
      let currentOwnerNow = await client.readContract({
        functionName: "ecdsaValidatorStorage",
        args: [accountAddress],
        abi: ECDSAValidatorAbi,
        address: config.validatorAddress,
      });
      expect(currentOwnerNow).to.equal(await owner.getAddress());
      console.log(
        `Owner changed back to ${currentOwnerNow} from ${await secondOwner.getAddress()}}`
      );
    },
    { timeout: 100000 }
  );
});
