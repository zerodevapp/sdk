import {
  createPublicClient,
  http,
  type Hex,
  getFunctionSelector,
  type Hash,
} from "viem";
import { polygonMumbai } from "viem/chains";
import { config } from "./config/index.js";
import {
  ECDSAProvider,
  KillSwitchProvider,
} from "../validator-provider/index.js";
import { KILL_SWITCH_ACTION } from "../constants.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import { ValidatorMode } from "../validator/base.js";
import { LocalAccountSigner } from "@alchemy/aa-core";

// [TODO] - Organize the test code properly
describe("Kernel Kill Switch Provider Test", async () => {
  const dummyPrivateKey =
    "0x022430a80f723d8789f0d4fb346bdd013b546e4b96fcacf8aceca2b1a65a19dc";
  const owner = LocalAccountSigner.privateKeyToAccountSigner(config.privateKey);
  const secondOwner =
    LocalAccountSigner.privateKeyToAccountSigner(dummyPrivateKey);
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
          index: 70002n,
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
      delaySeconds: 20,
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
        console.log("tx", tx);
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
    "should force unblock",
    async () => {
      let result = await sudoModeKillSwitchProvider.sendUserOperation({
        target: accountAddress,
        data: selector,
      });
      console.log(result);
      const tx =
        await sudoModeKillSwitchProvider.waitForUserOperationTransaction(
          result.hash as Hash
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

  it(
    "should send UserOp after pauseUntil has passed",
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
        console.log("tx", tx);
      } catch (e) {
        console.log(e);
      }

      // Wait for the delay
      new Promise((resolve) => setTimeout(resolve, 20000));

      result = await ecdsaProvider.sendUserOperation({
        target: await owner.getAddress(),
        data: "0x",
      });
      console.log(result);
      tx = await ecdsaProvider.waitForUserOperationTransaction(
        result.hash as Hash
      );
      console.log(tx);
    },
    { timeout: 1000000 }
  );
});
