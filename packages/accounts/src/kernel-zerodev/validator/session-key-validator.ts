import {
  getUserOperationHash,
  type Address,
  type Hex,
  type SmartAccountSigner,
  type UserOperationRequest,
  getChain,
  type SignTypedDataParams,
  type Abi,
} from "@alchemy/aa-core";
import {
  KernelBaseValidator,
  ValidatorMode,
  type KernelBaseValidatorParams,
  type ValidatorPluginData,
} from "./base.js";
import {
  encodeFunctionData,
  toBytes,
  concat,
  pad,
  toHex,
  keccak256,
  encodeAbiParameters,
  concatHex,
  zeroAddress,
  decodeFunctionData,
  isHex,
  getFunctionSelector,
  type GetAbiItemParameters,
} from "viem";
import { formatAbiItem } from "viem/utils";
import { SessionKeyValidatorAbi } from "../abis/SessionKeyValidatorAbi.js";
import { DUMMY_ECDSA_SIG } from "../constants.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import { MerkleTree } from "merkletreejs";
import { Operation } from "../provider.js";
import { getChainId } from "../api/index.js";
import { fixSignedData } from "../utils.js";
import type { GetAbiItemReturnType } from "viem/dist/types/utils/abi/getAbiItem.js";
import { type AbiFunction } from "abitype";
import type {
  CombinedArgs,
  GeneratePermissionFromArgsParameters,
} from "./types.js";

// We need to be able to serialize bigint to transmit session key over
// the network.
// Using this trick: https://github.com/GoogleChromeLabs/jsbi/issues/30#issuecomment-1006086291
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export interface SessionKeyValidatorParams extends KernelBaseValidatorParams {
  sessionKey: SmartAccountSigner;
  sessionKeyData: SessionKeyData;
}

export type SessionKeyParams = Pick<
  SessionKeyValidatorParams,
  "sessionKeyData" | "enableSignature"
> &
  ValidatorPluginData & {
    sessionPrivateKey?: Hex;
    initCode?: Hex;
    accountAddress?: Address;
  };

export enum ParamOperator {
  EQUAL = 0,
  GREATER_THAN = 1,
  LESS_THAN = 2,
  GREATER_THAN_OR_EQUAL = 3,
  LESS_THAN_OR_EQUAL = 4,
  NOT_EQUAL = 5,
}

export interface ParamRules {
  offset: number;
  condition: ParamOperator;
  param: Hex;
}

export type Permission = {
  target: Address;
  rules?: ParamRules[];
  sig?: Hex;
  valueLimit?: bigint;
  operation?: Operation;
};

export interface SessionKeyData {
  validUntil: number;
  validAfter: number;
  paymaster?: Address;
  permissions?: Permission[];
}

export function getAbiItem<
  TAbi extends Abi | readonly unknown[],
  TItemName extends string
>({
  abi,
  args = [],
  name,
}: GetAbiItemParameters<TAbi, TItemName>): GetAbiItemReturnType<
  TAbi,
  TItemName
> {
  const abiItems = (abi as Abi).filter((x) => "name" in x && x.name === name);
  if (abiItems.length === 0) return undefined as any;
  if (abiItems.length === 1) return abiItems[0] as any;
  const abiItemsParamFiltered = [];
  for (const abiItem of abiItems) {
    if (!("inputs" in abiItem)) continue;
    if (!args || args.length === 0) {
      if (!abiItem.inputs || abiItem.inputs.length === 0) return abiItem as any;
      continue;
    }
    if (!abiItem.inputs) continue;
    if (abiItem.inputs.length === 0) continue;
    if (abiItem.inputs.length !== args.length) continue;
    abiItemsParamFiltered.push(abiItem);
  }
  if (abiItemsParamFiltered.length === 0) return abiItems[0] as any;
  else if (abiItemsParamFiltered.length === 1)
    return abiItemsParamFiltered[0] as any;
  else
    throw Error(
      `Couldn't parse function signature using params, set appropriate one from below:\n${abiItemsParamFiltered
        .map((item) => formatAbiItem(item))
        .reduce((a, c) => `${a}\n${c}`)}`
    );
}

