import {
  encodeAbiParameters,
  type Hex,
  parseAbiParameters,
  encodeFunctionData,
  type Hash,
  createPublicClient,
  http,
} from "viem";
import { polygonMumbai } from "viem/chains";
import { generatePrivateKey } from "viem/accounts";
import { LocalAccountSigner } from "@alchemy/aa-core";
import { TEST_ERC20Abi } from "../abis/Test_ERC20Abi.js";
import { ECDSAProvider } from "../validator-provider/index.js";
import { CHAIN_ID_TO_NODE } from "../constants.js";

export const config = {
  privateKey: (process.env.PRIVATE_KEY as Hex) ?? generatePrivateKey(),
  ownerWallet: process.env.OWNER_WALLET,
  mockWallet: "0x48D4d3536cDe7A257087206870c6B6E76e3D4ff4",
  chain: polygonMumbai,
  rpcProvider: "https://mumbai-bundler.etherspot.io/",
  validatorAddress: "0xd9AB5096a832b9ce79914329DAEE236f8Eea0390" as Hex,
  accountFactoryAddress: "0x5de4839a76cf55d0c90e2061ef4386d962E15ae3" as Hex,
  entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as Hex,
  // Turn off all policies related to gas sponsorship for this projectId
  // To make all the testcases pass
  projectId: "8db3f9f0-f8d0-4c69-9bc6-5c522ee25844",
  projectIdWithGasSponsorship: "c73037ef-8c0b-48be-a581-1f3d161151d3",
};

// [TODO] - Organize instantiations and tests properly

