import { beforeAll, describe, expect, test } from "bun:test";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  type KernelAccountClient,
  type KernelSmartAccountImplementation,
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import dotenv from "dotenv";
import {
  http,
  type Address,
  type Chain,
  type GetContractReturnType,
  type Hex,
  type PrivateKeyAccount,
  type PublicClient,
  type Transport,
  createPublicClient,
  zeroAddress,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { holesky } from "viem/chains";

import { KERNEL_V3_2 } from "@zerodev/sdk/constants";
import type { SmartAccount } from "viem/account-abstraction";
import {
  getEntryPoint,
  getZeroDevPaymasterClient,
  validateEnvironmentVariables,
  waitForNonceUpdate,
} from "./utils/common.js";
import { getKernelAccountClient } from "./utils/ecdsaUtils.js";
import { signerToGizaValidator } from "../../../plugins/giza";

dotenv.config();

const requiredEnvVars = [
  "FACTORY_ADDRESS",
  "TEST_PRIVATE_KEY",
  "RPC_URL",
  "ENTRYPOINT_ADDRESS",
  "GREETER_ADDRESS",
  "ZERODEV_PROJECT_ID",
  "ZERODEV_BUNDLER_RPC_HOST",
  "ZERODEV_PAYMASTER_RPC_HOST",
];

validateEnvironmentVariables(requiredEnvVars);

const ETHEREUM_ADDRESS_LENGTH = 42;
const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
const SIGNATURE_LENGTH = 174;
const SIGNATURE_REGEX = /^0x[0-9a-fA-F]{172}$/;
const TX_HASH_LENGTH = 66;
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;
const TEST_TIMEOUT = 1000000;
const zeroDevRpc = `https://rpc.zerodev.app/api/v3/${ZERODEV_PROJECT_ID}/chain/${holesky.id}`;

describe("Giza kernel Account", () => {
  let account: SmartAccount<KernelSmartAccountImplementation>;
  let accountWithoutSudo: SmartAccount<KernelSmartAccountImplementation>;
  let ownerAccount: PrivateKeyAccount;
  let publicClient: PublicClient;
  let kernelClient: KernelAccountClient<
    Transport,
    Chain,
    SmartAccount<KernelSmartAccountImplementation>
  >;
  let kernelClientWithoutSudo: KernelAccountClient<
    Transport,
    Chain,
    SmartAccount<KernelSmartAccountImplementation>
  >;
  let gizaValidator: KernelValidator<"GizaValidator">;

  beforeAll(async () => {
    const ownerPrivateKey =
      generatePrivateKey() ?? process.env.TEST_PRIVATE_KEY;
    const gizaPrivateKey = generatePrivateKey();
    if (!ownerPrivateKey) {
      throw new Error("TEST_PRIVATE_KEY is not set");
    }
    ownerAccount = privateKeyToAccount(ownerPrivateKey as Hex);
    const gizaAccount = privateKeyToAccount(gizaPrivateKey as Hex);
    publicClient = createPublicClient({
      transport: http(),
      chain: holesky,
    });
    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
      entryPoint: getEntryPoint(),
      signer: ownerAccount,
      kernelVersion: KERNEL_V3_2,
    });
    gizaValidator = await signerToGizaValidator(publicClient, {
      entryPoint: getEntryPoint(),
      signer: gizaAccount,
      kernelVersion: KERNEL_V3_2,
    });
    account = await createKernelAccount(publicClient, {
      entryPoint: getEntryPoint(),

      plugins: {
        sudo: ecdsaValidator,
        regular: gizaValidator,
      },
      kernelVersion: KERNEL_V3_2,
    });
    console.log("account: ", account.address);
    accountWithoutSudo = await createKernelAccount(publicClient, {
      entryPoint: getEntryPoint(),
      plugins: {
        regular: gizaValidator,
      },
      kernelVersion: KERNEL_V3_2,
      address: account.address,
    });

    const zeroDevPaymaster = createZeroDevPaymasterClient({
      chain: holesky,
      transport: http(zeroDevRpc),
    });
    kernelClient = await createKernelAccountClient({
      account,
      chain: holesky,
      paymaster: zeroDevPaymaster,
      bundlerTransport: http(zeroDevRpc),
    });
    kernelClientWithoutSudo = await createKernelAccountClient({
      account: accountWithoutSudo,
      chain: holesky,
      paymaster: zeroDevPaymaster,
      bundlerTransport: http(zeroDevRpc),
    });
  });

  test("Account address should be a valid Ethereum address", async () => {
    expect(account.address).toBeString();
    expect(account.address).toHaveLength(ETHEREUM_ADDRESS_LENGTH);
    expect(account.address).toMatch(ETHEREUM_ADDRESS_REGEX);
    expect(account.address).not.toEqual(zeroAddress);
    console.log("account.address: ", account.address);
  });

  test(
    "Client send UserOp to install giza validator",
    async () => {
      const userOpHash = await kernelClient.sendUserOperation({
        callData: await kernelClient.account.encodeCalls([
          {
            to: zeroAddress,
            value: 0n,
            data: "0x",
          },
        ]),
      });
      console.log("userOpHash: ", userOpHash);
      expect(userOpHash).toHaveLength(66);
      const receipt = await kernelClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });
      expect(receipt.receipt.status).toBe("success");
      console.log(
        "receipt: ",
        `${holesky.blockExplorers.default.url}/tx/${receipt.receipt.transactionHash}`
      );

      await waitForNonceUpdate();
    },
    TEST_TIMEOUT
  );

  test(
    "Client send UserOp with installed giza validator without sudo validator",
    async () => {
      const userOpHash = await kernelClientWithoutSudo.sendUserOperation({
        callData: await kernelClientWithoutSudo.account.encodeCalls([
          { to: zeroAddress, value: 0n, data: "0x" },
        ]),
      });
      console.log("userOpHash: ", userOpHash);
      expect(userOpHash).toHaveLength(66);
      const receipt = await kernelClientWithoutSudo.waitForUserOperationReceipt(
        {
          hash: userOpHash,
        }
      );
      expect(receipt.receipt.status).toBe("success");
      console.log(
        "receipt: ",
        `${holesky.blockExplorers.default.url}/tx/${receipt.receipt.transactionHash}`
      );
    },
    TEST_TIMEOUT
  );
});
