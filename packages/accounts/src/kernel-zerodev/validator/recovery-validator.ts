import {
  type Address,
  type Hex,
  type SmartAccountSigner,
  type UserOperationRequest,
  type SignTypedDataParams,
} from "@alchemy/aa-core";
import {
  KernelBaseValidator,
  ValidatorMode,
  type KernelBaseValidatorParams,
} from "./base.js";
import {
  concatHex,
  encodeAbiParameters,
  encodeFunctionData,
  getContract,
  parseAbiParameters,
  type LocalAccount,
  createWalletClient,
  type WalletClient,
  http,
  custom,
  type Transport,
  type Chain,
  type Account,
  publicActions,
  getFunctionSelector,
  type PublicClient,
} from "viem";
import { WeightedValidatorAbi } from "../abis/WeightedValidatorAbi.js";
import { getChainId, getRecoveryData } from "../api/index.js";
import {
  CHAIN_ID_TO_NODE,
  DUMMY_ECDSA_SIG,
  RECOVERY_ACTION,
  RECOVERY_VALIDATOR_ADDRESS,
} from "../constants.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import { fixSignedData, getChain } from "../utils.js";
import type { EthereumProvider } from "./types.js";
import { polygonMumbai } from "viem/chains";
import { RecoveryActionAbi } from "../abis/RecoveryActionAbi.js";

interface WeightedGuardians {
  [guardian: Address]: number;
}
export interface RecoveryValidatorParams extends KernelBaseValidatorParams {
  guardians?: WeightedGuardians;
  threshold?: number;
  delaySeconds?: number;
  accountSigner?: SmartAccountSigner;
  localAccountOrProvider?: LocalAccount<string> | EthereumProvider;
  walletClient?: WalletClient<Transport, Chain>;
  signatures?: Hex;
  recoveryId?: string;
}

export type RecoveryConfig = Required<
  Pick<RecoveryValidatorParams, "guardians" | "threshold" | "delaySeconds">
>;

export function isLocalAccount(account: any): account is LocalAccount<string> {
  return account && account.signTransaction !== undefined;
}

export function isEthereumProvider(
  provider: any
): provider is EthereumProvider {
  return provider && provider.request !== undefined;
}

type WalletClientAccountType<T> = T extends LocalAccount<string>
  ? Account
  : T extends EthereumProvider
  ? undefined
  : never;

export const recoverySelector = getFunctionSelector(
  "doRecovery(address, bytes)"
);

export class RecoveryValidator extends KernelBaseValidator {
  protected guardians?: WeightedGuardians;
  protected threshold?: number;
  protected delaySeconds: number;
  protected accountSigner?: SmartAccountSigner;
  protected localAccountOrProvider?: LocalAccount<string> | EthereumProvider;
  protected signatures?: Hex;
  protected recoveryId?: string;
  walletClient?: WalletClient<
    Transport,
    Chain,
    WalletClientAccountType<typeof this.localAccountOrProvider>
  >;

  constructor(params: RecoveryValidatorParams) {
    super(params);
    this.guardians = params.guardians;
    this.threshold = params.threshold;
    this.delaySeconds = params.delaySeconds ?? 0;
    this.accountSigner = params.accountSigner;
    this.mode = params.mode ?? ValidatorMode.plugin;
    this.localAccountOrProvider = params.localAccountOrProvider;
    this.signatures = params.signatures;
    this.validAfter = params.validAfter ?? 0;
    this.validUntil = params.validUntil ?? 0;
    this.executor = params.executor ?? RECOVERY_ACTION;
    this.selector = params.selector ?? recoverySelector;
    this.recoveryId = params.recoveryId;
    if (isLocalAccount(params.localAccountOrProvider)) {
      this.walletClient = createWalletClient({
        account: params.localAccountOrProvider,
        chain: this.chain ?? polygonMumbai,
        transport: http(CHAIN_ID_TO_NODE[this.chain?.id ?? polygonMumbai.id]),
      }).extend(publicActions);
    } else if (isEthereumProvider(params.localAccountOrProvider)) {
      this.walletClient = createWalletClient({
        chain: this.chain ?? polygonMumbai,
        transport: custom(params.localAccountOrProvider),
      }).extend(publicActions);
    } else if (params.walletClient) {
      this.walletClient = params.walletClient.extend(publicActions);
    } else if (params.localAccountOrProvider) {
      throw Error("Incorrect localAccountOrProvider type");
    }
  }

