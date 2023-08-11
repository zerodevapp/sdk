import {
  createPublicClient,
  http,
  type Hex,
  getFunctionSelector,
  encodeFunctionData,
  toHex,
  pad,
  zeroAddress,
  type Hash,
} from "viem";
import { polygonMumbai } from "viem/chains";
import { generatePrivateKey } from "viem/accounts";
import { config } from "./kernel-account.test.js";
import { ECDSAProvider } from "../validator-provider/index.js";
import { TOKEN_ACTION, oneAddress } from "../constants.js";
import { ZeroDevLocalAccountSigner } from "../signer/zd-local-account.js";
import { ValidatorMode } from "../validator/base.js";
import { SessionKeyProvider } from "../validator-provider/session-key-provider.js";
import type { Address, SmartAccountSigner } from "@alchemy/aa-core";
import {
  ParamCondition,
  type Permission,
} from "../validator/session-key-validator.js";
import { Operation } from "../provider.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import { TEST_ERC20Abi } from "../abis/Test_ERC20Abi.js";
import { EmptyValidator } from "../validator/empty-validator.js";
import { TokenActionsAbi } from "../abis/TokenActionsAbi.js";

// [TODO] - Organize the test code properly
describe("Kernel SessionKey Provider Test", async () => {
  const Test_ERC20Address = "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B";
  const dummyPrivateKey =
    "0x022430a80f723d8789f0d4fb346bdd013b546e4b96fcacf8aceca2b1a65a19dc";
  const owner = ZeroDevLocalAccountSigner.privateKeyToAccountSigner(
    config.privateKey
  );
  const secondOwner =
    ZeroDevLocalAccountSigner.privateKeyToAccountSigner(dummyPrivateKey);
  const randomOwner = ZeroDevLocalAccountSigner.privateKeyToAccountSigner(
    generatePrivateKey()
  );

  const client = createPublicClient({
    chain: polygonMumbai,
    transport: http("https://rpc.ankr.com/polygon_mumbai"),
  });
  const erc20TransferSelector = getFunctionSelector(
    "transfer(address, uint256)"
  );
  const transfer20ActionSelector = getFunctionSelector(
    "transfer20Action(address, uint256, address)"
  );
  const executeSelector = getFunctionSelector(
    "execute(address, uint256, bytes, uint8)"
  );
  let sessionKeyProvider: SessionKeyProvider;
  let ecdsaProvider: ECDSAProvider = await ECDSAProvider.init({
    projectId: config.projectIdWithGasSponsorship,
    owner,
    opts: {
      accountConfig: {
        index: 40006n,
      },
      paymasterConfig: {
        policy: "VERIFYING_PAYMASTER",
      },
    },
  });
  let accountAddress = await ecdsaProvider.getAccount().getAddress();
  console.log("accountAddress", accountAddress);

  async function createProvider(
    sessionKey: SmartAccountSigner,
    executor: Hex,
    selector: Address,
    amount?: bigint,
    permissions?: Permission[],
    paymaster?: Address,
    usePaymaster = true
  ) {
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

    if (amount) {
      const mintData = encodeFunctionData({
        abi: TEST_ERC20Abi,
        args: [accountAddress, amount],
        functionName: "mint",
      });
      const result = await ecdsaProvider.sendUserOperation({
        target: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
        data: mintData,
        value: 0n,
      });
      console.log("mint res:", result);
      await ecdsaProvider.waitForUserOperationTransaction(result.hash as Hash);
    }

    sessionKeyProvider = await SessionKeyProvider.init({
      projectId: config.projectIdWithGasSponsorship,
      owner,
      sessionKey,
      sessionKeyData: {
        validAfter: 0,
        validUntil: 0,
        permissions,
        paymaster,
      },
      bundlerProvider: "ALCHEMY",
      usePaymaster,
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
          paymasterProvider: "ALCHEMY",
        },
        validatorConfig: {
          mode: ValidatorMode.plugin,
          executor,
          selector,
        },
      },
    });
    const validator = await EmptyValidator.fromValidator(
      sessionKeyProvider.getValidator()
    );

    const enableSig = await ecdsaProvider
      .getValidator()
      .approveExecutor(accountAddress, selector, executor, 0, 0, validator);

    sessionKeyProvider.getValidator().setEnableSignature(enableSig);
  }

  it(
    "should execute the any tx using SessionKey when no permissions set",
    async () => {
      await createProvider(secondOwner, zeroAddress, executeSelector);

      let result = sessionKeyProvider.sendUserOperation({
        target: accountAddress,
        data: encodeFunctionData({
          abi: KernelAccountAbi,
          functionName: "execute",
          args: [await owner.getAddress(), 0n, "0x", Operation.Call],
        }),
      });
      await expect(result).resolves.not.toThrowError();
      await ecdsaProvider.waitForUserOperationTransaction(
        (
          await result
        ).hash as Hash
      );
    },
    { timeout: 1000000 }
  );

  it(
    "should execute the erc20 token transfer action using SessionKey",
    async () => {
      const balanceOfAccount = await client.readContract({
        address: Test_ERC20Address,
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [accountAddress],
      });
      const amountToMint = balanceOfAccount > 100000000n ? 0n : 100000000n;
      await createProvider(
        secondOwner,
        zeroAddress,
        executeSelector,
        amountToMint,
        [
          {
            target: Test_ERC20Address,
            valueLimit: 0,
            sig: erc20TransferSelector,
            operation: Operation.Call,
            rules: [
              {
                condition: ParamCondition.LESS_THAN_OR_EQUAL,
                offset: 32,
                param: pad(toHex(10000), { size: 32 }),
              },
              {
                condition: ParamCondition.EQUAL,
                offset: 0,
                param: pad(await secondOwner.getAddress(), { size: 32 }),
              },
            ],
          },
        ]
      );

      let result, tx;
      const balanceOfBefore = await client.readContract({
        address: Test_ERC20Address,
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [await secondOwner.getAddress()],
      });
      console.log("balanceOfBefore", balanceOfBefore);
      const amountToTransfer = 10000n;
      try {
        result = await sessionKeyProvider.sendUserOperation({
          target: accountAddress,
          data: encodeFunctionData({
            abi: KernelAccountAbi,
            functionName: "execute",
            args: [
              Test_ERC20Address,
              0n,
              encodeFunctionData({
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [await secondOwner.getAddress(), amountToTransfer],
              }),
              Operation.Call,
            ],
          }),
        });
        console.log(result);
        tx = await sessionKeyProvider.waitForUserOperationTransaction(
          result.hash as Hex
        );
      } catch (e) {
        console.log(e);
      }
      console.log(tx);
      const balanceOfAfter = await client.readContract({
        address: Test_ERC20Address,
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [await secondOwner.getAddress()],
      });
      console.log("balanceOfAfter", balanceOfAfter);
      expect(balanceOfAfter - balanceOfBefore).to.equal(amountToTransfer);
    },
    { timeout: 1000000 }
  );

  it(
    "should execute the erc20 token transfer action using SessionKey and Token Action executor",
    async () => {
      const balanceOfAccount = await client.readContract({
        address: Test_ERC20Address,
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [accountAddress],
      });
      const amountToMint = balanceOfAccount > 100000000n ? 0n : 100000000n;
      await createProvider(
        secondOwner,
        TOKEN_ACTION,
        transfer20ActionSelector,
        amountToMint
      );

      let result, tx;
      const balanceOfBefore = await client.readContract({
        address: Test_ERC20Address,
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [await secondOwner.getAddress()],
      });
      console.log("balanceOfBefore", balanceOfBefore);
      const amountToTransfer = 10000n;
      try {
        result = await sessionKeyProvider.sendUserOperation({
          target: accountAddress,
          data: encodeFunctionData({
            abi: TokenActionsAbi,
            functionName: "transfer20Action",
            args: [
              Test_ERC20Address,
              amountToTransfer,
              await secondOwner.getAddress(),
            ],
          }),
        });
        console.log(result);
        tx = await sessionKeyProvider.waitForUserOperationTransaction(
          result.hash as Hex
        );
      } catch (e) {
        console.log(e);
      }
      console.log(tx);
      const balanceOfAfter = await client.readContract({
        address: Test_ERC20Address,
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [await secondOwner.getAddress()],
      });
      console.log("balanceOfAfter", balanceOfAfter);
      expect(balanceOfAfter - balanceOfBefore).to.equal(amountToTransfer);
    },
    { timeout: 1000000 }
  );

  it(
    "should reject the tx using SessionKey if valueLimit exceeds",
    async () => {
      const balanceOfAccount = await client.readContract({
        address: Test_ERC20Address,
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [accountAddress],
      });
      const amountToMint = balanceOfAccount > 100000000n ? 0n : 100000000n;
      await createProvider(
        secondOwner,
        zeroAddress,
        executeSelector,
        amountToMint,
        [
          {
            target: Test_ERC20Address,
            valueLimit: 0,
            sig: erc20TransferSelector,
            operation: Operation.Call,
            rules: [
              {
                condition: ParamCondition.LESS_THAN_OR_EQUAL,
                offset: 32,
                param: pad(toHex(10000), { size: 32 }),
              },
              {
                condition: ParamCondition.EQUAL,
                offset: 0,
                param: pad(await secondOwner.getAddress(), { size: 32 }),
              },
            ],
          },
        ]
      );

      let result;
      const amountToTransfer = 10000n;
      try {
        result = sessionKeyProvider.sendUserOperation({
          target: accountAddress,
          data: encodeFunctionData({
            abi: KernelAccountAbi,
            functionName: "execute",
            args: [
              Test_ERC20Address,
              1n,
              encodeFunctionData({
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [await secondOwner.getAddress(), amountToTransfer],
              }),
              Operation.Call,
            ],
          }),
        });
      } catch (e) {
        console.log(e);
      }
      await expect(result).rejects.toThrowError(
        "AA23 reverted: SessionKeyValidator: value limit exceeded"
      );
    },
    { timeout: 1000000 }
  );
  it(
    "should reject the erc20 token transfer action using SessionKey without paymaster",
    async () => {
      const balanceOfAccount = await client.readContract({
        address: Test_ERC20Address,
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [accountAddress],
      });
      const amountToMint = balanceOfAccount > 100000000n ? 0n : 100000000n;
      await createProvider(
        randomOwner,
        zeroAddress,
        executeSelector,
        amountToMint,
        [
          {
            target: Test_ERC20Address,
            valueLimit: 0,
            sig: erc20TransferSelector,
            operation: Operation.Call,
            rules: [
              {
                condition: ParamCondition.LESS_THAN_OR_EQUAL,
                offset: 32,
                param: pad(toHex(10000), { size: 32 }),
              },
              {
                condition: ParamCondition.EQUAL,
                offset: 0,
                param: pad(await randomOwner.getAddress(), { size: 32 }),
              },
            ],
          },
        ],
        oneAddress,
        false
      );

      let result;
      const amountToTransfer = 10000n;
      try {
        result = sessionKeyProvider.sendUserOperation({
          target: accountAddress,
          data: encodeFunctionData({
            abi: KernelAccountAbi,
            functionName: "execute",
            args: [
              Test_ERC20Address,
              0n,
              encodeFunctionData({
                abi: TEST_ERC20Abi,
                functionName: "transfer",
                args: [await randomOwner.getAddress(), amountToTransfer],
              }),
              Operation.Call,
            ],
          }),
        });
      } catch (e) {
        console.log(e);
      }
      await expect(result).rejects.toThrowError(
        "AA23 reverted: SessionKeyValidator: paymaster not set"
      );
    },
    { timeout: 1000000 }
  );
});