export function getPermissionFromABI<
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends string | undefined = string
>({
  abi,
  target,
  args,
  functionName,
  operation,
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
    operation: operation ?? Operation.Call,
    valueLimit: valueLimit ?? 0n,
  };
}

export class SessionKeyValidator extends KernelBaseValidator {
  protected sessionKey: SmartAccountSigner;
  sessionKeyData: SessionKeyData;
  merkleTree: MerkleTree;

  constructor(params: SessionKeyValidatorParams) {
    super(params);
    this.sessionKey = params.sessionKey;
    this.sessionKeyData = {
      ...params.sessionKeyData,
      validAfter: params.sessionKeyData.validAfter ?? 0,
      validUntil: params.sessionKeyData.validUntil ?? 0,
      paymaster: params.sessionKeyData.paymaster ?? zeroAddress,
    };
    this.sessionKeyData.permissions = this.sessionKeyData.permissions?.map(
      (perm) => ({
        ...perm,
        operation: perm.operation ?? Operation.Call,
        valueLimit: perm.valueLimit ?? 0n,
        sig: perm.sig ?? pad("0x", { size: 4 }),
        rules: perm.rules ?? [],
      })
    );
    this.merkleTree = this.getMerkleTree();
    if (this.shouldDelegateViaFallback()) {
      throw Error("Session key permissions not set");
    }
    this.selector =
      params.selector ??
      getFunctionSelector("execute(address, uint256, bytes, uint8)");
    this.executor = params.executor ?? zeroAddress;
    this.mode = params.mode ?? ValidatorMode.plugin;
  }