  public static async init(
    params: RecoveryValidatorParams
  ): Promise<RecoveryValidator> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new RecoveryValidator({ ...params, chain });
    return instance;
  }

  getNonceKey(): bigint {
    return BigInt(this.validatorAddress);
  }

  setRecoverySignatures(signatures: Hex) {
    this.signatures = signatures;
  }

  async getRecoverySignatures(): Promise<Hex | undefined> {
    if (this.recoveryId) {
      const { signatures } = await getRecoveryData(this.recoveryId);
      this.setRecoverySignatures(signatures);
    }
    return this.signatures;
  }

  getRecoveryConfig(): RecoveryConfig {
    if (
      this.guardians === undefined ||
      !this.threshold ||
      Object.values(this.guardians).some((v) => v === 0) ||
      Object.values(this.guardians).reduce((a, c) => a + c, 0) < this.threshold
    ) {
      throw Error("Recovery config uninitialised or unexpected");
    }
    return {
      guardians: this.guardians,
      threshold: this.threshold,
      delaySeconds: this.delaySeconds,
    };
  }

  async signer(): Promise<SmartAccountSigner> {
    if (!this.accountSigner) {
      throw Error("AccountSigner not set");
    }
    return await Promise.resolve(this.accountSigner);
  }

  async getEnableData(): Promise<Hex> {
    if (
      this.guardians === undefined ||
      !this.threshold ||
      Object.values(this.guardians).some((v) => v === 0) ||
      Object.values(this.guardians).reduce((a, c) => a + c, 0) < this.threshold
    ) {
      throw Error("Recovery config uninitialised or unexpected");
    }
    return encodeAbiParameters(
      parseAbiParameters(
        "address[] guardians, uint24[] weights, uint24 threshold, uint48 delay"
      ),
      [
        Object.keys(this.guardians) as Address[],
        Object.values(this.guardians),
        this.threshold,
        this.delaySeconds,
      ]
    );
  }

  encodeEnable(recoveryData: Hex): Hex {
    return encodeFunctionData({
      abi: WeightedValidatorAbi,
      functionName: "enable",
      args: [recoveryData],
    });
  }

  encodeDisable(disableData: Hex = "0x"): Hex {
    return encodeFunctionData({
      abi: WeightedValidatorAbi,
      functionName: "disable",
      args: [disableData],
    });
  }

  encodeApprove(callDataAndNonceHash: Hex, kernelAccountAddress: Address): Hex {
    return encodeFunctionData({
      abi: WeightedValidatorAbi,
      functionName: "approve",
      args: [callDataAndNonceHash, kernelAccountAddress],
    });
  }

  encodeApproveWithSig(
    callDataAndNonceHash: Hex,
    kernelAccountAddress: Address,
    sigs: Hex
  ): Hex {
    return encodeFunctionData({
      abi: WeightedValidatorAbi,
      functionName: "approveWithSig",
      args: [callDataAndNonceHash, kernelAccountAddress, sigs],
    });
  }

  encodeVeto(callDataAndNonceHash: Hex): Hex {
    return encodeFunctionData({
      abi: WeightedValidatorAbi,
      functionName: "veto",
      args: [callDataAndNonceHash],
    });
  }

  encodeRenew(
    guardians: Address[],
    weights: number[],
    threshold: number,
    delay: number
  ): Hex {
    return encodeFunctionData({
      abi: WeightedValidatorAbi,
      functionName: "renew",
      args: [guardians, weights, threshold, delay],
    });
  }

  encodeRecoveryAction(enableData: Hex, defaultValidatorAddress: Address): Hex {
    return encodeFunctionData({
      abi: RecoveryActionAbi,
      functionName: "doRecovery",
      args: [defaultValidatorAddress, enableData],
    });
  }

  static async fetchRecoveryConfigFromContract(
    kernelAccountAddress: Address,
    publicClient: PublicClient<Transport, Chain>
  ): Promise<RecoveryConfig> {
    try {
      const [, threshold, delaySeconds, firstGuardian] =
        await publicClient.readContract({
          abi: WeightedValidatorAbi,
          address: RECOVERY_VALIDATOR_ADDRESS,
          functionName: "weightedStorage",
          args: [kernelAccountAddress],
        });

      const guardians: WeightedGuardians = {};

      let nextGuardian = firstGuardian;
      while (
        nextGuardian.toLowerCase() !== kernelAccountAddress.toLowerCase()
      ) {
        const guardianStorage = await publicClient.readContract({
          abi: WeightedValidatorAbi,
          address: RECOVERY_VALIDATOR_ADDRESS,
          functionName: "guardian",
          args: [nextGuardian, kernelAccountAddress],
        });
        guardians[nextGuardian] = guardianStorage[0];
        nextGuardian = guardianStorage[1];
      }
      return {
        threshold,
        delaySeconds,
        guardians,
      };
    } catch (error) {
      throw Error("Failed to fetch config from contract");
    }
  }

  async isPluginEnabled(
    kernelAccountAddress: Address,
    selector: Hex
  ): Promise<boolean> {
    if (
      this.guardians === undefined ||
      !this.threshold ||
      Object.values(this.guardians).some((v) => v === 0) ||
      Object.values(this.guardians).reduce((a, c) => a + c, 0) < this.threshold
    ) {
      throw Error("Recovery config uninitialised or unexpected");
    }
    if (!this.publicClient) {
      throw new Error("Validator uninitialized: PublicClient missing");
    }
    try {
      const kernel = getContract({
        abi: KernelAccountAbi,
        address: kernelAccountAddress,
        publicClient: this.publicClient,
      });
      const execDetail = await kernel.read.getExecution([selector]);
      const enableData = await this.publicClient.readContract({
        abi: WeightedValidatorAbi,
        address: this.validatorAddress,
        functionName: "weightedStorage",
        args: [kernelAccountAddress],
      });

      return (
        execDetail.validator.toLowerCase() ===
          this.validatorAddress.toLowerCase() &&
        enableData[0] ===
          Object.values(this.guardians).reduce((a, c) => a + c, 0) &&
        enableData[1] === this.threshold &&
        enableData[2] === this.delaySeconds &&
        this.isGuardiansEnabled(kernelAccountAddress)
      );
    } catch (error) {
      return false;
    }
  }

  async isGuardiansEnabled(kernelAccountAddress: Address): Promise<boolean> {
    if (
      this.guardians === undefined ||
      !this.threshold ||
      Object.values(this.guardians).some((v) => v === 0) ||
      Object.values(this.guardians).reduce((a, c) => a + c, 0) < this.threshold
    ) {
      throw Error("Recovery config uninitialised or unexpected");
    }
    const weightedValidator = getContract({
      abi: WeightedValidatorAbi,
      address: this.validatorAddress,
      publicClient: this.publicClient,
    });
    for (const [addr, weight] of Object.entries(this.guardians)) {
      const result = await weightedValidator.read.guardian([
        addr as Address,
        kernelAccountAddress,
      ]);
      if (result[0] !== weight) {
        return false;
      }
    }
    return true;
  }

  async getDummyUserOpSignature(): Promise<Hex> {
    let dummySignature: Hex = "0x";
    if (this.signatures) {
      const totalSigs = this.signatures.substring(2).length / 130;
      for (let i = 0; i < totalSigs; i++) {
        dummySignature = concatHex([dummySignature, DUMMY_ECDSA_SIG]);
      }
      // Hack - Fix this to not send original signatures
      return this.signatures;
    }
    return DUMMY_ECDSA_SIG;
  }

  async signMessage(message: string | Uint8Array): Promise<Hex> {
    if (!this.accountSigner) {
      throw Error("AccountSigner not set");
    }
    return await this.accountSigner.signMessage(message);
  }

  async signTypedData(params: SignTypedDataParams): Promise<Hex> {
    if (!this.accountSigner) {
      throw Error("AccountSigner not set");
    }
    return fixSignedData(await this.accountSigner.signTypedData(params));
  }

  async signRecoveryHash(recoveryHash: Hex): Promise<Hex> {
    if (!this.chain) {
      throw new Error("Validator uninitialized");
    }
    const signer = await this.signer();
    return await signer.signTypedData({
      domain: {
        name: "WeightedECDSAValidator",
        version: "0.0.1",
        chainId: this.chain.id,
        verifyingContract: this.validatorAddress,
      },
      types: {
        Approve: [{ name: "callDataAndNonceHash", type: "bytes32" }],
      },
      message: {
        callDataAndNonceHash: recoveryHash,
      },
      primaryType: "Approve",
    });
  }

  async signUserOp(_userOp: UserOperationRequest): Promise<Hex> {
    if (!this.chain) {
      throw new Error("Validator uninitialized");
    }
    return this.signatures ?? DUMMY_ECDSA_SIG;
  }
}
