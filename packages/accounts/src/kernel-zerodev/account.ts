import type { Address } from "abitype";
import {
    concatHex,
    encodeAbiParameters,
    encodeFunctionData,
    type FallbackTransport, hashMessage,
    type Hex, toBytes,
    type Transport,
} from "viem";
import { parseAbiParameters } from "abitype";
import { KernelBaseValidator, ValidatorMode } from "./validator/base";
import { KernelAccountAbi } from "./abis/KernelAccountAbi";
import { KernelFactoryAbi } from "./abis/KernelFactoryAbi";
import { type BaseSmartAccountParams, BaseSmartContractAccount, type SmartAccountSigner, type BatchUserOperationCallData, type UserOperationRequest } from "@alchemy/aa-core";
import { MULTISEND_ADDR } from "./constants";
import { encodeMultiSend } from "./utils";
import { MultiSendAbi } from "./abis/MultiSendAbi";

export interface KernelSmartAccountParams<
    TTransport extends Transport | FallbackTransport = Transport
> extends BaseSmartAccountParams<TTransport> {
    owner: SmartAccountSigner;
    factoryAddress: Address;
    index?: bigint;
    defaultValidator: KernelBaseValidator
    validator?: KernelBaseValidator
}

export class KernelSmartContractAccount<
    TTransport extends Transport | FallbackTransport = Transport
> extends BaseSmartContractAccount<TTransport> {
    private owner: SmartAccountSigner;
    private readonly factoryAddress: Address;
    private readonly index: bigint;
    private defaultValidator: KernelBaseValidator;
    validator: KernelBaseValidator;


    constructor(params: KernelSmartAccountParams) {
        super(params);
        this.index = params.index ?? 0n;
        this.owner = params.owner;
        this.factoryAddress = params.factoryAddress;
        this.defaultValidator = params.defaultValidator!
        this.validator = params.validator ?? params.defaultValidator!
    }

    getDummySignature(): Hex {
        return "0x00000000870fe151d548a1c527c3804866fab30abf28ed17b79d5fc5149f19ca0819fefc3c57f3da4fdf9b10fab3f2f3dca536467ae44943b9dbb8433efe7760ddd72aaa1c";
    }

    async encodeExecute(target: Hex, value: bigint, data: Hex): Promise<Hex> {
        if (this.validator.mode !== ValidatorMode.sudo) {
            throw new Error("Validator Mode not supported")
        } else {
            return this.encodeExecuteAction(target, value, data, 0)
        }
    }


    async encodeBatchExecute(
        _txs: BatchUserOperationCallData
    ): Promise<`0x${string}`> {

        const multiSendCalldata = encodeFunctionData({
            abi: MultiSendAbi,
            functionName: 'multiSend',
            args: [encodeMultiSend(_txs)]
        })
        return await this.encodeExecuteDelegate(MULTISEND_ADDR, BigInt(0), multiSendCalldata)
    }

    async encodeExecuteDelegate(target: Hex, value: bigint, data: Hex): Promise<Hex> {
        return this.encodeExecuteAction(target, value, data, 1)
    }

    async signWithEip6492(msg: string | Uint8Array): Promise<Hex> {
        try {
            const formattedMessage = typeof msg === "string" ? toBytes(msg) : msg
            let sig = await this.owner.signMessage(toBytes(hashMessage({ raw: formattedMessage })))
            // If the account is undeployed, use ERC-6492
            if (!await this.isAccountDeployed()) {
                sig = (encodeAbiParameters(
                    parseAbiParameters('address, bytes, bytes'),
                    [
                        this.factoryAddress,
                        await this.getFactoryInitCode(),
                        sig
                    ]
                ) + '6492649264926492649264926492649264926492649264926492649264926492' // magic suffix
                ) as Hex
            }

            return sig
        } catch (err: any) {
            console.error("Got Error - ", err.message)
            throw new Error("Message Signing with EIP6492 failed")
        }


    }

    async signMessage(msg: Uint8Array | string): Promise<Hex> {
        const formattedMessage = typeof msg === "string" ? toBytes(msg) : msg
        return await this.validator.signMessage(formattedMessage)
    }

    signUserOp(userOp: UserOperationRequest): Promise<Hex> {
        return this.validator.signUserOp(userOp);
    }

    protected encodeExecuteAction(target: Hex, value: bigint, data: Hex, code: number): Hex {
        return encodeFunctionData({
            abi: KernelAccountAbi,
            functionName: "execute",
            args: [target, value, data, code],
        });
    }
    protected async getAccountInitCode(): Promise<Hex> {
        return concatHex([
            this.factoryAddress,
            await this.getFactoryInitCode()
        ]);
    }

    protected async getFactoryInitCode(): Promise<Hex> {
        try {
            return encodeFunctionData({
                abi: KernelFactoryAbi,
                functionName: "createAccount",
                args: [this.defaultValidator.getAddress(), await this.defaultValidator.getEnableData(), this.index],
            })
        } catch (err: any) {
            console.error("err occurred:", err.message)
            throw new Error("Factory Code generation failed")
        }

    }

}