  public static async init(
    params: SessionKeyValidatorParams
  ): Promise<SessionKeyValidator> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new SessionKeyValidator({ ...params, chain });
    return instance;
  }

  shouldDelegateViaFallback(): boolean {
    return this.merkleTree.getHexRoot() === pad("0x00", { size: 32 });
  }

  findMatchingPermission(callData: Hex): Permission | undefined {
    try {
      const { functionName, args } = decodeFunctionData({
        abi: KernelAccountAbi,
        data: callData,
      });

      if (functionName !== "execute") return undefined;

      const permissionsList = this.sessionKeyData.permissions;
      if (!permissionsList || !permissionsList.length) return undefined;

      const targetToMatch = args[0].toLowerCase();

      // Filter permissions by target
      let targetPermissions = permissionsList.filter(
        (permission) => permission.target.toLowerCase() === targetToMatch
      );

      // If no permissions match the exact target, check for generic permissions (using zero address)
      if (!targetPermissions.length) {
        targetPermissions = permissionsList.filter(
          (permission) =>
            permission.target.toLowerCase() === zeroAddress.toLowerCase()
        );
      }

      if (!targetPermissions.length) return undefined;

      const operationPermissions = this.filterByOperation(
        targetPermissions,
        args[3]
      );

      if (!operationPermissions.length) return undefined;

      const signaturePermissions = this.filterBySignature(
        operationPermissions,
        args[2].slice(0, 10).toLowerCase()
      );

      const valueLimitPermissions = signaturePermissions.filter(
        (permission) => (permission.valueLimit ?? 0n) >= args[1]
      );

      if (!valueLimitPermissions.length) return undefined;

      const sortedPermissions = valueLimitPermissions.sort((a, b) => {
        if ((b.valueLimit ?? 0n) > (a.valueLimit ?? 0n)) {
          return 1;
        } else if ((b.valueLimit ?? 0n) < (a.valueLimit ?? 0n)) {
          return -1;
        } else {
          return 0;
        }
      });

      return this.findPermissionByRule(sortedPermissions, args[2]);
    } catch (error) {
      return undefined;
    }
  }

  private filterByOperation(
    permissions: Permission[],
    operation: Operation
  ): Permission[] {
    return permissions.filter(
      (permission) =>
        permission.operation === operation || Operation.Call === operation
    );
  }

  private filterBySignature(
    permissions: Permission[],
    signature: string
  ): Permission[] {
    return permissions.filter(
      (permission) =>
        (permission.sig ?? pad("0x", { size: 4 })).toLowerCase() === signature
    );
  }

  private findPermissionByRule(
    permissions: Permission[],
    data: string
  ): Permission | undefined {
    return permissions.find((permission) => {
      for (const rule of permission.rules ?? []) {
        const dataParam: Hex = this.getFormattedHex(
          "0x" + data.slice(10 + rule.offset * 2, 10 + rule.offset * 2 + 64)
        );
        const ruleParam: Hex = this.getFormattedHex(rule.param);

        if (!this.evaluateRuleCondition(dataParam, ruleParam, rule.condition)) {
          return false;
        }
      }
      return true;
    });
  }

  private getFormattedHex(value: string): Hex {
    return pad(isHex(value) ? value : toHex(value), {
      size: 32,
    }).toLowerCase() as Hex;
  }

  private evaluateRuleCondition(
    dataParam: Hex,
    ruleParam: Hex,
    condition: ParamOperator
  ): boolean {
    switch (condition) {
      case ParamOperator.EQUAL:
        return dataParam === ruleParam;
      case ParamOperator.GREATER_THAN:
        return dataParam > ruleParam;
      case ParamOperator.LESS_THAN:
        return dataParam < ruleParam;
      case ParamOperator.GREATER_THAN_OR_EQUAL:
        return dataParam >= ruleParam;
      case ParamOperator.LESS_THAN_OR_EQUAL:
        return dataParam <= ruleParam;
      case ParamOperator.NOT_EQUAL:
        return dataParam !== ruleParam;
      default:
        return false;
    }
  }

  getMerkleTree(): MerkleTree {
    const permissionPacked = this.sessionKeyData.permissions?.map(
      (permission) => this.encodePermissionData(permission)
    );

    // Having one leaf returns empty array in getProof(). To hack it we push the leaf twice
    // issue - https://github.com/merkletreejs/merkletreejs/issues/58
    if (permissionPacked?.length === 1)
      permissionPacked.push(permissionPacked[0]);

    return permissionPacked && permissionPacked.length !== 0
      ? new MerkleTree(permissionPacked, keccak256, {
          sortPairs: true,
          hashLeaves: true,
        })
      : new MerkleTree([pad("0x00", { size: 32 })], keccak256, {
          hashLeaves: false,
        });
  }

  encodePermissionData(permission: Permission, merkleProof?: string[]): Hex {
    let permissionParam = {
      components: [
        {
          name: "target",
          type: "address",
        },
        {
          name: "valueLimit",
          type: "uint256",
        },
        {
          name: "sig",
          type: "bytes4",
        },
        {
          components: [
            {
              name: "offset",
              type: "uint256",
            },
            {
              internalType: "enum ParamCondition",
              name: "condition",
              type: "uint8",
            },
            {
              name: "param",
              type: "bytes32",
            },
          ],
          name: "rules",
          type: "tuple[]",
        },
        {
          internalType: "enum Operation",
          name: "operation",
          type: "uint8",
        },
      ],
      name: "permission",
      type: "tuple",
    };
    let params;
    let values;
    if (merkleProof) {
      params = [
        permissionParam,
        {
          name: "merkleProof",
          type: "bytes32[]",
        },
      ];
      values = [permission, merkleProof];
    } else {
      params = [permissionParam];
      values = [permission];
    }
    return encodeAbiParameters(params, values);
  }

  getSessionData(): SessionKeyParams {
    if (!this.selector || !this.executor) {
      throw Error("Plugin Validator data params uninitialised");
    }
    return {
      selector: this.selector,
      executor: this.executor,
      validUntil: this.validUntil,
      validAfter: this.validAfter,
      sessionKeyData: this.sessionKeyData,
      enableSignature: this.enableSignature,
    };
  }

  async signer(): Promise<SmartAccountSigner> {
    return await Promise.resolve(this.sessionKey);
  }

  async getEnableData(): Promise<Hex> {
    if (!this.merkleTree) {
      throw Error("SessionKeyValidator: MerkleTree not generated");
    }
    return concat([
      await this.sessionKey.getAddress(),
      pad(this.merkleTree.getHexRoot() as Hex, { size: 32 }),
      pad(toHex(this.sessionKeyData.validAfter), { size: 6 }),
      pad(toHex(this.sessionKeyData.validUntil), { size: 6 }),
      this.sessionKeyData.paymaster!,
    ]);
  }

  async isPluginEnabled(
    kernelAccountAddress: Address,
    selector: Hex
  ): Promise<boolean> {
    if (!this.publicClient) {
      throw new Error("Validator uninitialized: PublicClient missing");
    }
    const execDetail = await this.publicClient.readContract({
      abi: KernelAccountAbi,
      address: kernelAccountAddress,
      functionName: "getExecution",
      args: [selector],
    });
    const enableData = await this.publicClient.readContract({
      abi: SessionKeyValidatorAbi,
      address: this.validatorAddress,
      functionName: "sessionData",
      args: [await this.sessionKey.getAddress(), kernelAccountAddress],
    });
    const enableDataHex = concatHex([
      await this.sessionKey.getAddress(),
      pad(enableData[0], { size: 4 }),
      pad(toHex(enableData[1]), { size: 6 }),
      pad(toHex(enableData[2]), { size: 6 }),
      enableData[3],
    ]);
    return (
      execDetail.validator.toLowerCase() ===
        this.validatorAddress.toLowerCase() &&
      enableData[4] &&
      enableDataHex.toLowerCase() === (await this.getEnableData()).toLowerCase()
    );
  }

  async getDummyUserOpSignature(callData: Hex): Promise<Hex> {
    const matchingPermission = this.findMatchingPermission(callData);
    if (!matchingPermission && !this.shouldDelegateViaFallback()) {
      throw Error(
        "SessionKeyValidator: No matching permission found for the userOp"
      );
    }
    const encodedPermissionData =
      this.sessionKeyData.permissions &&
      this.sessionKeyData.permissions.length !== 0 &&
      matchingPermission
        ? this.encodePermissionData(matchingPermission)
        : "0x";
    const merkleProof = this.merkleTree.getHexProof(
      keccak256(encodedPermissionData)
    );
    const encodedData =
      this.sessionKeyData.permissions &&
      this.sessionKeyData.permissions.length !== 0 &&
      matchingPermission
        ? this.encodePermissionData(matchingPermission, merkleProof)
        : "0x";
    return concatHex([
      await this.sessionKey.getAddress(),
      DUMMY_ECDSA_SIG,
      encodedData,
    ]);
  }

  encodeEnable(sessionKeyEnableData: Hex): Hex {
    return encodeFunctionData({
      abi: SessionKeyValidatorAbi,
      functionName: "enable",
      args: [sessionKeyEnableData],
    });
  }

  encodeDisable(sessionKey: Hex): Hex {
    return encodeFunctionData({
      abi: SessionKeyValidatorAbi,
      functionName: "disable",
      args: [sessionKey],
    });
  }

  async signMessage(message: string | Uint8Array): Promise<Hex> {
    return await this.sessionKey.signMessage(message);
  }

  async signTypedData(params: SignTypedDataParams): Promise<Hex> {
    return fixSignedData(await this.sessionKey.signTypedData(params));
  }

  async signUserOp(userOp: UserOperationRequest): Promise<Hex> {
    if (!this.chain) {
      throw new Error("Validator uninitialized");
    }
    const hash = getUserOperationHash(
      {
        ...userOp,
        signature: "0x",
      },
      this.entryPointAddress,
      BigInt(this.chain.id)
    );
    const formattedMessage = typeof hash === "string" ? toBytes(hash) : hash;

    const matchingPermission = this.findMatchingPermission(userOp.callData);
    if (!matchingPermission && !this.shouldDelegateViaFallback()) {
      throw Error(
        "SessionKeyValidator: No matching permission found for the userOp"
      );
    }
    const encodedPermissionData =
      this.sessionKeyData.permissions &&
      this.sessionKeyData.permissions.length !== 0 &&
      matchingPermission
        ? this.encodePermissionData(matchingPermission)
        : "0x";
    const merkleProof = this.merkleTree.getHexProof(
      keccak256(encodedPermissionData)
    );
    const encodedData =
      this.sessionKeyData.permissions &&
      this.sessionKeyData.permissions.length !== 0 &&
      matchingPermission
        ? this.encodePermissionData(matchingPermission, merkleProof)
        : "0x";
    const signature = concat([
      await this.sessionKey.getAddress(),
      await this.sessionKey.signMessage(formattedMessage),
      encodedData,
    ]);
    return signature;
  }
}
