import { createPublicClient, http, type Hex } from "viem";
import { polygonMumbai } from "viem/chains";
import { ECDSAValidatorAbi } from "../abis/ESCDAValidatorAbi";
import { config } from "./kernel-account.test";
import { PrivateKeySigner } from "@alchemy/aa-core";
import { generatePrivateKey } from "viem/accounts";
import { ECDSAValidatorProvider } from "../validator-provider";

// [TODO] - Organize the test code properly
describe("Kernel Validator Provider Test", async () => {

    const owner = PrivateKeySigner.privateKeyToAccountSigner(config.privateKey);
    const secondOwner = PrivateKeySigner.privateKeyToAccountSigner(generatePrivateKey());

    const client = createPublicClient({
        chain: polygonMumbai,
        transport: http()
    });


    let accountAddress: Hex = "0x";

    it("should change owner in ECDSAValidator plugin to new owner", async () => {
        const ecdsaValidatorProvider = await ECDSAValidatorProvider.init({
            projectId: "c73037ef-8c0b-48be-a581-1f3d161151d3",
            owner,
            opts: {
                accountConfig: {
                    index: 10041n,
                },
                paymasterConfig: {
                    policy: "VERIFYING_PAYMASTER"
                }
            }
        });

        await ecdsaValidatorProvider.provider.getAccount().getInitCode();
        accountAddress = await ecdsaValidatorProvider.provider.getAccount().getAddress();
        const resp = await ecdsaValidatorProvider.changeOwner(await secondOwner.getAddress());
        await ecdsaValidatorProvider.waitForUserOperationTransaction(resp.hash as Hex);
        let currentOwnerNow = await client.readContract({
            functionName: "ecdsaValidatorStorage",
            args: [await ecdsaValidatorProvider.provider.getAccount().getAddress()],
            abi: ECDSAValidatorAbi,
            address: config.validatorAddress
        });
        expect(currentOwnerNow).to.equal(await secondOwner.getAddress());
        console.log(`Owner changed from ${await owner.getAddress()} to ${currentOwnerNow}}`);
    }, { timeout: 100000 });

    it("should change owner back to original owner in ECDSAValidator plugin", async () => {
        const ecdsaValidatorProvider = await ECDSAValidatorProvider.init({
            projectId: "c73037ef-8c0b-48be-a581-1f3d161151d3",
            owner: secondOwner,
            opts: {
                accountConfig: {
                    index: 0n,
                    accountAddress
                },
                paymasterConfig: {
                    policy: "VERIFYING_PAYMASTER"
                }
            }
        });

        await ecdsaValidatorProvider.provider.getAccount().getInitCode();

        const resp2 = await ecdsaValidatorProvider.changeOwner(await owner.getAddress());
        await ecdsaValidatorProvider.waitForUserOperationTransaction(resp2.hash as Hex);
        let currentOwnerNow = (await client.readContract({
            functionName: "ecdsaValidatorStorage",
            args: [accountAddress],
            abi: ECDSAValidatorAbi,
            address: config.validatorAddress
        }));
        expect(currentOwnerNow).to.equal(await owner.getAddress());
        console.log(`Owner changed back to ${currentOwnerNow} from ${await secondOwner.getAddress()}}`);

    }, { timeout: 100000 });
});