import {
  encodeFunctionData,
  type Account,
  Address,
  type Hex,
  pad,
  toHex,
  keccak256,
  getFunctionSelector,
  Client,
  Transport,
  Chain,
  http,
  type Abi,
  type GetAbiItemParameters,
  type InferFunctionName,
  type Narrow,
  createPublicClient,
  hexToSignature,
  signatureToHex,
  isHex,
} from "viem";
import { toAccount } from "viem/accounts";
import { signMessage, signTypedData } from "viem/actions";
import { decodeFunctionResult, getAbiItem } from "viem/utils";
import { SessionKeyValidatorAbi } from "../accounts/kernel/abi/SessionKeyValidatorAbi.js";
// import { KernelAccountAbi } from "../accounts/kernel/abi/KernelAccountAbi.js";

import { type Pretty } from "abitype/src/types.js";
import { MerkleTree } from "merkletreejs";
import { getUserOperationHash } from "../utils";
import { UserOperation } from "../types/userOperation.js";
import {
  type AbiParameter,
  type AbiFunction,
  type AbiParameterKind,
  type AbiParameterToPrimitiveType,
  type ExtractAbiFunction,
} from "abitype";
import { KernelPlugin } from "./types";
import {
  SmartAccountSigner,
  SignTransactionNotSupportedBySmartAccount,
} from "../accounts";
import { KERNEL_ADDRESSES } from "../accounts/kernel/signerToEcdsaKernelSmartAccount.js";
import { polygonMumbai } from "viem/chains";

const encodePermissionData = (permission: Permission): Hex => {
  let data = permission.target;
  if (permission.index !== undefined) {
    data += pad(toHex(permission.index), { size: 32 });
  }
  return "0x";
};

enum ParamOperator {
  EQUAL = 0,
  GREATER_THAN = 1,
  LESS_THAN = 2,
  GREATER_THAN_OR_EQUAL = 3,
  LESS_THAN_OR_EQUAL = 4,
  NOT_EQUAL = 5,
}

// type SessionNonces = {
//   lastNonce: bigint;
//   invalidNonce: bigint;
// };

type ExecutionRule = {
  validAfter: number; // 48 bits
  interval: number; // 48 bits
  runs: number; // 48 bits
};
interface ParamRules {
  offset: number;
  condition: ParamOperator;
  param: Hex;
}

type Permission = {
  target: Address;
  index?: number;
  rules?: ParamRules[];
  sig?: Hex;
  valueLimit?: bigint;
  executionRule?: ExecutionRule;
};

interface SessionKeyData {
  validUntil: number;
  validAfter: number;
  paymaster?: Address;
  permissions?: Permission[];
}


export type SessionKeyValidatorPlugin<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined
> = KernelPlugin<"SessionKeyValidator", TTransport, TChain> & {
  merkleTree: MerkleTree;
  getEnableData: (data?: any) => Promise<Hex>;
  getDisableData: (data?: any) => Promise<Hex>;
  validateSignature: (hash: Hex, signature: Hex) => Promise<boolean>;
};

export type SessionKeyValidatorData = {
  sessionKey: Account;
  sessionKeyData: SessionKeyData;
  validatorAddress: Address;
  chainId: number;
};

export async function signerToSessionKeyValidator<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined
>(
  client: Client<TTransport, TChain>,
  {
    signer,
    entryPoint,
    validatorData,
    validatorAddress = KERNEL_ADDRESSES.SESSION_KEY_VALIDATOR
  }: {
    signer: SmartAccountSigner;
    entryPoint: Address;
    validatorAddress?: Address;
    validatorData: SessionKeyValidatorData;
  }
): Promise<SessionKeyValidatorPlugin<TTransport, TChain>> {
  const viemSigner: Account =
    signer.type === "local"
      ? ({
        ...signer,
        signTransaction: (_, __) => {
          throw new SignTransactionNotSupportedBySmartAccount();
        },
      } as Account)
      : (signer as Account);

  // // Fetch chain id  
  // const [chainId] = await Promise.all([getChainId(client)]);

  // Build the EOA Signer
  const account = toAccount({
    address: viemSigner.address,
    async signMessage({ message }) {
      return signMessage(client, { account: viemSigner, message });
    },
    async signTransaction(_, __) {
      throw new SignTransactionNotSupportedBySmartAccount();
    },
    async signTypedData(typedData) {
      return signTypedData(client, { account: viemSigner, ...typedData });
    },
  });


  const merkleTree: MerkleTree = new MerkleTree(
    (validatorData.sessionKeyData.permissions ?? []).map((permission) =>
      keccak256(encodePermissionData(permission))
    ),
    keccak256,
    { sortPairs: true }
  );

  // const merkleRoot = merkleTree.getHexRoot();
  return {
    ...account,
    address: validatorAddress,
    signer: viemSigner,
    client: client,
    entryPoint: entryPoint,
    merkleTree,
    source: "SessionKeyValidator",
    getEnableData: async (data?: any): Promise<Hex> => {
      return encodeFunctionData({
        abi: SessionKeyValidatorAbi,
        functionName: "enable",
        args: [data],
      });
    },

    getDisableData: async (data?: any): Promise<Hex> => {

      return encodeFunctionData({
        abi: SessionKeyValidatorAbi,
        functionName: "disable",
        args: [data],
      });
    },

    validateSignature: async (
      hash: Hex,
      signature: Hex
    ): Promise<boolean> => {
      // Call the smart contract to validate the signature
      const publicClient = await createPublicClient({ chain: polygonMumbai, transport: http(process.env.RPC_URL as string) })
      const result = await publicClient.call({
        to: validatorAddress,
        data: encodeFunctionData({
          abi: SessionKeyValidatorAbi,
          functionName: "validateSignature",
          args: [hash, signature],
        }),
      });
      return result.toString() !== "0x" + "01".padStart(16, "0");
    },

    signUserOperation: async (
      userOperation: UserOperation
    ): Promise<Hex> => {
      const userOpHash = getUserOperationHash({
        userOperation: { ...userOperation, signature: "0x" },
        entryPoint: validatorData.validatorAddress,
        chainId: validatorData.chainId,
      });

      const signature = await signMessage(client, {
        account: viemSigner,
        message: { raw: userOpHash },
      });
      const fixedSignature = fixSignedData(signature);
      return fixedSignature;
    },

    getNonceKey: async () => {
      return 0n;
    },



    // getNonce: async (): Promise<bigint> => {
    //   const publicClient = await createPublicClient({ chain: polygonMumbai, transport: http(process.env.RPC_URL as string) });
    //   const nonceData = await publicClient.call({
    //     abi: SessionKeyValidatorAbi,
    //     to: validatorAddress,
    //     functionName: "nonces",
    //     args: [validatorData.sessionKey.address], // Assuming this is the missing argument
    //   });
    //   return BigInt(nonceData.lastNonce);
    // },


    async getDummySignature() {
      return "0x00000000fffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
    },
  }

};




