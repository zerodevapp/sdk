import {
  createPublicClient,
  http,
  type Hex,
  getFunctionSelector,
  encodeFunctionData,
  type Hash,
  zeroAddress,
} from "viem";
import { polygonMumbai } from "viem/chains";
import { config } from "./kernel-account.test.js";
import {
  ECDSAProvider,
  KillSwitchProvider,
} from "../validator-provider/index.js";
import {
  KILL_SWITCH_ACTION,
  KILL_SWITCH_VALIDATOR_ADDRESS,
} from "../constants.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import { ZeroDevLocalAccountSigner } from "../signer/zd-local-account.js";
import { ValidatorMode } from "../validator/base.js";
import { KillSwitchValidatorAbi } from "../abis/KillSwitchValidatorAbi.js";

// [TODO] - Organize the test code properly
describe("Kernel Kill Switch Provider Test", async () => {
  const dummyPrivateKey =
    "0x022430a80f723d8789f0d4fb346bdd013b546e4b96fcacf8aceca2b1a65a19dc";
  const owner = ZeroDevLocalAccountSigner.privateKeyToAccountSigner(
    config.privateKey
  );
  const secondOwner =
    ZeroDevLocalAccountSigner.privateKeyToAccountSigner(dummyPrivateKey);
  console.log("secondOwner", secondOwner);

  const client = createPublicClient({
    chain: polygonMumbai,
    transport: http("https://rpc.ankr.com/polygon_mumbai"),
  });
  let accountAddress: Hex = "0x";
  const selector = getFunctionSelector("toggleKillSwitch()");
  let blockerKillSwitchProvider: KillSwitchProvider;
  let sudoModeKillSwitchProvider: KillSwitchProvider;
  let ecdsaProvider: ECDSAProvider;

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
    accountAddress = await ecdsaProvider.getAccount().getAddress();
    console.log("accountAddress", accountAddress);

    // Needed to deploy the wallet
    // ------------------------
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
    // ------------------------

    blockerKillSwitchProvider = await KillSwitchProvider.init({
      projectId: config.projectIdWithGasSponsorship,
      guardian: secondOwner,
      delaySeconds: 10,
      opts: {
        accountConfig: {
          accountAddress,
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
        validatorConfig: {
          mode: ValidatorMode.plugin,
          executor: KILL_SWITCH_ACTION,
          selector,
        },
      },
    });

    const enableSig = await ecdsaProvider
      .getValidator()
      .approveExecutor(
        accountAddress,
        selector,
        KILL_SWITCH_ACTION,
        0,
        0,
        blockerKillSwitchProvider.getAccount().getValidator()
      );

    blockerKillSwitchProvider.getValidator().setEnableSignature(enableSig);

    sudoModeKillSwitchProvider = await KillSwitchProvider.init({
      projectId: config.projectIdWithGasSponsorship,
      guardian: secondOwner,
      delaySeconds: 0,
      opts: {
        accountConfig: {
          accountAddress,
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
        validatorConfig: {
          mode: ValidatorMode.sudo,
          executor: KILL_SWITCH_ACTION,
          selector,
        },
      },
    });
  }, 1000000);

  it(
    "should block the account",
    async () => {
      let result, tx;
      try {
        result = await blockerKillSwitchProvider.sendUserOperation({
          target: accountAddress,
          data: selector,
        });
        console.log(result);
        tx = await blockerKillSwitchProvider.waitForUserOperationTransaction(
          result.hash as Hex
        );
      } catch (e) {
        console.log(e);
      }
      console.log(tx);
      const defaultValidator = await client.readContract({
        address: accountAddress,
        abi: KernelAccountAbi,
        functionName: "getDefaultValidator",
      });
      console.log("defaultValidator", defaultValidator);
      expect(defaultValidator).to.equal(
        blockerKillSwitchProvider.getValidator().validatorAddress
      );
    },
    { timeout: 1000000 }
  );

  it(
    "should wait for the delay",
    async () => {
      new Promise((resolve) => setTimeout(resolve, 10000));
    },
    { timeout: 1000000 }
  );

  it(
    "should send UserOp after pauseUntil has passed",
    async () => {
      const result = await ecdsaProvider.sendUserOperation({
        target: await owner.getAddress(),
        data: "0x",
      });
      console.log(result);
      const tx = await ecdsaProvider.waitForUserOperationTransaction(
        result.hash as Hash
      );
      console.log(tx);
    },
    { timeout: 1000000 }
  );

  // Test for unblocking
  it(
    "should make ecdsa default validator",
    async () => {
      const setDefValdata = encodeFunctionData({
        abi: KernelAccountAbi,
        functionName: "setDefaultValidator",
        args: [
          await ecdsaProvider.getValidator().validatorAddress,
          await owner.getAddress(),
        ],
      });
      let result = await sudoModeKillSwitchProvider.sendUserOperation({
        target: accountAddress,
        data: setDefValdata,
      });
      console.log(result);
      let tx = await sudoModeKillSwitchProvider.waitForUserOperationTransaction(
        result.hash as Hex
      );
      console.log(tx);

      const defaultValidator = await client.readContract({
        address: accountAddress,
        abi: KernelAccountAbi,
        functionName: "getDefaultValidator",
      });
      console.log("defaultValidator", defaultValidator);
      expect(defaultValidator).to.equal(
        ecdsaProvider.getValidator().validatorAddress
      );
    },
    { timeout: 1000000 }
  );

  // Test for unblocking
  it(
    "should set default mode to 0x00000000",
    async () => {
      const setDefModeData = encodeFunctionData({
        abi: KernelAccountAbi,
        functionName: "disableMode",
        args: ["0x00000000"],
      });
      const result = await ecdsaProvider.sendUserOperation({
        target: accountAddress,
        data: setDefModeData,
      });
      console.log(result);
      const tx = await ecdsaProvider.waitForUserOperationTransaction(
        result.hash as Hex
      );
      console.log(tx);
      const disabledMode = await client.readContract({
        address: accountAddress,
        abi: KernelAccountAbi,
        functionName: "getDisabledMode",
      });
      console.log("disabledMode", disabledMode);
      expect(disabledMode).to.equal("0x00000000");
    },
    { timeout: 1000000 }
  );

  // Test for unblocking
  it(
    "should disable KillSwitchValidator",
    async () => {
      const disableData = encodeFunctionData({
        abi: KillSwitchValidatorAbi,
        functionName: "disable",
        args: ["0x"],
      });
      const result = await ecdsaProvider.sendUserOperation({
        target: KILL_SWITCH_VALIDATOR_ADDRESS,
        data: disableData,
      });
      console.log(result);
      const tx = await ecdsaProvider.waitForUserOperationTransaction(
        result.hash as Hex
      );
      console.log(tx);
      const killSwitchData = await client.readContract({
        address: KILL_SWITCH_VALIDATOR_ADDRESS,
        abi: KillSwitchValidatorAbi,
        functionName: "killSwitchValidatorStorage",
        args: [accountAddress],
      });
      console.log("killSwitchData", killSwitchData, [
        zeroAddress,
        zeroAddress,
        0,
        "0x00000000",
      ]);
      expect(killSwitchData).to.eql([
        zeroAddress,
        zeroAddress,
        0,
        "0x00000000",
      ]);
    },
    { timeout: 1000000 }
  );
});
