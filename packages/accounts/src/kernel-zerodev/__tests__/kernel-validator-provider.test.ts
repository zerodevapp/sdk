import { createPublicClient, http, type Hex } from "viem";
import { polygonMumbai } from "viem/chains";
import { ECDSAValidatorAbi } from "../abis/ESCDAValidatorAbi";
import { config } from "./kernel-account.test";
import { PrivateKeySigner } from "@alchemy/aa-core";
import { generatePrivateKey } from "viem/accounts";
import { ValidatorProviderBuilder } from "../builder/validator-provider-builder";
import { KernelValidatorProvider } from "../kernel";

// [TODO] - Organize the test code properly
describe("Kernel Validator Provider Test", async () => {

    const owner = PrivateKeySigner.privateKeyToAccountSigner(config.privateKey);
    const secondOwner = PrivateKeySigner.privateKeyToAccountSigner(generatePrivateKey());

    const client = createPublicClient({
        chain: polygonMumbai,
        transport: http()
    });


    let accountAddress: Hex = "0x";
    let validatorProviderBuilder = new ValidatorProviderBuilder();
    let kernelValidatorProvider = new KernelValidatorProvider(validatorProviderBuilder);
    it("should change owner in ECDSAValidator plugin to new owner", async () => {

        await kernelValidatorProvider.init({
            projectId: config.projectId,
            owner,
            validatorType: "ECDSA",
            opts: {
                accountConfig: {
                    index: 10041n,
                },
                paymasterConfig: {
                    policy: "TOKEN_PAYMASTER",
                    gasToken: "TEST_ERC20"
                },
            }
        });
        await validatorProviderBuilder.prepareValidatorProvider();
        await (await validatorProviderBuilder.getAccount())!.getInitCode();
        accountAddress = await (await validatorProviderBuilder.getAccount())!.getAddress();
        let ecdsaValidatorProvider = await validatorProviderBuilder.buildValidatorProvider();


        const resp = await ecdsaValidatorProvider.changeOwner(await secondOwner.getAddress());
        await ecdsaValidatorProvider.waitForUserOperationTransaction(resp.hash as Hex);
        let currentOwnerNow = await client.readContract({
            functionName: "ecdsaValidatorStorage",
            args: [await ecdsaValidatorProvider.provider.account!.getAddress()],
            abi: ECDSAValidatorAbi,
            address: config.validatorAddress
        });
        expect(currentOwnerNow).to.equal(await secondOwner.getAddress());
        console.log(`Owner changed from ${await owner.getAddress()} to ${currentOwnerNow}}`);
    }, { timeout: 100000 });

    it("should change owner back to original owner in ECDSAValidator plugin", async () => {

        await kernelValidatorProvider.init({
            projectId: "b5486fa4-e3d9-450b-8428-646e757c10f6",
            owner: secondOwner,
            opts: {
                accountConfig: {
                    index: 0n,
                    accountAddress
                },
                paymasterConfig: {
                    policy: "TOKEN_PAYMASTER",
                    gasToken: "TEST_ERC20"
                }
            }
        });
        await validatorProviderBuilder.prepareValidatorProvider();
        await (await validatorProviderBuilder.getAccount())!.getInitCode();
        let ecdsaValidatorProvider = await validatorProviderBuilder.buildValidatorProvider();

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