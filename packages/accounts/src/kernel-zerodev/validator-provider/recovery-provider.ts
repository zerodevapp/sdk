import {
  ValidatorProvider,
  type ExtendedValidatorProviderParams,
} from "./base.js";
import {
  RecoveryValidator,
  type RecoveryConfig,
  type RecoveryValidatorParams,
} from "../validator/recovery-validator.js";
import { type Address, type SendUserOperationResult } from "@alchemy/aa-core";
import {
  getChainId,
  getRecoveryData,
  postRecoveryData,
  setSignatures,
} from "../api/index.js";
import { polygonMumbai } from "viem/chains";
import { CHAIN_ID_TO_NODE, RECOVERY_VALIDATOR_ADDRESS } from "../constants.js";
import {
  encodeAbiParameters,
  encodeFunctionData,
  parseAbiParameters,
  type Hex,
  keccak256,
  publicActions,
  type TransactionReceipt,
  createPublicClient,
  http,
} from "viem";
import { RecoveryActionAbi } from "../abis/RecoveryActionAbi.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import { base64ToBytes, bytesToBase64, getChain } from "../utils.js";

export interface RecoveryProviderParams
  extends ExtendedValidatorProviderParams<RecoveryValidatorParams> {
  recoveryId?: string;
  enableData?: Hex;
}

export class RecoveryProvider extends ValidatorProvider<
  RecoveryValidator,
  RecoveryValidatorParams
