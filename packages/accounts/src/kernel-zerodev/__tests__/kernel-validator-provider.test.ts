import { createPublicClient, http, type Hex } from "viem";
import { polygonMumbai } from "viem/chains";
import { ECDSAValidatorAbi } from "../abis/ESCDAValidatorAbi";
import { type KernelSmartAccountParams, KernelSmartContractAccount } from "../account";
import { ValidatorMode } from "../validator/base";
import { ECDSAValidator } from "../validator/ecdsa-validator";
import { config } from "./kernel-account.test";
import { PrivateKeySigner } from "@alchemy/aa-core";
import { generatePrivateKey } from "viem/accounts";
import { ZeroDevProvider } from "../provider";
import { ECDSAValidatorProvider } from "../validator-provider/ecdsa-validator-provider";

// [TODO] - Organize the test code properly
describe("Kernel Validator Provider Test", async () => {

    const owner = PrivateKeySigner.privateKeyToAccountSigner(config.privateKey);
    const secondOwner = PrivateKeySigner.privateKeyToAccountSigner(generatePrivateKey());

    const validator: ECDSAValidator = new ECDSAValidator(({
        validatorAddress: config.validatorAddress,
        mode: ValidatorMode.sudo,
        owner,
        chain: config.chain,
    }));


    let provider = new ZeroDevProvider({
        projectId: "b5486fa4-e3d9-450b-8428-646e757c10f6",
        chain: config.chain,
    });
    const client = createPublicClient({
        chain: polygonMumbai,
        transport: http()
    });


    const accountParams: KernelSmartAccountParams<ECDSAValidator> = {
        rpcClient: provider.rpcClient,
        chain: config.chain,
        owner: owner,
        factoryAddress: config.accountFactoryAddress,
        index: 10034n,
        defaultValidator: validator,
        validator: validator
    };
    const account = new KernelSmartContractAccount(accountParams);

    provider = provider.connect((_) => account).withZeroDevPaymasterAndData({ policy: "VERIFYING_PAYMASTER" });

    let ecdsaValidatorProvider = new ECDSAValidatorProvider({
        provider,
    });


    it("should change owner in ECDSAValidator plugin to new owner", async () => {


        await provider.account!.getInitCode();


        const resp = await ecdsaValidatorProvider.changeOwner(await secondOwner.getAddress());
        await ecdsaValidatorProvider.waitForUserOperationTransaction(resp.hash as Hex);
        let currentOwnerNow = await client.readContract({
            functionName: "ecdsaValidatorStorage",
            args: [await account.getAddress()],
            abi: ECDSAValidatorAbi,
            address: config.validatorAddress
        });
        expect(currentOwnerNow).to.equal(await secondOwner.getAddress());
        console.log(`Owner changed from ${await owner.getAddress()} to ${currentOwnerNow}}`);
    }, { timeout: 100000 });

    it("should change owner back to original owner in ECDSAValidator plugin", async () => {

        const validator2: ECDSAValidator = new ECDSAValidator(({
            validatorAddress: config.validatorAddress,
            mode: ValidatorMode.sudo,
            owner: secondOwner,
            chain: config.chain,
        }));
        const account2 = new KernelSmartContractAccount({ ...accountParams, owner: secondOwner, index: 0n, accountAddress: await account.getAddress(), defaultValidator: validator2, validator: validator2 });
        ecdsaValidatorProvider = ecdsaValidatorProvider.connectProvider(provider.connect((_) => account2));
        const resp2 = await ecdsaValidatorProvider.changeOwner(await owner.getAddress());
        await ecdsaValidatorProvider.waitForUserOperationTransaction(resp2.hash as Hex);
        let currentOwnerNow = (await client.readContract({
            functionName: "ecdsaValidatorStorage",
            args: [await account.getAddress()],
            abi: ECDSAValidatorAbi,
            address: config.validatorAddress
        }));
        expect(currentOwnerNow).to.equal(await owner.getAddress());
        console.log(`Owner changed back to ${currentOwnerNow} from ${await secondOwner.getAddress()}}`);

    }, { timeout: 100000 });
});