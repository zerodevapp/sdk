import { createPublicClient, http, type Hex } from "viem";
import { polygonMumbai } from "viem/chains";
import { SocialRecoveryValidatorAbi } from "../abis/SocialRecoveryValidatorAbi.js";
import { config } from "./kernel-account.test.js";
import { LocalAccountSigner } from "@alchemy/aa-core";
import { generatePrivateKey } from "viem/accounts";
import { SocialRecoveryProvider } from "../validator-provider/index.js";

describe("Kernel Recovery Provider Test", async () => {
  const owner = LocalAccountSigner.privateKeyToAccountSigner(config.privateKey);
  const secondOwner = LocalAccountSigner.privateKeyToAccountSigner(
    generatePrivateKey()
  );

  const client = createPublicClient({
    chain: polygonMumbai,
    transport: http("https://rpc.ankr.com/polygon_mumbai"),
  });

  let accountAddress: Hex = "0x";

  it("should add guardians correctly", async () => {
    const socialRecoveryProvider = await SocialRecoveryProvider.init({
      projectId: "c73037ef-8c0b-48be-a581-1f3d161151d3",
      owner,
      opts: {
        accountConfig: {
          index: 10050n,
        },
        providerConfig: {
          opts: {
            txMaxRetries: 10,
            txRetryIntervalMs: 2000,
          },
        },
        paymasterConfig: {
          policy: "VERIFYING_PAYMASTER",
        },
      },
    });

    const data = {
        guardians: {
          "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4": 100,
        },
        threshold: 50,
        owneraddress: "0x7c8999dc9a822c1f0df42023113edb4fdd543266",
      };

    const res = await socialRecoveryProvider.setGuardians(data);

    console.log(res);
  },{timeout: 100000});

  it("should add recovery message and new owner", async()=>{
    const socialRecoveryProvider = await SocialRecoveryProvider.init({
      projectId: "c73037ef-8c0b-48be-a581-1f3d161151d3",
      owner,
      opts: {
        accountConfig: {
          index: 10050n,
        },
        providerConfig: {
          opts: {
            txMaxRetries: 10,
            txRetryIntervalMs: 2000,
          },
        },
        paymasterConfig: {
          policy: "VERIFYING_PAYMASTER",
        },
      },
    });

    const res = await socialRecoveryProvider.initRecovery(
        "0x7c8999dc9a822c1f0df42023113edb4fdd543266",
        "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
    ) 

    console.log(res)
  },{timeout: 100000})
});