describe.skip("Kernel Account Tests", () => {
  //any wallet should work

  const owner = LocalAccountSigner.privateKeyToAccountSigner(config.privateKey);
  const dummyPrivateKey =
    "0x022430a80f723d8789f0d4fb346bdd013b546e4b96fcacf8aceca2b1a65a19dc";
  const mockOwner =
    LocalAccountSigner.privateKeyToAccountSigner(dummyPrivateKey);
  const client = createPublicClient({
    chain: polygonMumbai,
    transport: http(CHAIN_ID_TO_NODE[polygonMumbai.id]),
  });

  it(
    "getAddress returns valid counterfactual address",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
      });

      //contract already deployed
      expect(await ecdsaProvider.getAddress()).eql(
        "0xe06bD73f970cBaC97eAc5C700868FC9a0915D172"
      );

      ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
        opts: {
          accountConfig: {
            index: 4n,
          },
        },
      });

      //contract already deployed
      expect(await ecdsaProvider.getAddress()).eql(
        "0x9E72ED5478fEdB6875e244Ad8F6F6f3A2dCA5549"
      );
    },
    { timeout: 100000 }
  );

  it(
    "getNonce returns valid nonce",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectIdWithGasSponsorship,
        owner: mockOwner,
        opts: {
          accountConfig: {
            index: 4n,
          },
        },
      });

      const signer2 = ecdsaProvider.getAccount();

      expect(await signer2.getNonce()).eql(1n);
    },
    { timeout: 1000000 }
  );

  it("encodeExecute returns valid encoded hash", async () => {
    let ecdsaProvider = await ECDSAProvider.init({
      projectId: config.projectId,
      owner: mockOwner,
    });
    const signer = ecdsaProvider.getAccount();
    expect(
      await signer.encodeExecute(
        "0xA7b2c01A5AfBCf1FAB17aCf95D8367eCcFeEb845",
        1n,
        "0x234"
      )
    ).eql(
      "0x51945447000000000000000000000000a7b2c01a5afbcf1fab17acf95d8367eccfeeb84500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000022340000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("encodeExecuteDelegate returns valid encoded hash", async () => {
    let ecdsaProvider = await ECDSAProvider.init({
      projectId: config.projectId,
      owner: mockOwner,
    });
    const signer = ecdsaProvider.getAccount();
    expect(
      await signer.encodeExecuteDelegate(
        "0xA7b2c01A5AfBCf1FAB17aCf95D8367eCcFeEb845",
        1n,
        "0x234"
      )
    ).eql(
      "0x51945447000000000000000000000000a7b2c01a5afbcf1fab17acf95d8367eccfeeb84500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000022340000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it(
    "signMessageWith6492 should correctly sign the message",
    async () => {
      const messageToBeSigned: Hex =
        "0xa70d0af2ebb03a44dcd0714a8724f622e3ab876d0aa312f0ee04823285d6fb1b";
      const magicBytes =
        "6492649264926492649264926492649264926492649264926492649264926492";
      const ownerSignedMessage =
        "0xdad9efc9364e94756f6b16380b7d60c24a14526946ddaa52ef181e7ad065eaa146c9125b7ee62258caad708f57344cfc80d74bd69c0c1e95d75e7c7645c71e401b";
      const factoryCode =
        "0x296601cd0000000000000000000000000da6a956b9488ed4dd761e59f52fdc6c8068e6b50000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000084d1f57894000000000000000000000000d9ab5096a832b9ce79914329daee236f8eea039000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000014abcfC3DB1e0f5023F5a4f40c03D149f316E6A5cc00000000000000000000000000000000000000000000000000000000000000000000000000000000";
      const signature =
        encodeAbiParameters(parseAbiParameters("address, bytes, bytes"), [
          config.accountFactoryAddress,
          factoryCode,
          ownerSignedMessage,
        ]) + magicBytes;

      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
      });

      expect(
        await ecdsaProvider.request({
          method: "personal_sign",
          params: [messageToBeSigned, await ecdsaProvider.getAddress()],
        })
      ).toBe(ownerSignedMessage);

      ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
        opts: {
          accountConfig: {
            index: 10n,
          },
        },
      });

      expect(
        await ecdsaProvider.request({
          method: "personal_sign",
          params: [messageToBeSigned, await ecdsaProvider.getAddress()],
        })
      ).toBe(signature);
    },
    { timeout: 100000 }
  );

  it(
    "signMessage should correctly sign the message",
    async () => {
      const messageToBeSigned: Hex =
        "0xa70d0af2ebb03a44dcd0714a8724f622e3ab876d0aa312f0ee04823285d6fb1b";

      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
      });

      const signer = ecdsaProvider.getAccount();

      expect(await signer.signMessage(messageToBeSigned)).toBe(
        "0x002e1c0f007a5d2723b28da3165ee45c6fc49bf1fdf3cfeaef66de31dd90248647781142beadcb8524bd5a9be0da455881bfa003e3334fffd2ee6d648a78e06d1c"
      );

      ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
        opts: {
          accountConfig: {
            index: 1000n,
          },
        },
      });

      const signer2 = ecdsaProvider.getAccount();

      expect(await signer2.signMessage(messageToBeSigned)).toBe(
        "0x002e1c0f007a5d2723b28da3165ee45c6fc49bf1fdf3cfeaef66de31dd90248647781142beadcb8524bd5a9be0da455881bfa003e3334fffd2ee6d648a78e06d1c"
      );
    },
    { timeout: 100000 }
  );

  // NOTE - this test case will fail if the gas fee is sponsored
  it(
    "sendUserOperation should fail to execute if gas fee not present",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner,
        usePaymaster: false,
        opts: {
          accountConfig: {
            index: 1001n,
          },
        },
      });

      const result = ecdsaProvider.sendUserOperation({
        target: "0xA02CDdFa44B8C01b4257F54ac1c43F75801E8175",
        data: "0x",
      });

      await expect(result).rejects;
    },
    { timeout: 100000 }
  );

  //NOTE - this test case will only work if you
  // have deposited some matic balance for counterfactual address at entrypoint

  it(
    "sendUserOperation should execute properly",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner,
        usePaymaster: false,
        bundlerProvider: "STACKUP",
        opts: {
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });

      const mintData = encodeFunctionData({
        abi: TEST_ERC20Abi,
        args: [await ecdsaProvider.getAddress(), 700000000000000000n],
        functionName: "mint",
      });
      console.log(
        await ecdsaProvider.buildUserOperation({
          target: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
          data: mintData,
          value: 0n,
        })
      );
      const result = ecdsaProvider.sendUserOperation({
        target: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
        data: mintData,
        value: 0n,
      });
      await expect(result).resolves.not.toThrowError();
      await ecdsaProvider.waitForUserOperationTransaction(
        (
          await result
        ).hash as Hash
      );
    },
    { timeout: 100000 }
  );

  it(
    "sponsored sendUserOperation should execute properly",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectIdWithGasSponsorship,
        owner,
        opts: {
          accountConfig: {
            index: 1003n,
          },
          paymasterConfig: {
            policy: "VERIFYING_PAYMASTER",
          },
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });

      //to fix bug in old versions
      await ecdsaProvider.getAccount().getInitCode();

      const mintData = encodeFunctionData({
        abi: TEST_ERC20Abi,
        args: [await ecdsaProvider.getAddress(), 700000000000000000n],
        functionName: "mint",
      });
      const balanceBefore = await client.readContract({
        address: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [await ecdsaProvider.getAddress()],
      });
      const result = ecdsaProvider.sendUserOperation({
        target: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
        data: mintData,
        value: 0n,
      });
      await expect(result).resolves.not.toThrowError();
      await ecdsaProvider.waitForUserOperationTransaction(
        (
          await result
        ).hash as Hash
      );
      const balanceAfter = await client.readContract({
        address: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [await ecdsaProvider.getAddress()],
      });
      expect(balanceAfter).to.eq(balanceBefore + 700000000000000000n);
    },
    { timeout: 100000 }
  );

  //NOTE - this test case will only work if you
  // have deposited some Stackup TEST_ERC20 balance for counterfactual address at entrypoint

  it(
    "should pay for single transaction with ERC20 token",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner,
        opts: {
          paymasterConfig: {
            policy: "TOKEN_PAYMASTER",
            gasToken: "TEST_ERC20",
          },
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });

      const balanceBefore = await client.readContract({
        address: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [await ecdsaProvider.getAddress()],
      });
      const mintData = encodeFunctionData({
        abi: TEST_ERC20Abi,
        args: [await ecdsaProvider.getAddress(), 700000000000000000n],
        functionName: "mint",
      });
      const result = ecdsaProvider.sendUserOperation({
        target: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
        data: mintData,
        value: 0n,
      });

      await expect(result).resolves.not.toThrowError();

      await ecdsaProvider.waitForUserOperationTransaction(
        (
          await result
        ).hash as Hash
      );
      const balanceAfter = await client.readContract({
        address: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [await ecdsaProvider.getAddress()],
      });
      expect(balanceAfter.toString(16)).to.not.eq(
        (balanceBefore + 700000000000000000n).toString(16)
      );
    },
    { timeout: 100000 }
  );

  //NOTE - this test case will only work if you
  // have deposited some Stackup TEST_ERC20 balance for counterfactual address at entrypoint

  it(
    "should pay for batch transaction with ERC20 token",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner,
        opts: {
          paymasterConfig: {
            policy: "TOKEN_PAYMASTER",
            gasToken: "TEST_ERC20",
          },
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });

      //to fix bug in old versions
      await ecdsaProvider.getAccount().getInitCode();

      const mintData = encodeFunctionData({
        abi: TEST_ERC20Abi,
        args: [await ecdsaProvider.getAddress(), 133700000000000000n],
        functionName: "mint",
      });
      const transferData = encodeFunctionData({
        abi: TEST_ERC20Abi,
        args: [await owner.getAddress(), 133700000000n],
        functionName: "transfer",
      });
      const balanceBefore = await client.readContract({
        address: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [await ecdsaProvider.getAddress()],
      });
      const result = ecdsaProvider.sendUserOperation([
        {
          target: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
          data: mintData,
          value: 0n,
        },
        {
          target: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
          data: transferData,
          value: 0n,
        },
      ]);
      await expect(result).resolves.not.toThrowError();
      const balanceAfter = await client.readContract({
        address: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [await ecdsaProvider.getAddress()],
      });
      expect(Number(balanceAfter.toString())).to.lt(
        Number((balanceBefore + 700000000000000000n - 133700000000n).toString())
      );
    },
    { timeout: 100000 }
  );

  //non core functions
  it(
    "should correctly identify whether account is deployed",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
      });
      const signer = ecdsaProvider.getAccount();
      //contract already deployed
      expect(await signer.isAccountDeployed()).eql(true);

      ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
        opts: {
          accountConfig: {
            index: 3n,
          },
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });
      const signer2 = ecdsaProvider.getAccount();

      //contract already deployed
      expect(await signer2.isAccountDeployed()).eql(true);

      ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
        opts: {
          accountConfig: {
            index: 5n,
          },
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });
      const signer3 = ecdsaProvider.getAccount();

      //contract not deployed
      expect(await signer3.isAccountDeployed()).eql(false);

      ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
        opts: {
          accountConfig: {
            index: 6n,
          },
        },
      });

      const signer4 = ecdsaProvider.getAccount();
      //contract not deployed
      expect(await signer4.isAccountDeployed()).eql(false);
    },
    { timeout: 100000 }
  );
});
