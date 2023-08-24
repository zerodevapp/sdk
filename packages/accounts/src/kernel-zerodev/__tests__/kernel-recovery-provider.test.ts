import { createPublicClient, http, type Hex } from "viem";
import { polygonMumbai } from "viem/chains";
import { SocialRecoveryValidatorAbi } from "../abis/SocialRecoveryValidatorAbi.js";
import { config } from "./kernel-account.test.js";
import { LocalAccountSigner } from "@alchemy/aa-core";
import { generatePrivateKey } from "viem/accounts";
import { ECDSAProvider, SocialRecoveryProvider } from "../validator-provider/index.js";
import { ValidatorMode } from "../validator/base.js";

describe("Kernel Recovery Provider Test", async () => {
  const owner = LocalAccountSigner.privateKeyToAccountSigner(config.privateKey);
  const secondOwner = LocalAccountSigner.privateKeyToAccountSigner(
    generatePrivateKey()
  );

  const ownerAddress = await owner.getAddress();

  const client = createPublicClient({
    chain: polygonMumbai,
    transport: http("https://rpc.ankr.com/polygon_mumbai"),
  });

  let accountAddress: Hex = "0x";

  let ecdsaProvider:ECDSAProvider;
  let socialRecoveryProvider:SocialRecoveryProvider;

  beforeAll(async () => {
    ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectIdWithGasSponsorship,
        owner,
        opts: {
          accountConfig: {
            index: 70001n,
          },
          paymasterConfig: {
            policy: "VERIFYING_PAYMASTER",
          },
        },
      });
      let accountAddress = await ecdsaProvider.getAccount().getAddress();
      console.log("accountAddress", accountAddress);

      if (!(await ecdsaProvider.getAccount().isAccountDeployed())) {
        const depResult = await ecdsaProvider.sendUserOperation({
          target: await owner.getAddress(),
          data: "0x",
        });
        console.log("depResult", depResult);
        await ecdsaProvider.waitForUserOperationTransaction(
          depResult.hash as Hex
        );
      }

    socialRecoveryProvider = await SocialRecoveryProvider.init({
        projectId: config.projectIdWithGasSponsorship,
        owner,
        usePaymaster: true,
        opts: {
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
          accountConfig:{
            accountAddress
          },
          validatorConfig:{
            mode:ValidatorMode.sudo,
            validatorAddress:"0x85DD0a0cD046ffC2e72DcD8CD559FaA0bE94c4CC",
          }
        },
      });
  });

  it("should add guardians correctly", async () => {
    const data = {
        guardians: {
          "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4": 100,
        },
        threshold: 50,
        owneraddress: ownerAddress,
      };

    const res = await socialRecoveryProvider.setGuardians(data);

    console.log(res);
  },{timeout: 100000});

  it("should add recovery message and new owner", async()=>{

    const res = await socialRecoveryProvider.initRecovery(
        ownerAddress,
        "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
    ) 

    console.log(res)
  },{timeout: 100000});

  it("should recover account", async()=>{
    const calldata = '0x011e732281b5dc6815686f4329be03d89d57a92ee3d0bc38d29659e7b2164ec6d3018e0822baf9fced11f96b2c1f41a547b4794bd1659360cafd388cdf26c463b91c1e732281b5dc6815686f4329be03d89d57a92ee3d0bc38d29659e7b2164ec6d3018e0822baf9fced11f96b2c1f41a547b4794bd1659360cafd388cdf26c463b91c1e732281b5dc6815686f4329be03d89d57a92ee3d0bc38d29659e7b2164ec6d3018e0822baf9fced11f96b2c1f41a547b4794bd1659360cafd388cdf26c463b91c1e732281b5dc6815686f4329be03d89d57a92ee3d0bc38d29659e7b2164ec6d3018e0822baf9fced11f96b2c1f41a547b4794bd1659360cafd388cdf26c463b91c'
    const res = await socialRecoveryProvider.submitRecovery(
        calldata
    );

    console.log(res)
  },{timeout: 100000});
});