> {
  recoveryId?: string;
  enableData?: Hex;
  constructor(params: RecoveryProviderParams) {
    const chain =
      typeof params.opts?.providerConfig?.chain === "number"
        ? getChain(params.opts.providerConfig.chain)
        : params.opts?.providerConfig?.chain ?? polygonMumbai;
    const validator = new RecoveryValidator({
      projectId: params.projectId,
      chain,
      recoveryId: params.recoveryId,
      validatorAddress:
        params.opts?.validatorConfig?.validatorAddress ??
        RECOVERY_VALIDATOR_ADDRESS,
      ...params.opts?.validatorConfig,
    });
    super(
      {
        ...params,
        opts: {
          ...params.opts,
          providerConfig: { ...params.opts?.providerConfig, chain },
        },
      },
      validator
    );
    this.recoveryId = params.recoveryId;
    this.enableData = params.enableData;
  }

  public static async init(
    params: RecoveryProviderParams
  ): Promise<RecoveryProvider> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    let accountAddress,
      enableData,
      signatures,
      serializedRecoveryConfig,
      recoveryConfig;
    if (params.recoveryId) {
      ({
        scwAddress: accountAddress,
        enableData,
        recoveryConfig: serializedRecoveryConfig,
        signatures,
      } = await getRecoveryData(params.recoveryId));
      recoveryConfig = RecoveryProvider.deserializeRecoveryConfig(
        serializedRecoveryConfig
      );
    } else if (
      params.opts?.accountConfig?.accountAddress &&
      (!params.opts?.validatorConfig?.guardians ||
        !Object.entries(params.opts?.validatorConfig?.guardians).length ||
        params.opts.validatorConfig.threshold === undefined)
    ) {
      const publicClient = createPublicClient({
        transport: http(CHAIN_ID_TO_NODE[chain?.id ?? polygonMumbai.id]),
        chain: chain ?? polygonMumbai,
      });
      recoveryConfig = await RecoveryValidator.fetchRecoveryConfigFromContract(
        params.opts?.accountConfig?.accountAddress,
        publicClient
      );
    }
    const instance = new RecoveryProvider({
      enableData,
      ...params,
      opts: {
        ...params.opts,
        providerConfig: {
          chain,
          ...params.opts?.providerConfig,
        },
        accountConfig: {
          accountAddress,
          ...params.opts?.accountConfig,
        },
        validatorConfig: {
          signatures,
          ...recoveryConfig,
          ...params.opts?.validatorConfig,
        },
      },
    });
    return instance;
  }

  async getDefaultValidator(): Promise<Address> {
    const publicClient = this.getValidator().getPublicClient();
    const kernelAccountAddress = await this.getAddress();
    return await publicClient.readContract({
      abi: KernelAccountAbi,
      address: kernelAccountAddress,
      functionName: "getDefaultValidator",
    });
  }

  async encodeCalldataAndNonce(enableData: Hex): Promise<Hex> {
    const defaultValidatorAddress = await this.getDefaultValidator();
    const callData = encodeFunctionData({
      abi: RecoveryActionAbi,
      functionName: "doRecovery",
      args: [defaultValidatorAddress, enableData],
    });
    const nonce = await (await this.getAccount()).getNonce();
    const encodedCallDataAndNonce = encodeAbiParameters(
      parseAbiParameters("bytes calldata, uint256 nonce"),
      [callData, nonce]
    );
    return keccak256(encodedCallDataAndNonce);
  }

  async enableRecovery(): Promise<SendUserOperationResult> {
    if (!this.defaultProvider) {
      throw Error("DefaultProvider uninitilised");
    }
    const { selector } = await this.getValidator().getPluginValidatorData();
    const kernelAccountAddress = await this.defaultProvider.getAddress();
    const encodedSetExecData = await this.getAccount().encodeSetExection();
    if (
      await this.getValidator().isPluginEnabled(kernelAccountAddress, selector)
    ) {
      throw Error("Plugin already enabled");
    }
    return await this.defaultProvider.sendUserOperation({
      target: kernelAccountAddress,
      data: encodedSetExecData,
    });
  }

  async initiateRecovery(enableData: Hex): Promise<string> {
    const serializedConfig = this.serializeRecoveryConfig();
    const recoveryId = await postRecoveryData(
      enableData,
      await this.getAddress(),
      serializedConfig
    );
    console.log(recoveryId);
    this.enableData = enableData;
    if (!recoveryId) {
      throw Error("Unable to generate the recoveryId");
    }
    return recoveryId;
  }

  serializeRecoveryConfig(): string {
    let recoveryConfig = this.getValidator().getRecoveryConfig();
    const jsonString = JSON.stringify(recoveryConfig);
    const uint8Array = new TextEncoder().encode(jsonString);
    const base64String = bytesToBase64(uint8Array);
    return base64String;
  }

  public static deserializeRecoveryConfig(
    recoveryConfig: string
  ): RecoveryConfig {
    const uint8Array = base64ToBytes(recoveryConfig);
    const jsonString = new TextDecoder().decode(uint8Array);
    return JSON.parse(jsonString) as RecoveryConfig;
  }

  async approveRecovery(enableData?: Hex): Promise<TransactionReceipt> {
    const fetchedEnableData = enableData ?? this.enableData;
    if (!fetchedEnableData) {
      throw Error("Unable to fetch enable data for Recovery");
    }
    const kernelAccountAddress = await this.getAddress();
    const callDataAndNonceHash = await this.encodeCalldataAndNonce(
      fetchedEnableData
    );
    const validator = this.getValidator();
    if (!validator.walletClient) {
      throw Error("WalletClient uninitialized");
    }
    const walletClient = validator.walletClient.extend(publicActions);
    let account;
    if (walletClient.account) {
      account = walletClient.account;
    } else {
      [account] = await walletClient.requestAddresses();
    }
    const hash = await walletClient.sendTransaction({
      account,
      to: validator.getAddress(),
      data: validator.encodeApprove(
        callDataAndNonceHash!,
        kernelAccountAddress!
      ),
    });
    return await walletClient.waitForTransactionReceipt({ hash });
  }

  async signRecovery(enableData?: Hex) {
    try {
      if (!this.recoveryId) {
        throw Error("RecoveryId not set");
      }
      const fetchedEnableData = enableData ?? this.enableData;
      if (!fetchedEnableData) {
        throw Error("Unable to fetch enable data for Recovery");
      }
      const callDataAndNonceHash = await this.encodeCalldataAndNonce(
        fetchedEnableData
      );
      const sig = await this.getValidator().signRecoveryHash(
        callDataAndNonceHash
      );
      const { result, data } = await setSignatures(this.recoveryId, sig);
      if (result !== "success") {
        throw Error("Failed to save the signatures");
      }
      this.getValidator().setRecoverySignatures(data.signatures);
    } catch (error) {
      console.log(error);
    }
  }

  async approveRecoveryWithSig(
    enableData?: Hex,
    sigs?: Hex
  ): Promise<TransactionReceipt> {
    const fetchedEnableData = enableData ?? this.enableData;
    if (!fetchedEnableData) {
      throw Error("Unable to fetch enable data for Recovery");
    }
    const signatures =
      sigs ?? (await this.getValidator().getRecoverySignatures());
    if (!signatures) {
      throw Error("Signatures are not set");
    }
    const kernelAccountAddress = await this.getAddress();
    const callDataAndNonceHash = await this.encodeCalldataAndNonce(
      fetchedEnableData
    );
    const validator = this.getValidator();
    if (!validator.walletClient) {
      throw Error("WalletClient uninitilized");
    }
    const walletClient = validator.walletClient.extend(publicActions);
    let account;
    if (walletClient.account) {
      account = walletClient.account;
    } else {
      [account] = await walletClient.requestAddresses();
    }
    const hash = await walletClient.sendTransaction({
      account,
      to: validator.getAddress(),
      data: validator.encodeApproveWithSig(
        callDataAndNonceHash,
        kernelAccountAddress,
        sigs!
      ),
    });
    return await walletClient.waitForTransactionReceipt({ hash });
  }

  async cancelRecovery(enableData?: Hex): Promise<SendUserOperationResult> {
    const fetchedEnableData = enableData ?? this.enableData;
    if (!fetchedEnableData) {
      throw Error("Unable to fetch enable data for Recovery");
    }
    if (!this.defaultProvider) {
      throw Error("DefaultProvider uninitilised");
    }
    const callDataAndNonceHash = await this.encodeCalldataAndNonce(
      fetchedEnableData
    );
    const encodedVetoData = await this.getValidator().encodeVeto(
      callDataAndNonceHash
    );

    return await this.defaultProvider.sendUserOperation({
      target: this.getValidator().validatorAddress,
      data: encodedVetoData,
    });
  }

  async submitRecovery(enableData?: Hex): Promise<SendUserOperationResult> {
    const fetchedEnableData = enableData ?? this.enableData;
    if (!fetchedEnableData) {
      throw Error("Unable to fetch enable data for Recovery");
    }
    const defaultValidatorAddress = await this.getDefaultValidator();
    const encodedRecoveryActionData =
      await this.getValidator().encodeRecoveryAction(
        fetchedEnableData,
        defaultValidatorAddress
      );

    return await this.sendUserOperation({
      target: await this.getAddress(),
      data: encodedRecoveryActionData,
    });
  }

  // [TODO]
  //   changeGuardian = this.sendEnableUserOperation;

  deleteRecoveryData = this.sendDisableUserOperation;
}
