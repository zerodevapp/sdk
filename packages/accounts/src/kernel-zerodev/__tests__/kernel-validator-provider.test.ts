import { createPublicClient, http, type Hex } from "viem";
import { polygonMumbai } from "viem/chains";
import { ECDSAValidatorAbi } from "../abis/ESCDAValidatorAbi";
import { type KernelSmartAccountParams, KernelSmartContractAccount } from "../account";
import { ValidatorProvider } from "../validator-provider/base";
import { KernelBaseValidator, ValidatorMode } from "../validator/base";
import { ECDSAValidator } from "../validator/ecdsa-validator";
import { config } from "./kernel-account.test";
import { PrivateKeySigner } from "@alchemy/aa-core";
import { generatePrivateKey } from "viem/accounts";
import { ZeroDevProvider } from "../provider";

describe("Kernel Validator Provider Test", async () => {

    const owner = PrivateKeySigner.privateKeyToAccountSigner(config.privateKey)
    const secondOwner = PrivateKeySigner.privateKeyToAccountSigner(generatePrivateKey())
    const provider = new ZeroDevProvider({
        projectId: config.projectId,
        entryPointAddress: config.entryPointAddress,
        chain: config.chain,
        // By default uses ZeroDev meta-bundler
        // rpcUrl: config.rpcProvider
    })

    it("should change owner in ECDSAValidator plugin", async () => {
        const validator: KernelBaseValidator = new ECDSAValidator(({
            validatorAddress: config.validatorAddress,
            mode: ValidatorMode.sudo,
            owner,
            chain: config.chain,
            entryPointAddress: config.entryPointAddress
        }))
        
        const validatorProvider = new ValidatorProvider({
            projectId: "b5486fa4-e3d9-450b-8428-646e757c10f6",
            entryPointAddress: config.entryPointAddress,
            chain: config.chain,
            defaultValidator: validator,
        })

        const accountParams: KernelSmartAccountParams = {
            rpcClient: provider.rpcClient,
            entryPointAddress: config.entryPointAddress,
            chain: config.chain,
            owner: owner,
            factoryAddress: config.accountFactoryAddress,
            index: 10027n,
            defaultValidator: validator,
            validator: validator
        }
        const account = new KernelSmartContractAccount(accountParams);
        let signerWithValidatorProvider = (await validatorProvider.connect((provider) => account)).withZeroDevPaymasterAndData({ policy: "VERIFYING_PAYMASTER" });

        await signerWithValidatorProvider.account!.getInitCode()

        const client = createPublicClient({
            chain: polygonMumbai,
            transport: http()
        })

        const resp = await signerWithValidatorProvider.sendEnableUserOp(await secondOwner.getAddress());
        await signerWithValidatorProvider.waitForUserOperationTransaction(resp.hash as Hex);
        let currentOwnerNow = await client.readContract({
            functionName: "ecdsaValidatorStorage",
            args: [await account.getAddress()],
            abi: ECDSAValidatorAbi,
            address: config.validatorAddress
        })
        expect(currentOwnerNow).to.equal(await secondOwner.getAddress());
        console.log(`Owner changed from ${await owner.getAddress()} to ${currentOwnerNow}}`);

        const validator2: KernelBaseValidator = new ECDSAValidator(({
            validatorAddress: config.validatorAddress,
            mode: ValidatorMode.sudo,
            owner: secondOwner,
            chain: config.chain,
            entryPointAddress: config.entryPointAddress
        }))
        const account2 = new KernelSmartContractAccount({...accountParams, owner: secondOwner, index: 0n, accountAddress: await account.getAddress(), defaultValidator: validator2, validator: validator2});
        const validatorProvider2 = (new ValidatorProvider({
            projectId: "b5486fa4-e3d9-450b-8428-646e757c10f6",
            entryPointAddress: config.entryPointAddress,
            chain: config.chain,
            defaultValidator: validator2,
            account: account2
        })).withZeroDevPaymasterAndData({ policy: "VERIFYING_PAYMASTER" });
        // let signerWithValidatorProvider2 = (await validatorProvider2.connect((provider) => account2)).withZeroDevPaymasterAndData({ policy: "VERIFYING_PAYMASTER" });
        const resp2 = await validatorProvider2.sendEnableUserOp(await owner.getAddress());
        await validatorProvider2.waitForUserOperationTransaction(resp2.hash as Hex);
        currentOwnerNow = (await client.readContract({
            functionName: "ecdsaValidatorStorage",
            args: [await account.getAddress()],
            abi: ECDSAValidatorAbi,
            address: config.validatorAddress
        }))
        expect(currentOwnerNow).to.equal(await owner.getAddress());
        console.log(`Owner changed back to ${currentOwnerNow} from ${await secondOwner.getAddress()}}`);
    }, { timeout: 100000 });
});