import {
  createPublicClient,
  http,
  type Hex,
  getFunctionSelector,
  encodeFunctionData,
  zeroAddress,
  type Hash,
} from "viem";
import { polygonMumbai } from "viem/chains";
import { generatePrivateKey } from "viem/accounts";
import { config } from "./kernel-account.test.js";
import { ECDSAProvider } from "../validator-provider/index.js";
import {
  CHAIN_ID_TO_NODE,
  MULTISEND_ADDR,
  TOKEN_ACTION,
  oneAddress,
} from "../constants.js";
import { SessionKeyProvider } from "../validator-provider/session-key-provider.js";
import {
  LocalAccountSigner,
  type Address,
  type SmartAccountSigner,
} from "@alchemy/aa-core";
import {
  ParamCondition,
  generatePermissionDataFromArgs,
  type Permission,
} from "../validator/session-key-validator.js";
import { Operation } from "../provider.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import { TEST_ERC20Abi } from "../abis/Test_ERC20Abi.js";
import { TokenActionsAbi } from "../abis/TokenActionsAbi.js";
import { EmptyAccountSigner } from "../signer/empty-account.js";
import { MultiSendAbi } from "../abis/MultiSendAbi.js";

// [TODO] - Organize the test code properly
describe("Kernel SessionKey Provider Test", async () => {
  const Test_ERC20Address = "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B";
  const dummyPrivateKey =
    "0x022430a80f723d8789f0d4fb346bdd013b546e4b96fcacf8aceca2b1a65a19dc";
  const owner = LocalAccountSigner.privateKeyToAccountSigner(config.privateKey);
  const secondOwner =
    LocalAccountSigner.privateKeyToAccountSigner(dummyPrivateKey);
  const randomOwner = LocalAccountSigner.privateKeyToAccountSigner(
    generatePrivateKey()
  );

  const client = createPublicClient({
    chain: polygonMumbai,
    transport: http(CHAIN_ID_TO_NODE[polygonMumbai.id]),
  });
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
        index: 40024n,
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
    usePaymaster = true,
    useTokenPaymaster = false
  ) {
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
      defaultProvider: ecdsaProvider,
      sessionKey: new EmptyAccountSigner(await sessionKey.getAddress()),
      sessionKeyData: {
        validAfter: 0,
        validUntil: 0,
        permissions,
        paymaster,
      },
      bundlerProvider: "ALCHEMY",
      usePaymaster,
      opts: {
        providerConfig: {
          opts: {
            txMaxRetries: 10,
            txRetryIntervalMs: 2000,
          },
        },
        paymasterConfig: useTokenPaymaster
          ? {
              policy: "TOKEN_PAYMASTER",
              gasToken: "TEST_ERC20",
            }
          : {
              policy: "VERIFYING_PAYMASTER",
            },
        validatorConfig: {
          executor,
          selector,
        },
      },
    });

    const serializedSessionKeyParams =
      await sessionKeyProvider.serializeSessionKeyParams();

    const sessionKeyParams = {
      ...SessionKeyProvider.deserializeSessionKeyParams(
        serializedSessionKeyParams
      ),
      sessionPrivateKey: dummyPrivateKey as Hex,
    };

    sessionKeyProvider = await SessionKeyProvider.fromSessionKeyParams({
      projectId: config.projectIdWithGasSponsorship,
      sessionKeyParams,
      bundlerProvider: "ALCHEMY",
      usePaymaster,
      opts: {
        providerConfig: {
          opts: {
            txMaxRetries: 10,
            txRetryIntervalMs: 2000,
          },
        },
        paymasterConfig: useTokenPaymaster
          ? {
              policy: "TOKEN_PAYMASTER",
              gasToken: "TEST_ERC20",
            }
          : {
              policy: "VERIFYING_PAYMASTER",
            },
      },
    });
  }

  it.skip(
    "should execute any tx using SessionKey when no permissions set",
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
      await sessionKeyProvider.waitForUserOperationTransaction(
        (
          await result
        ).hash as Hash
      );
    },
    { timeout: 1000000 }
  );

  it.skip(
    "should test findMatchingPermission",
    async () => {
      const amountToMint = 0n;
      await createProvider(
        secondOwner,
        zeroAddress,
        executeSelector,
        amountToMint,
        [
          generatePermissionDataFromArgs({
            target: Test_ERC20Address,
            valueLimit: 0n,
            abi: TEST_ERC20Abi,
            functionName: "transfer",
            args: [await secondOwner.getAddress(), 10000n],
            conditions: [
              ParamCondition.EQUAL,
              ParamCondition.LESS_THAN_OR_EQUAL,
            ],
          }),
        ]
      );
      await sessionKeyProvider.sendUserOperation({
        target: Test_ERC20Address,
        data: encodeFunctionData({
          abi: TEST_ERC20Abi,
          functionName: "transfer",
          args: [await secondOwner.getAddress(), 100n],
        }),
        value: 0n,
      });
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
          generatePermissionDataFromArgs({
            target: Test_ERC20Address,
            abi: TEST_ERC20Abi,
            functionName: "transfer",
            args: [await secondOwner.getAddress(), 10000n],
            conditions: [
              ParamCondition.EQUAL,
              ParamCondition.LESS_THAN_OR_EQUAL,
            ],
          }),
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
          target: Test_ERC20Address,
          data: encodeFunctionData({
            abi: TEST_ERC20Abi,
            functionName: "transfer",
            args: [await secondOwner.getAddress(), amountToTransfer],
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
    "should execute the erc20 token transfer action using SessionKey with ERC20 Token Paymaster",
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
          generatePermissionDataFromArgs({
            target: Test_ERC20Address,
            abi: TEST_ERC20Abi,
            functionName: "transfer",
          }),
          generatePermissionDataFromArgs({
            target: MULTISEND_ADDR,
            abi: MultiSendAbi,
            functionName: "multiSend",
            operation: Operation.DelegateCall,
          }),
        ],
        zeroAddress,
        true,
        true
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
          target: Test_ERC20Address,
          data: encodeFunctionData({
            abi: TEST_ERC20Abi,
            functionName: "transfer",
            args: [await secondOwner.getAddress(), amountToTransfer],
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

  it.skip(
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
          generatePermissionDataFromArgs({
            target: Test_ERC20Address,
            abi: TEST_ERC20Abi,
            functionName: "transfer",
            args: [await secondOwner.getAddress(), 10000n],
            conditions: [
              ParamCondition.EQUAL,
              ParamCondition.LESS_THAN_OR_EQUAL,
            ],
          }),
        ]
      );

      let result;
      const amountToTransfer = 10000n;
      try {
        result = sessionKeyProvider.sendUserOperation({
          target: Test_ERC20Address,
          data: encodeFunctionData({
            abi: TEST_ERC20Abi,
            functionName: "transfer",
            args: [await secondOwner.getAddress(), amountToTransfer],
          }),
          value: 1n,
        });
      } catch (e) {
        console.log(e);
      }
      await expect(result).rejects.toThrowError(
        "SessionKeyValidator: No matching permission found for the userOp"
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
          generatePermissionDataFromArgs({
            target: Test_ERC20Address,
            abi: TEST_ERC20Abi,
            functionName: "transfer",
            args: [await randomOwner.getAddress(), 10000n],
            conditions: [
              ParamCondition.EQUAL,
              ParamCondition.LESS_THAN_OR_EQUAL,
            ],
          }),
        ],
        oneAddress,
        false
      );

      let result;
      const amountToTransfer = 10000n;
      try {
        result = sessionKeyProvider.sendUserOperation({
          target: Test_ERC20Address,
          data: encodeFunctionData({
            abi: TEST_ERC20Abi,
            functionName: "transfer",
            args: [await randomOwner.getAddress(), amountToTransfer],
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
  it(
    "should serialize and deserialize valueLimit correctly",
    async () => {
      const bigInt = 123456789123456789123456789123456789n;
      await createProvider(
        randomOwner,
        zeroAddress,
        executeSelector,
        0n,
        [
          generatePermissionDataFromArgs({
            target: Test_ERC20Address,
            abi: TEST_ERC20Abi,
            functionName: "transfer",
            valueLimit: bigInt,
          }),
        ],
        oneAddress,
        false
      );

      const serializedSessionKeyParams =
        await sessionKeyProvider.serializeSessionKeyParams();

      const sessionKeyParams = {
        ...SessionKeyProvider.deserializeSessionKeyParams(
          serializedSessionKeyParams
        ),
        sessionPrivateKey: dummyPrivateKey as Hex,
      };

      expect(
        sessionKeyParams.sessionKeyData.permissions![0].valueLimit === bigInt
      );
    },
    { timeout: 1000000 }
  );
});
