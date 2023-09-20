import {
  createPublicClient,
  http,
  type Hex,
  getFunctionSelector,
  concatHex,
  type LocalAccount,
} from "viem";
import { polygonMumbai } from "viem/chains";
import { config } from "./kernel-account.test.js";
import {
  ECDSAProvider,
  RecoveryProvider,
} from "../validator-provider/index.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import {
  LocalAccountSigner,
  type Address,
  type SmartAccountSigner,
} from "@alchemy/aa-core";
import {
  ECDSA_VALIDATOR_ADDRESS,
  RECOVERY_ACTION,
  RECOVERY_VALIDATOR_ADDRESS,
} from "../constants.js";
import { WeightedValidatorAbi } from "../abis/WeightedValidatorAbi.js";
import { privateKeyToAccount } from "viem/accounts";
import { ECDSAValidatorAbi } from "../abis/ESCDAValidatorAbi.js";

// [TODO] - Organize the test code properly
describe("Kernel Recovery Provider Test", async () => {
  const dummyPrivateKey =
    "0x022430a80f723d8789f0d4fb346bdd013b546e4b96fcacf8aceca2b1a65a19dc";
  const newOwnerPrivateKey =
    "0x57d97b86ec43cb73ae4049639a38e36161b6a07fc0c88453d1e5bf24e93f0591";
  const guardian2PrivateKey =
    "0x56cc523bad254edb3a0c7875207f3b2438754f6e7e1ed5e13a9d7949e1246a7f";
  const guardian3PrivateKey =
    "0x5a0912ad371f7989f5ab078dad96941a474750cad88fc4e4443d47a97ed78e16";
  const owner = LocalAccountSigner.privateKeyToAccountSigner(config.privateKey);
  const guardian =
    LocalAccountSigner.privateKeyToAccountSigner(dummyPrivateKey);
  const guardian2 =
    LocalAccountSigner.privateKeyToAccountSigner(guardian2PrivateKey);
  const guardian3 =
    LocalAccountSigner.privateKeyToAccountSigner(guardian3PrivateKey);
  const guardianAccount = privateKeyToAccount(dummyPrivateKey);
  let guardianAddress: Address;
  let guardian2Address: Address;
  let guardian3Address: Address;
  const newOwner =
    LocalAccountSigner.privateKeyToAccountSigner(newOwnerPrivateKey);
  let newOwnerAddress: Address;
  console.log("guardian1", guardian);
  console.log("guardian2", guardian2);
  console.log("guardian3", guardian3);
  let recoveryId: string;

  const client = createPublicClient({
    chain: polygonMumbai,
    transport: http("https://rpc.ankr.com/polygon_mumbai"),
  });
  let accountAddress: Hex = "0x";
  const selector = getFunctionSelector("doRecovery(address, bytes)");
  let recoveryData: {
    guardians: {
      [key: string]: number;
    };
    threshold: number;
    delaySeconds: number;
    totalWeight: number;
  };
  let recoveryProvider: RecoveryProvider;
  let ecdsaProvider: ECDSAProvider = await ECDSAProvider.init({
    projectId: config.projectIdWithGasSponsorship,
    owner,
    bundlerProvider: "ALCHEMY",
    opts: {
      accountConfig: {
        index: 90007n,
      },
      paymasterConfig: {
        policy: "VERIFYING_PAYMASTER",
      },
    },
  });

  async function createProvider(
    recoveryId?: string,
    accountSigner?: SmartAccountSigner,
    guardianAccountOrProvider?: LocalAccount<string>
  ): Promise<RecoveryProvider> {
    recoveryProvider = await RecoveryProvider.init({
      projectId: config.projectIdWithGasSponsorship,
      defaultProvider: ecdsaProvider,
      recoveryId,
      opts: {
        validatorConfig: {
          guardians: recoveryData.guardians,
          threshold: recoveryData.threshold,
          delaySeconds: recoveryData.delaySeconds,
          accountSigner,
          guardianAccountOrProvider,
          selector,
          executor: RECOVERY_ACTION,
          validAfter: 0,
          validUntil: 0,
        },
      },
    });
    return recoveryProvider;
  }

  beforeAll(async () => {
    newOwnerAddress = await newOwner.getAddress();
    guardianAddress = await guardian.getAddress();
    guardian2Address = await guardian2.getAddress();
    guardian3Address = await guardian3.getAddress();
    recoveryData = {
      guardians: {
        [guardianAddress]: 1,
        [guardian2Address]: 1,
        [guardian3Address]: 1,
      },
      threshold: 3,
      delaySeconds: 0,
      totalWeight: 0,
    };
    recoveryData["totalWeight"] = Object.values(recoveryData.guardians).reduce(
      (a, c) => a + c,
      0
    );
    accountAddress = await ecdsaProvider.getAccount().getAddress();
    console.log("accountAddress", accountAddress);

    await createProvider();
  }, 1000000);

  it(
    "should enable the recovery",
    async () => {
      let result, tx;
      try {
        result = await recoveryProvider.enableRecovery();
        console.log(result);
        tx = await recoveryProvider.waitForUserOperationTransaction(
          result.hash as Hex
        );
        console.log("tx", tx);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message !== "Plugin already enabled"
        ) {
          throw error;
        }
      }
      const execDetail = await client.readContract({
        address: accountAddress,
        abi: KernelAccountAbi,
        functionName: "getExecution",
        args: [selector],
      });
      console.log("selector", selector);
      console.log(execDetail);
      const enabledRecoveryData = await client.readContract({
        address: RECOVERY_VALIDATOR_ADDRESS,
        abi: WeightedValidatorAbi,
        functionName: "weightedStorage",
        args: [accountAddress],
      });
      expect(execDetail).to.eql({
        validAfter: 0,
        validUntil: 0,
        executor: RECOVERY_ACTION,
        validator: RECOVERY_VALIDATOR_ADDRESS,
      });
      expect(enabledRecoveryData).to.eql([
        recoveryData.totalWeight,
        recoveryData.threshold,
        recoveryData.delaySeconds,
        Object.keys(recoveryData.guardians).slice(-1)[0],
      ]);
      expect(await ecdsaProvider.getAddress()).to.equal(
        await recoveryProvider.getAddress()
      );
    },
    { timeout: 1000000 }
  );

  it.skip(
    "should disable the recovery",
    async () => {
      let result, tx;
      result = recoveryProvider.deleteRecoveryData();
      await expect(result).resolves.not.toThrowError();
      console.log(result);
      tx = await recoveryProvider.waitForUserOperationTransaction(
        (
          await result
        ).hash as Hex
      );
      console.log("tx", tx);
    },
    { timeout: 1000000 }
  );

  it(
    "should approve recovery",
    async () => {
      await createProvider(recoveryId, guardian, guardianAccount);
      let result;
      const callDataAndNonceHash =
        await recoveryProvider.encodeCalldataAndNonce(newOwnerAddress);
      console.log("callDataAndNonceHash", callDataAndNonceHash);
      result = recoveryProvider.approveRecovery(newOwnerAddress);
      await expect(result).resolves.not.toThrowError();
      console.log(result);
      const proposalStatus = await client.readContract({
        address: RECOVERY_VALIDATOR_ADDRESS,
        abi: WeightedValidatorAbi,
        functionName: "proposalStatus",
        args: [callDataAndNonceHash, accountAddress],
      });
      console.log(proposalStatus);
      expect(proposalStatus[0]).to.equal(0);
      expect(proposalStatus[2]).to.equal(1);
      const voteStatus = await client.readContract({
        address: RECOVERY_VALIDATOR_ADDRESS,
        abi: WeightedValidatorAbi,
        functionName: "voteStatus",
        args: [callDataAndNonceHash, guardianAddress, accountAddress],
      });
      console.log(voteStatus);
      expect(voteStatus).to.equal(1);
    },
    { timeout: 1000000 }
  );

  it(
    "should approve recovery with sig",
    async () => {
      const recoveryProvider = await createProvider(
        recoveryId,
        guardian2,
        guardianAccount
      );
      const recoveryProvider2 = await createProvider(
        recoveryId,
        guardian3,
        guardianAccount
      );
      let result;
      const callDataAndNonceHash =
        await recoveryProvider.encodeCalldataAndNonce(newOwnerAddress);
      console.log("callDataAndNonceHash", callDataAndNonceHash);
      const sig = await recoveryProvider
        .getValidator()
        .signRecoveryHash(callDataAndNonceHash);
      const sig2 = await recoveryProvider2
        .getValidator()
        .signRecoveryHash(callDataAndNonceHash);
      result = recoveryProvider.approveRecoveryWithSig(
        newOwnerAddress,
        concatHex([sig, sig2])
      );
      await expect(result).resolves.not.toThrowError();
      console.log(result);
      const proposalStatus = await client.readContract({
        address: RECOVERY_VALIDATOR_ADDRESS,
        abi: WeightedValidatorAbi,
        functionName: "proposalStatus",
        args: [callDataAndNonceHash, accountAddress],
      });
      console.log(proposalStatus);
      expect(proposalStatus[0]).to.equal(1);
      expect(proposalStatus[2]).to.equal(3);
      const voteStatus = await client.readContract({
        address: RECOVERY_VALIDATOR_ADDRESS,
        abi: WeightedValidatorAbi,
        functionName: "voteStatus",
        args: [callDataAndNonceHash, guardian2Address, accountAddress],
      });
      console.log(voteStatus);
      expect(voteStatus).to.equal(1);
      const voteStatus2 = await client.readContract({
        address: RECOVERY_VALIDATOR_ADDRESS,
        abi: WeightedValidatorAbi,
        functionName: "voteStatus",
        args: [callDataAndNonceHash, guardian3Address, accountAddress],
      });
      console.log(voteStatus2);
      expect(voteStatus2).to.equal(1);
    },
    { timeout: 1000000 }
  );

  it.skip(
    "should cancel the recovery",
    async () => {
      const callDataAndNonceHash =
        await recoveryProvider.encodeCalldataAndNonce(newOwnerAddress);
      const result = await recoveryProvider.cancelRecovery(newOwnerAddress);
      console.log(result);
      const tx = await recoveryProvider.waitForUserOperationTransaction(
        result.hash as Hex
      );
      console.log(tx);
      const proposalStatus = await client.readContract({
        address: RECOVERY_VALIDATOR_ADDRESS,
        abi: WeightedValidatorAbi,
        functionName: "proposalStatus",
        args: [callDataAndNonceHash, accountAddress],
      });
      console.log(proposalStatus);
      expect(proposalStatus[0]).to.equal(2);
    },
    { timeout: 1000000 }
  );

  it(
    "should submit the recovery",
    async () => {
      let result, tx;
      result = recoveryProvider.submitRecovery(newOwnerAddress);
      await expect(result).resolves.not.toThrowError();
      console.log(result);
      tx = await recoveryProvider.waitForUserOperationTransaction(
        (
          await result
        ).hash as Hex
      );
      console.log("tx", tx);
      const currentOwnerAddress = await client.readContract({
        address: ECDSA_VALIDATOR_ADDRESS,
        abi: ECDSAValidatorAbi,
        functionName: "ecdsaValidatorStorage",
        args: [accountAddress],
      });
      console.log("newOwner", newOwnerAddress);
      console.log("currentOwner", currentOwnerAddress);
      expect(currentOwnerAddress).to.equal(newOwnerAddress);
    },
    { timeout: 1000000 }
  );

  // Test just for testing purpose :p
  it(
    "should change the owner back to original",
    async () => {
      const ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectIdWithGasSponsorship,
        owner: newOwner,
        bundlerProvider: "ALCHEMY",
        opts: {
          accountConfig: {
            accountAddress: accountAddress,
          },
          paymasterConfig: {
            policy: "VERIFYING_PAYMASTER",
          },
        },
      });

      const result1 = await ecdsaProvider.sendEnableUserOperation(
        await owner.getAddress()
      );
      console.log(result1);
      const tx1 = await ecdsaProvider.waitForUserOperationTransaction(
        result1.hash as Hex
      );
      console.log(tx1);
    },
    { timeout: 1000000 }
  );

  describe("Test Recovery with recoveryId", async () => {
    it(
      "should initiate the recovery",
      async () => {
        await createProvider(recoveryId);
        recoveryId = await recoveryProvider.initiateRecovery(newOwnerAddress);
        console.log(recoveryId);
      },
      { timeout: 1000000 }
    );

    it(
      "should enable the recovery",
      async () => {
        await createProvider(recoveryId);
        let result, tx;
        try {
          result = await recoveryProvider.enableRecovery();
          console.log(result);
          tx = await recoveryProvider.waitForUserOperationTransaction(
            result.hash as Hex
          );
          console.log("tx", tx);
        } catch (error) {
          if (
            error instanceof Error &&
            error.message !== "Plugin already enabled"
          ) {
            throw error;
          }
        }
        const execDetail = await client.readContract({
          address: accountAddress,
          abi: KernelAccountAbi,
          functionName: "getExecution",
          args: [selector],
        });
        console.log("selector", selector);
        console.log(execDetail);
        const enabledRecoveryData = await client.readContract({
          address: RECOVERY_VALIDATOR_ADDRESS,
          abi: WeightedValidatorAbi,
          functionName: "weightedStorage",
          args: [accountAddress],
        });
        expect(execDetail).to.eql({
          validAfter: 0,
          validUntil: 0,
          executor: RECOVERY_ACTION,
          validator: RECOVERY_VALIDATOR_ADDRESS,
        });
        expect(enabledRecoveryData).to.eql([
          recoveryData.totalWeight,
          recoveryData.threshold,
          recoveryData.delaySeconds,
          Object.keys(recoveryData.guardians).slice(-1)[0],
        ]);
        expect(await ecdsaProvider.getAddress()).to.equal(
          await recoveryProvider.getAddress()
        );
      },
      { timeout: 1000000 }
    );

    it(
      "should approve recovery",
      async () => {
        await createProvider(recoveryId, guardian, guardianAccount);
        let result;
        const callDataAndNonceHash =
          await recoveryProvider.encodeCalldataAndNonce(newOwnerAddress);
        console.log("callDataAndNonceHash", callDataAndNonceHash);
        result = recoveryProvider.approveRecovery();
        await expect(result).resolves.not.toThrowError();
        console.log(result);
        const proposalStatus = await client.readContract({
          address: RECOVERY_VALIDATOR_ADDRESS,
          abi: WeightedValidatorAbi,
          functionName: "proposalStatus",
          args: [callDataAndNonceHash, accountAddress],
        });
        console.log(proposalStatus);
        expect(proposalStatus[0]).to.equal(0);
        expect(proposalStatus[2]).to.equal(1);
        const voteStatus = await client.readContract({
          address: RECOVERY_VALIDATOR_ADDRESS,
          abi: WeightedValidatorAbi,
          functionName: "voteStatus",
          args: [callDataAndNonceHash, guardianAddress, accountAddress],
        });
        console.log(voteStatus);
        expect(voteStatus).to.equal(1);
      },
      { timeout: 1000000 }
    );

    it(
      "should approve recovery with sig",
      async () => {
        const recoveryProvider1 = await createProvider(
          recoveryId,
          guardian2,
          guardianAccount
        );

        const callDataAndNonceHash =
          await recoveryProvider1.encodeCalldataAndNonce(newOwnerAddress);
        console.log("callDataAndNonceHash", callDataAndNonceHash);
        await recoveryProvider1.signRecovery();
        const recoveryProvider2 = await createProvider(
          recoveryId,
          guardian3,
          guardianAccount
        );
        await recoveryProvider2.signRecovery();
        recoveryProvider = recoveryProvider2;
      },
      { timeout: 1000000 }
    );

    it(
      "should submit the recovery",
      async () => {
        let result, tx;
        result = recoveryProvider.submitRecovery();
        await expect(result).resolves.not.toThrowError();
        console.log(result);
        tx = await recoveryProvider.waitForUserOperationTransaction(
          (
            await result
          ).hash as Hex
        );
        console.log("tx", tx);
        const currentOwnerAddress = await client.readContract({
          address: ECDSA_VALIDATOR_ADDRESS,
          abi: ECDSAValidatorAbi,
          functionName: "ecdsaValidatorStorage",
          args: [accountAddress],
        });
        console.log("newOwner", newOwnerAddress);
        console.log("currentOwner", currentOwnerAddress);
        expect(currentOwnerAddress).to.equal(newOwnerAddress);
      },
      { timeout: 1000000 }
    );

    // Test just for testing purpose :p
    it(
      "should change the owner back to original",
      async () => {
        const ecdsaProvider = await ECDSAProvider.init({
          projectId: config.projectIdWithGasSponsorship,
          owner: newOwner,
          bundlerProvider: "ALCHEMY",
          opts: {
            accountConfig: {
              accountAddress: accountAddress,
            },
            paymasterConfig: {
              policy: "VERIFYING_PAYMASTER",
            },
          },
        });

        const result1 = await ecdsaProvider.sendEnableUserOperation(
          await owner.getAddress()
        );
        console.log(result1);
        const tx1 = await ecdsaProvider.waitForUserOperationTransaction(
          result1.hash as Hex
        );
        console.log(tx1);
      },
      { timeout: 1000000 }
    );
  });
});