export function getPermissionFromABI<
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends string | undefined = string
>({
  abi,
  target,
  args,
  functionName,
  valueLimit,
}: GeneratePermissionFromArgsParameters<TAbi, TFunctionName>): Permission {
  const abiItem = getAbiItem({
    abi,
    args,
    name: functionName,
  } as GetAbiItemParameters);
  if (abiItem.type !== "function") {
    throw Error(`${functionName} not found in abi`);
  }
  const functionSelector = getFunctionSelector(abiItem);
  let paramRules: ParamRules[] = [];
  if (args && Array.isArray(args)) {
    paramRules = (args as CombinedArgs<AbiFunction["inputs"]>)
      .map(
        (arg, i) =>
          arg && {
            param: pad(
              isHex(arg.value)
                ? arg.value
                : toHex(arg.value as Parameters<typeof toHex>[0]),
              { size: 32 }
            ),
            offset: i * 32,
            condition: arg.operator,
          }
      )
      .filter((rule) => rule) as ParamRules[];
  }
  return {
    sig: functionSelector,
    rules: paramRules,
    target,
    valueLimit: valueLimit ?? 0n,
  };
}

export type GetFunctionArgs<
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends string,
  TAbiFunction extends AbiFunction = TAbi extends Abi
  ? ExtractAbiFunction<TAbi, TFunctionName>
  : AbiFunction,
  TArgs = CombinedArgs<TAbiFunction["inputs"]>,
  FailedToParseArgs =
  | ([TArgs] extends [never] ? true : false)
  | (readonly unknown[] extends TArgs ? true : false)
> = true extends FailedToParseArgs
  ? {
    args?: readonly unknown[];
  }
  : TArgs extends readonly []
  ? { args?: never }
  : {
    args?: TArgs;
  };

export type GeneratePermissionFromArgsParameters<
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends string | undefined = string,
  _FunctionName = TAbi extends Abi
  ? InferFunctionName<TAbi, TFunctionName>
  : never
> = Pick<Permission, "target" | "valueLimit"> & {
  functionName?: _FunctionName;
} & (TFunctionName extends string
  ? { abi: Narrow<TAbi> } & GetFunctionArgs<TAbi, TFunctionName>
  : _FunctionName extends string
  ? { abi: [Narrow<TAbi[number]>] } & GetFunctionArgs<TAbi, _FunctionName>
  : never);

export type AbiParametersToPrimitiveTypes<
  TAbiParameters extends readonly AbiParameter[],
  TAbiParameterKind extends AbiParameterKind = AbiParameterKind
> = Pretty<{
  [K in keyof TAbiParameters]: AbiParameterToPrimitiveType<
    TAbiParameters[K],
    TAbiParameterKind
  >;
}>;

export type AbiParametersToConditons<
  TAbiParameters extends readonly AbiParameter[]
> = Pretty<{
  [K in keyof TAbiParameters]: ParamOperator;
}>;

export type CombinedArgs<
  TAbiParameters extends readonly AbiParameter[],
  TAbiParameterKind extends AbiParameterKind = AbiParameterKind
> = {
    [K in keyof TAbiParameters]: {
      operator: ParamOperator;
      value: AbiParameterToPrimitiveType<TAbiParameters[K], TAbiParameterKind>;
    } | null;
  };

export const fixSignedData = (sig: Hex): Hex => {
  let signature = sig;
  if (!isHex(signature)) {
    signature = `0x${signature}`;
    if (!isHex(signature)) {
      throw new Error("Invalid signed data " + sig);
    }
  }

  let { r, s, v } = hexToSignature(signature);
  if (v === 0n || v === 1n) v += 27n;
  const joined = signatureToHex({ r, s, v });
  return joined;
};

// export const getChainId = async (
//   projectId: string,
//   backendUrl?: string
// ): Promise<number | undefined> => {
//   try {
//     const {
//       data: { chainId },
//     } = await axios.post(
//       `${backendUrl ?? BACKEND_URL}/v1/projects/get-chain-id`,
//       {
//         projectId,
//       },
//       {
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//     return chainId;
//   } catch (error) {
//     console.log(error);
//     return undefined;
//   }
// };
