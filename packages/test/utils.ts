import {
  createKernelSmartAccount,
} from "@zerodev/core/accounts";
import { SmartAccountClient, BundlerClient, createBundlerClient, createSmartAccountClient, getSenderAddress, getAccountNonce } from "permissionless"
import { SponsorUserOperationMiddleware } from "permissionless/actions/smartAccount"
import {
  createPimlicoBundlerClient,
  createPimlicoPaymasterClient,
} from "permissionless/clients/pimlico";
import { signerToEcdsaValidator } from "@zerodev/core/plugins";
import {
  http,
  Address,
  Hex,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  type WalletClient,
  type PublicClient,
  AbiItem,
  decodeEventLog,
  type Log
} from "viem";
import { privateKeyToAccount, type Account } from "viem/accounts";
import { goerli, type Chain } from "viem/chains";
import * as allChains from "viem/chains";
import { signerToSimpleSmartAccount, type SmartAccount} from "permissionless/accounts"
import { EntryPointAbi } from "./abis/EntryPoint.js";

export const getFactoryAddress = (): Address => {
  const factoryAddress = process.env.FACTORY_ADDRESS;
  if (!factoryAddress) {
      throw new Error("FACTORY_ADDRESS environment variable not set");
  }
  return factoryAddress as Address;
}

export const getPrivateKeyAccount = (): Account => {
  const privateKey = process.env.TEST_PRIVATE_KEY;
  if (!privateKey) {
      throw new Error("TEST_PRIVATE_KEY environment variable not set");
  }
  return privateKeyToAccount(privateKey as Hex);
}

export const getTestingChain = (): Chain => {
  const testChainId = process.env.TEST_CHAIN_ID;
  const chainId = testChainId ? parseInt(testChainId, 10) : goerli.id;
  const chain = Object.values(allChains).find((c) => c.id === chainId);
  if (!chain) {
    throw new Error(`Chain with id ${chainId} not found`);
  }
  return chain;
};

export const getSignerToSimpleSmartAccount = async (): Promise<SmartAccount> => {
  const privateKey = process.env.TEST_PRIVATE_KEY as Hex;
  if (!privateKey) {
    throw new Error("TEST_PRIVATE_KEY environment variable not set");
  }

  const publicClient = await getPublicClient();
  const signer = privateKeyToAccount(privateKey);

  return signerToSimpleSmartAccount(publicClient, {
    entryPoint: getEntryPoint(),
    factoryAddress: getFactoryAddress(),
    signer: { ...signer, source: "local" as "local" | "external" },
  });
};

export const getSignerToEcdsaKernelAccount = async (): Promise<SmartAccount> => {
  const privateKey = process.env.TEST_PRIVATE_KEY as Hex;
  if (!privateKey) {
    throw new Error("TEST_PRIVATE_KEY environment variable not set");
  }

  const publicClient = await getPublicClient();
  const signer = privateKeyToAccount(privateKey);
  const ecdsaValidatorPlugin = await signerToEcdsaValidator(publicClient, {
    entryPoint: getEntryPoint(),
    signer: { ...signer, source: "local" as "local" | "external" },
  });

  return createKernelSmartAccount(publicClient, {
    entryPoint: getEntryPoint(),
    plugin: ecdsaValidatorPlugin,
  });
};

// export const getSignerToSafeSmartAccount = async (args?: {
//   setupTransactions?: {
//     to: Address;
//     data: Address;
//     value: bigint;
//   }[];
// }) => {
//   if (!process.env.TEST_PRIVATE_KEY)
//     throw new Error("TEST_PRIVATE_KEY environment variable not set");

//   const publicClient = await getPublicClient();

//   const signer = privateKeyToAccount(process.env.TEST_PRIVATE_KEY as Hex);

//   return await signerToSafeSmartAccount(publicClient, {
//     entryPoint: getEntryPoint(),
//     signer: signer,
//     safeVersion: "1.4.1",
//     saltNonce: 100n,
//     setupTransactions: args?.setupTransactions,
//   });
// };
// export const getSignerToEcdsaKernelAccount = async () => {
//   if (!process.env.TEST_PRIVATE_KEY)
//     throw new Error("TEST_PRIVATE_KEY environment variable not set");

//   const publicClient = await getPublicClient();
//   const signer = privateKeyToAccount(process.env.TEST_PRIVATE_KEY as Hex);

//   return await signerToEcdsaKernelSmartAccount(publicClient, {
//     entryPoint: getEntryPoint(),
//     signer: signer,
//     index: 100n,
//   });
// };

