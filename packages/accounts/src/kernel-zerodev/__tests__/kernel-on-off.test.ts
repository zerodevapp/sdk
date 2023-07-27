import {
  decodeFunctionData,
  encodeFunctionData,
  getFunctionSelector,
  recoverAddress,
  type Hash,
  type Hex,
} from "viem";
import { ZeroDevLocalAccountSigner } from "../signer/zd-local-account.js";
import { ECDSAProvider, OnOffProvider } from "../validator-provider/index.js";
import { ValidatorMode } from "../validator/base.js";
import { config } from "./kernel-account.test";
import { ECDSAValidatorAbi } from "../abis/ESCDAValidatorAbi.js";
import { utils } from "ethers";
import { TEST_ERC20Abi } from "../abis/Test_ERC20Abi.js";

describe.only("Kernel On Off Tests", () => {
  const owner = ZeroDevLocalAccountSigner.privateKeyToAccountSigner(
    config.privateKey
  );
  const validatorAddress = "0xe8B8CC83D7A9Eea0F3548bd2Df5Bebe94cd57886";
  const executorAddress = "0x13dd285022D1D12635823952d199dB39467a457E";
  //   const executorAddress = "0xE9Bda50FfD15e06b821268910adc612Bd31DDa2f";
  const nftAddress = "0x34bE7f35132E97915633BC1fc020364EA5134863";
  it(
    "should execute successfully",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectIdWithGasSponsorship,
        owner,
        opts: {
          paymasterConfig: {
            policy: "VERIFYING_PAYMASTER",
          },
          accountConfig: {
            index: 30012n,
          },
        },
      });
      let accountAddress = await ecdsaProvider.getAccount().getAddress();
      console.log("accountAddress", accountAddress);
      const resp = await ecdsaProvider.sendUserOperation({
        target: await owner.getAddress(),
        data: "0x",
      });
      const res = await ecdsaProvider.waitForUserOperationTransaction(
        resp.hash as Hash
      );
      console.log("res deploy", res);
      const testERC20mintData = encodeFunctionData({
        abi: TEST_ERC20Abi,
        args: [await ecdsaProvider.getAddress(), "700000000000000000"],
        functionName: "mint",
      });
      const result = await ecdsaProvider.sendUserOperation({
        target: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
        data: testERC20mintData,
        value: 0n,
      });
      const mintRes = await ecdsaProvider.waitForUserOperationTransaction(
        result.hash as Hash
      );
      console.log("mint res deploy", mintRes);

      let onOffProvider = await OnOffProvider.init({
        projectId: config.projectIdWithGasSponsorship,
        owner,
        opts: {
          providerConfig: {
            opts: {
              txMaxRetries: 20,
            },
          },
          paymasterConfig: {
            policy: "VERIFYING_PAYMASTER",
            //   paymasterProvider: "ALCHEMY",
            //   onlySendSponsoredTransaction: true,
          },
          accountConfig: {
            accountAddress,
          },
          validatorConfig: {
            validatorAddress,
            mode: ValidatorMode.plugin,
            executor: executorAddress,
          },
        },
      });

      const enableSig = await ecdsaProvider
        .getAccount()
        .validator?.approveExecutor(
          accountAddress,
          getFunctionSelector("transfer20Action(address, uint256, address)"),
          executorAddress,
          0,
          0,
          onOffProvider.getAccount().validator!
        );
      console.log("enableSig", enableSig);
      console.log("split: ", utils.splitSignature(enableSig!));

      const { functionName, args } = decodeFunctionData({
        abi: ECDSAValidatorAbi,
        data: "0x333daf92f822264dff312c59d978133f5af08c2b87ff13544af60b216047cf0a46db0425000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000416b4a21e8e5f72a9cbb3e32816049934301a381f8dce1680b084c0cb3cb49cf35157711cbaf69fe2b1776e7309efc7789708d822dcab314e79875d90049848aa41b00000000000000000000000000000000000000000000000000000000000000",
      });
      console.log("functionName", functionName);
      console.log("args", args);

      const address = await recoverAddress({
        hash: "0x53a5115ce69265053e2a0b1c98fa3cf91dbeedcbf4ece4af178751e68743500a" as Hash,
        signature: enableSig as Hex,
      });
      console.log("address", address);
      console.log("owner address", await owner.getAddress());

      onOffProvider
        .getAccount()
        .validator?.setEnableSignature(enableSig! as Hex);

      const contractAbi = [
        {
          inputs: [
            { internalType: "address", name: "_token", type: "address" },
            { internalType: "address", name: "_to", type: "address" },
          ],
          name: "mintERC721Action",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      const mintData = encodeFunctionData({
        abi: contractAbi,
        args: [nftAddress, accountAddress],
        functionName: "mintERC721Action",
      });
      const trData = encodeFunctionData({
        abi: [
          {
            inputs: [
              {
                internalType: "address",
                name: "_token",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "_amount",
                type: "uint256",
              },
              {
                internalType: "address",
                name: "_to",
                type: "address",
              },
            ],
            name: "transfer20Action",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        args: [
          "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
          3n,
          "0x98941094d282ddA631031283EA70ec9e81246638",
        ],
        functionName: "transfer20Action",
      });
      console.log("mintData", mintData);
      try {
        const temp = await onOffProvider.sendUserOperation({
          target: accountAddress,
          data: trData,
        });
        console.log("temp", temp);
        const res = await onOffProvider.waitForUserOperationTransaction(
          temp.hash as Hash
        );
        console.log("res", res);
      } catch (error) {
        console.log("error", error);
      }

      // const result = await onOffProvider.sendUserOperation({
      //   target: accountAddress,
      //   data: mintData,
      // });
      // console.log("minting result", result);
      // const result2 = await onOffProvider.waitForUserOperationTransaction(
      //   result.hash as Hash
      // );
      // console.log("wait", result2);
    },
    { timeout: 10000000 }
  );
});
