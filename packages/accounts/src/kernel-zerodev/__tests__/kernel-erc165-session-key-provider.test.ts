import {
  createPublicClient,
  http,
  type Hex,
  getFunctionSelector,
  encodeFunctionData,
  getContract,
  createWalletClient,
} from "viem";
import { polygonMumbai } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { config } from "./kernel-account.test.js";
import { ECDSAProvider } from "../validator-provider/index.js";
import { TOKEN_ACTION } from "../constants.js";
import { ZeroDevLocalAccountSigner } from "../signer/zd-local-account.js";
import { ValidatorMode } from "../validator/base.js";
import { Test_ERC721Abi } from "../abis/Test_ERC721Abi.js";
import { ERC165SessionKeyProvider } from "../validator-provider/erc165-session-key-provider.js";
import { TokenActionsAbi } from "../abis/TokenActionsAbi.js";
import type { SmartAccountSigner } from "@alchemy/aa-core";

// [TODO] - Organize the test code properly
describe("Kernel ERC165SessionKey Provider Test", async () => {
  const Test_ERC721Address = "0x811646a83850B25Bfc423d71D345cC85791CbeF6";
  const dummyPrivateKey =
    "0x022430a80f723d8789f0d4fb346bdd013b546e4b96fcacf8aceca2b1a65a19dc";
  const owner = ZeroDevLocalAccountSigner.privateKeyToAccountSigner(
    config.privateKey
  );
  const secondOwner =
    ZeroDevLocalAccountSigner.privateKeyToAccountSigner(dummyPrivateKey);
  console.log("secondOwner", secondOwner);
  const randomOwner = ZeroDevLocalAccountSigner.privateKeyToAccountSigner(
    generatePrivateKey()
  );
  console.log("randomOwner", randomOwner);

  const client = createPublicClient({
    chain: polygonMumbai,
    transport: http("https://rpc.ankr.com/polygon_mumbai"),
  });
  const walletClient = createWalletClient({
    account: privateKeyToAccount(config.privateKey),
    chain: polygonMumbai,
    transport: http("https://rpc.ankr.com/polygon_mumbai"),
  });
  const selector = getFunctionSelector(
    "transferERC721Action(address, uint256, address)"
  );
  let erc165SessionKeyProvider: ERC165SessionKeyProvider;
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
  const test_ERC721 = getContract({
    abi: Test_ERC721Abi,
    address: Test_ERC721Address,
    walletClient,
  });

  function getRandomNftId(): bigint {
    return BigInt(
      Math.floor(Math.random() * 115792089237316195423570985008687)
    );
  }

  async function createProvider(sessionKey: SmartAccountSigner, nftId: bigint) {
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

    const mintTx = await test_ERC721.write.mint([accountAddress, nftId]);
    console.log("mintTx", mintTx);

    erc165SessionKeyProvider = await ERC165SessionKeyProvider.init({
      projectId: config.projectIdWithGasSponsorship,
      owner,
      sessionKey,
      sessionKeyData: {
        selector,
        erc165InterfaceId: "0x80ac58cd",
        validAfter: 0,
        validUntil: 0,
        addressOffset: 16,
      },
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
          executor: TOKEN_ACTION,
          selector,
        },
      },
    });

    const enableSig = await ecdsaProvider
      .getValidator()
      .approveExecutor(
        accountAddress,
        selector,
        TOKEN_ACTION,
        0,
        0,
        erc165SessionKeyProvider.getAccount().getValidator()
      );

    erc165SessionKeyProvider.getValidator().setEnableSignature(enableSig);
  }

  it(
    "should execute the erc721 token transfer action using ERC165SessionKey",
    async () => {
      const nftId = getRandomNftId();
      await createProvider(secondOwner, nftId);
      let result, tx;
      try {
        result = await erc165SessionKeyProvider.sendUserOperation({
          target: accountAddress,
          data: encodeFunctionData({
            abi: TokenActionsAbi,
            functionName: "transferERC721Action",
            args: [Test_ERC721Address, nftId, await secondOwner.getAddress()],
          }),
        });
        console.log(result);
        tx = await erc165SessionKeyProvider.waitForUserOperationTransaction(
          result.hash as Hex
        );
      } catch (e) {
        console.log(e);
      }
      console.log(tx);
      const ownerOf = await client.readContract({
        address: Test_ERC721Address,
        abi: Test_ERC721Abi,
        functionName: "ownerOf",
        args: [nftId],
      });
      console.log("ownerOf", ownerOf);
      expect(ownerOf).to.equal(await secondOwner.getAddress());
    },
    { timeout: 1000000 }
  );

  it(
    "should execute the erc721 token transfer action using new session key",
    async () => {
      const nftId = getRandomNftId();
      await createProvider(randomOwner, nftId);
      let result, tx;
      try {
        result = await erc165SessionKeyProvider.sendUserOperation({
          target: accountAddress,
          data: encodeFunctionData({
            abi: TokenActionsAbi,
            functionName: "transferERC721Action",
            args: [Test_ERC721Address, nftId, await secondOwner.getAddress()],
          }),
        });
        console.log(result);
        tx = await erc165SessionKeyProvider.waitForUserOperationTransaction(
          result.hash as Hex
        );
      } catch (e) {
        console.log(e);
      }
      console.log(tx);
      const ownerOf = await client.readContract({
        address: Test_ERC721Address,
        abi: Test_ERC721Abi,
        functionName: "ownerOf",
        args: [nftId],
      });
      console.log("ownerOf", ownerOf);
      expect(ownerOf).to.equal(await secondOwner.getAddress());
    },
    { timeout: 1000000 }
  );
});
