import { beforeAll, describe, expect, test } from "bun:test";
import dotenv from "dotenv";
import {
  SignTransactionNotSupportedBySmartAccount,
  signerToSessionKeyValidator,
  // type KernelPlugin,
  toKernelSmartAccount,
} from "@zerodev/core/accounts";
import { Address, type PublicClient, getFunctionSelector, http, getAbiItem, Hex, decodeEventLog, getContract, zeroAddress, createPublicClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { EntryPointAbi } from "./abis/EntryPoint.js";
import { GreeterAbi, GreeterBytecode } from "./abis/Greeter.js";
import {
  getBundlerClient,
  getEntryPoint,
  getPimlicoPaymasterClient,
  getPublicClient,
  getSignerToEcdsaKernelAccount,
  getSmartAccountClient,
  waitForNonceUpdate,
} from "./utils.js";
import { KernelAccountAbi } from "../core/accounts/kernel/abi/KernelAccountAbi.js";
import { polygonMumbai } from "viem/chains";
import { KERNEL_ADDRESSES } from "@zerodev/core/accounts/kernel/signerToEcdsaKernelSmartAccount.js";


dotenv.config();
const Test_ERC20Address = "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B";
const dummyPrivateKey =
  "0x022430a80f723d8789f0d4fb346bdd013b546e4b96fcacf8aceca2b1a65a19dc";
const owner = privateKeyToAccount(process.env.privateKey as Hex);
const secondOwner =
  privateKeyToAccount(dummyPrivateKey);
const randomOwner = privateKeyToAccount(
  generatePrivateKey()
);

const client = createPublicClient({
  chain: polygonMumbai,
  transport: http(process.env.RPC_URL as string),
});
const transfer20ActionSelector = getFunctionSelector(
  "transfer20Action(address, uint256, address)"
);
const executeSelector = getFunctionSelector(
  getAbiItem({
    abi: KernelAccountAbi,
    name: "execute",
  })
);
const executeBatchSelector = getFunctionSelector(
  getAbiItem({
    abi: KernelAccountAbi,
    name: "executeBatch",
  })
);

describe("Session Key kernel Account", () => {
  let factoryAddress: Address;
  let sessionKeyValidatorPlugin;
  let smartAccountClient;
  let publicClient: PublicClient;
  let testPrivateKey: Hex;
  let accountAddress: Address;
  beforeAll(async () => {
    if (!process.env.PIMLICO_API_KEY) {
      throw new Error("PIMLICO_API_KEY environment variable not set");
    }
    if (!process.env.STACKUP_API_KEY) {
      throw new Error("STACKUP_API_KEY environment variable not set");
    }
    if (!process.env.FACTORY_ADDRESS) {
      throw new Error("FACTORY_ADDRESS environment variable not set");
    }
    if (!process.env.TEST_PRIVATE_KEY) {
      throw new Error("TEST_PRIVATE_KEY environment variable not set");
    }
    if (!process.env.RPC_URL) {
      throw new Error("RPC_URL environment variable not set");
    }
    if (!process.env.ENTRYPOINT_ADDRESS) {
      throw new Error("ENTRYPOINT_ADDRESS environment variable not set");
    }

    if (!process.env.GREETER_ADDRESS) {
      throw new Error("ENTRYPOINT_ADDRESS environment variable not set");
    }
    publicClient = createPublicClient({
      chain: polygonMumbai,
      transport: http(process.env.RPC_URL as string),
    });

    const signer = privateKeyToAccount(testPrivateKey);
    sessionKeyValidatorPlugin = await signerToSessionKeyValidator(publicClient, {
      signer,
      entryPoint: getEntryPoint(),
      validatorData: {
        sessionKey: signerToSessionKeyValidator(),
        sessionKeyValidatorPluginAddress: Address,
        sessionKeyData: {
          merkleRoot: Bytes32,
          validAfter: 0,
          validUntil: 0,
          paymaster: Address,
          nonce: Uint256,
        }
        validatorAddress: KERNEL_ADDRESSES.SESSION_KEY_VALIDATOR
      },
    });

    smartAccountClient = await getSmartAccountClient({
      account: await getSignerToEcdsaKernelAccount(),
      // ... (other configurations)
    });

    accountAddress = await smartAccountClient.getAccount().getAddress();

  });

  /**
   * TODO: Should generify the basics test for every smart account & smart account client (address, signature, etc)
   */


  test("Enable session key", async () => {
    // Test logic for enabling a session key
  });

  test("Disable session key", async () => {
    // Test logic for disabling a session key
  });

  test("Validate signature", async () => {
    // Test logic for validating a signature
  });

  test("Sign user operation", async () => {
    // Test logic for signing a user operation
  });

  test("Enforce permissions", async () => {
    const sessionKeyValidatorPlugin = await getSignerToSessionKeyAccount();
    // Set up permissions for the session key
    // ...

    // Attempt to perform an action that should be allowed by the permissions
    // ...

    // Attempt to perform an action that should be denied by the permissions
    // ...
  });


});

export const getSignerToSessionKeyAccount = async () => {
  if (!process.env.TEST_PRIVATE_KEY)
    throw new Error("TEST_PRIVATE_KEY environment variable not set");

  const publicClient = await getPublicClient();

  const signer = privateKeyToAccount(process.env.TEST_PRIVATE_KEY as Hex);
  const validatorData = {
    sessionKey: signerToSessionKeyValidator(),
    sessionKeyValidatorPluginAddress: Address,
    sessionKeyData: {
      merkleRoot: Bytes32,
      validAfter: 0,
      validUntil: 0,
      paymaster: Address,
      nonce: Uint256,
    }
    validatorAddress: KERNEL_ADDRESSES.SESSION_KEY_VALIDATOR
  };
  const sessionKeyValidatorPlugin = await signerToSessionKeyValidator(publicClient, {
    validatorData,
    entryPoint: getEntryPoint(),
    signer: signer,
  });

  return await toKernelSmartAccount(publicClient, {
    entryPoint: getEntryPoint(),
    plugin: sessionKeyValidatorPlugin,
  });
};