export const getSmartAccountClient = async ({
  account,
  sponsorUserOperation,
}: SponsorUserOperationMiddleware & { account?: SmartAccount } = {}): Promise<SmartAccountClient> => {
  const pimlicoApiKey = process.env.PIMLICO_API_KEY;
  const pimlicoBundlerRpcHost = process.env.PIMLICO_BUNDLER_RPC_HOST;
  if (!pimlicoApiKey) {
    throw new Error("PIMLICO_API_KEY environment variable not set");
  }
  if (!pimlicoBundlerRpcHost) {
    throw new Error("PIMLICO_BUNDLER_RPC_HOST environment variable not set");
  }

  const chain = getTestingChain();
  const resolvedAccount = account ?? await getSignerToSimpleSmartAccount();

  return createSmartAccountClient({
    account: resolvedAccount,
    chain,
    transport: http(`${pimlicoBundlerRpcHost}?apikey=${pimlicoApiKey}`),
    sponsorUserOperation,
  });
};

export const getEoaWalletClient = (): WalletClient => {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    throw new Error("RPC_URL environment variable not set");
  }

  return createWalletClient({
    account: getPrivateKeyAccount(),
    chain: getTestingChain(),
    transport: http(rpcUrl),
  });
};

export const getEntryPoint = (): Address => {
  const entryPointAddress = process.env.ENTRYPOINT_ADDRESS as Address;
  if (!entryPointAddress) {
    throw new Error("ENTRYPOINT_ADDRESS environment variable not set");
  }
  return entryPointAddress;
};

export const getPublicClient = async (): Promise<PublicClient> => {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    throw new Error("RPC_URL environment variable not set");
  }

  const publicClient = createPublicClient({
    transport: http(rpcUrl),
  });

  const chainId = await publicClient.getChainId();
  const testingChain = getTestingChain();

  if (chainId !== testingChain.id) {
    throw new Error(`Testing Chain ID (${testingChain.id}) not supported by RPC URL`);
  }

  return publicClient;
};

export const getBundlerClient = (): BundlerClient => {
  const pimlicoApiKey = process.env.PIMLICO_API_KEY;
  const pimlicoBundlerRpcHost = process.env.PIMLICO_BUNDLER_RPC_HOST;
  if (!pimlicoApiKey || !pimlicoBundlerRpcHost) {
    throw new Error("PIMLICO_API_KEY and PIMLICO_BUNDLER_RPC_HOST environment variables must be set");
  }

  const chain = getTestingChain();

  return createBundlerClient({
    chain,
    transport: http(`${pimlicoBundlerRpcHost}?apikey=${pimlicoApiKey}`),
  });
};

export const getPimlicoBundlerClient = () => {
  if (!process.env.PIMLICO_BUNDLER_RPC_HOST)
    throw new Error("PIMLICO_BUNDLER_RPC_HOST environment variable not set");
  if (!process.env.PIMLICO_API_KEY)
    throw new Error("PIMLICO_API_KEY environment variable not set");
  const pimlicoApiKey = process.env.PIMLICO_API_KEY;

  const chain = getTestingChain();

  return createPimlicoBundlerClient({
    chain: chain,
    transport: http(
      `${process.env.PIMLICO_BUNDLER_RPC_HOST}?apikey=${pimlicoApiKey}`
    ),
  });
};

export const getPimlicoPaymasterClient = () => {
  if (!process.env.PIMLICO_PAYMASTER_RPC_HOST)
    throw new Error("PIMLICO_PAYMASTER_RPC_HOST environment variable not set");
  if (!process.env.PIMLICO_API_KEY)
    throw new Error("PIMLICO_API_KEY environment variable not set");
  const pimlicoApiKey = process.env.PIMLICO_API_KEY;

  const chain = getTestingChain();

  return createPimlicoPaymasterClient({
    chain: chain,
    transport: http(
      `${process.env.PIMLICO_PAYMASTER_RPC_HOST}?apikey=${pimlicoApiKey}`
    ),
  });
};

export const isAccountDeployed = async (accountAddress: Address): Promise<boolean> => {
  const publicClient = await getPublicClient();
  const contractCode = await publicClient.getBytecode({ address: accountAddress });
  return (contractCode?.length ?? 0) > 2;
};

export const getDummySignature = (): Hex => {
  return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
};

export const getOldUserOpHash = (): Hex => {
  return "0xe9fad2cd67f9ca1d0b7a6513b2a42066784c8df938518da2b51bb8cc9a89ea34";
};

export const waitForNonceUpdate = async (): Promise<void> => {
  const tenSeconds = 10000;
  await new Promise(resolve => setTimeout(resolve, tenSeconds));
};

export const generateApproveCallData = (paymasterAddress: Address): Hex => {
  const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  const approveAbi: AbiItem[] = [
    {
      inputs: [
        { name: "_spender", type: "address" },
        { name: "_value", type: "uint256" },
      ],
      name: "approve",
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  return encodeFunctionData({
    abi: approveAbi,
    functionName: "approve",
    args: [paymasterAddress, maxUint256],
  });
};


export const findUserOperationEvent = (logs: Log[]): boolean => {
	return logs.some(log => {
		try {
			const event = decodeEventLog({
				abi: EntryPointAbi,
				...log,
			});
			return event.eventName === "UserOperationEvent";
		} catch {
			return false;
		}
	});
};