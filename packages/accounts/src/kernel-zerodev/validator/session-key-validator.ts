import {
  getUserOperationHash,
  type Address,
  type Hex,
  type SmartAccountSigner,
  type UserOperationRequest,
  getChain,
  type SignTypedDataParams,
} from "@alchemy/aa-core";
import { KernelBaseValidator, type KernelBaseValidatorParams } from "./base.js";
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
} from "viem";
import { SessionKeyValidatorAbi } from "../abis/SessionKeyValidatorAbi.js";
import { DUMMY_ECDSA_SIG } from "../constants.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import { MerkleTree } from "merkletreejs";
import type { Operation } from "../provider.js";
import { getChainId } from "../api/index.js";
import { base64ToBytes, bytesToBase64, fixSignedData } from "../utils.js";

export interface SessionKeyValidatorParams extends KernelBaseValidatorParams {
  sessionKey: SmartAccountSigner;
  sessionKeyData: SessionKeyData;
}

export type SessionData = Pick<
  SessionKeyValidatorParams,
  "sessionKeyData" | "enableSignature"
> & {
  sessionPrivateKey: Hex;
};

export enum ParamCondition {
  EQUAL = 0,
  GREATER_THAN = 1,
  LESS_THAN = 2,
  GREATER_THAN_OR_EQUAL = 3,
  LESS_THAN_OR_EQUAL = 4,
  NOT_EQUAL = 5,
}

export interface ParamRules {
  offset: number;
  condition: ParamCondition;
  param: Hex;
}

export interface Permission {
  target: Address;
  valueLimit: number;
  sig: Hex;
  rules: ParamRules[];
  operation: Operation;
}

export interface SessionKeyData {
  validUntil: number;
  validAfter: number;
  paymaster?: Address;
  permissions?: Permission[];
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
      paymaster: params.sessionKeyData.paymaster ?? zeroAddress,
    };
    this.merkleTree = this.getMerkleTree();
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
        (permission) => permission.valueLimit >= args[1]
      );

      if (!valueLimitPermissions.length) return undefined;

      const sortedPermissions = valueLimitPermissions.sort(
        (a, b) => b.valueLimit - a.valueLimit
      );

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
      (permission) => permission.operation === operation
    );
  }

  private filterBySignature(
    permissions: Permission[],
    signature: string
  ): Permission[] {
    return permissions.filter(
      (permission) => permission.sig.toLowerCase() === signature
    );
  }

  private findPermissionByRule(
    permissions: Permission[],
    data: string
  ): Permission | undefined {
    return permissions.find((permission) => {
      for (const rule of permission.rules) {
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
    condition: ParamCondition
  ): boolean {
    switch (condition) {
      case ParamCondition.EQUAL:
        return dataParam === ruleParam;
      case ParamCondition.GREATER_THAN:
        return dataParam > ruleParam;
      case ParamCondition.LESS_THAN:
        return dataParam < ruleParam;
      case ParamCondition.GREATER_THAN_OR_EQUAL:
        return dataParam >= ruleParam;
      case ParamCondition.LESS_THAN_OR_EQUAL:
        return dataParam <= ruleParam;
      case ParamCondition.NOT_EQUAL:
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

  serializeSessionData(sessionPrivateKey: Hex): string {
    const sessionData: SessionData = {
      sessionPrivateKey: sessionPrivateKey,
      sessionKeyData: this.sessionKeyData,
      enableSignature: this.enableSignature,
    };
    const jsonString = JSON.stringify(sessionData);
    const uint8Array = new TextEncoder().encode(jsonString);
    const base64String = bytesToBase64(uint8Array);
    return base64String;
  }

  public static deserializeSessionData(base64String: string): SessionData {
    const uint8Array = base64ToBytes(base64String);
    const jsonString = new TextDecoder().decode(uint8Array);
    const sessionKeyData = JSON.parse(jsonString) as SessionData;
    return sessionKeyData;
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
