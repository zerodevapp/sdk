import {
  ValidatorProvider,
  type ExtendedValidatorProviderParams,
} from "./base.js";
import {
  RecoveryValidator,
  type RecoveryConfig,
  type RecoveryValidatorParams,
} from "../validator/recovery-validator.js";
import {
  getChain,
  type Address,
  type SendUserOperationResult,
} from "@alchemy/aa-core";
import { getChainId, getRecoveryData, setSignatures } from "../api/index.js";
import { polygonMumbai } from "viem/chains";
import { BACKEND_URL_R, RECOVERY_VALIDATOR_ADDRESS } from "../constants.js";
import {
  encodeAbiParameters,
  encodeFunctionData,
  parseAbiParameters,
  type Hex,
  keccak256,
  publicActions,
  type TransactionReceipt,
  concatHex,
} from "viem";
import { RecoveryActionAbi } from "../abis/RecoveryActionAbi.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import axios from "axios";
import { base64ToBytes, bytesToBase64 } from "../utils.js";

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
    try {
      const serializedConfig = this.serializeRecoveryConfig();
      const {
        data: { recoveryId },
      } = await axios.post(
        `${BACKEND_URL_R}/v1/recovery`,
        {
          enableData,
          scwAddress: await this.getAddress(),
          recoveryConfig: serializedConfig,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      console.log(recoveryId);
      this.enableData = enableData;
      return recoveryId;
    } catch (error) {
      console.log(error);
      throw Error("Unable to generate the recoveryId");
    }
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
      let sigs = this.getValidator().getRecoverySignatures();
      if (sigs) {
        sigs =
          sigs.toLowerCase().indexOf(sig.toLowerCase()) === -1
            ? concatHex([sigs, sig])
            : sigs;
      } else {
        sigs = sig;
      }
      this.getValidator().setRecoverySignatures(sigs);
      const { result } = await setSignatures(this.recoveryId, sigs);
      if (result !== "success") {
        throw Error("Failed to save the signatures");
      }
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
    const signatures = sigs ?? this.getValidator().getRecoverySignatures();
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
