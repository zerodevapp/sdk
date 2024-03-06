import { type KernelAccountClient, type KernelSmartAccount } from "@zerodev/sdk"
import * as ethers from "ethers"
import {
    type Chain,
    type Hex,
    type HttpTransport,
    type Transport,
    encodeFunctionData
} from "viem"
import { DoubleSigValidatorAbi } from "./abi/DoubleSigValidatorAbi.js"
import { DOUBLE_ECDSA_VALIDATOR_ADDRESS } from "./index.js"

export type Bytes4 = string & {
    length: 6
}

/// Enable the DoubleSigValidator
/// Args:
/// - account: The smart wallet calling the function
/// - model_id: The model id of the model that the account will represent
/// - version_id: The version id of the model that the account will represent
/// - proof_id: The id of the proof that was verified from model inference
/// - proofHash: The hash of the proof that was verified from model inference
/// - client: The client to send the user operation to
/// - Should be called by the newly made smart wallet
export async function enableDoubleEcdsaValidator<
    TTransport extends Transport = HttpTransport,
    TChain extends Chain = Chain,
    TSmartAccount extends KernelSmartAccount<
        TTransport,
        TChain
    > = KernelSmartAccount<TTransport, TChain>
>(
    account: TSmartAccount,
    model_id: Bytes4,
    version_id: Bytes4,
    proof_id: string,
    proofHash: string,
    client: KernelAccountClient<TTransport, TChain, KernelSmartAccount>
) {
    const proofIdBytes = ethers.utils.hexZeroPad(
        ethers.BigNumber.from(proof_id).toHexString(),
        32
    )
    const modelIdBytes = ethers.utils.hexZeroPad(
        ethers.BigNumber.from(model_id).toHexString(),
        16
    )
    const versionIdBytes = ethers.utils.hexZeroPad(
        ethers.BigNumber.from(version_id).toHexString(),
        16
    )
    const userAddressBytes = ethers.utils.hexZeroPad(account.address, 20)
    const proofHashBytes = ethers.utils.hexZeroPad(proofHash, 32)

    const data = ethers.utils.hexConcat([
        proofIdBytes,
        modelIdBytes,
        versionIdBytes,
        userAddressBytes,
        proofHashBytes
    ])

    const hexData = ethers.utils.hexlify(data)
    const newData = hexToString(hexData)

    const calldata = encodeFunctionData({
        abi: DoubleSigValidatorAbi[0].abi,
        functionName: "enable",
        args: [newData]
    })

    const enable_calldata: string = await account.encodeCallData({
        to: DOUBLE_ECDSA_VALIDATOR_ADDRESS,
        value: 0n,
        data: calldata
    })

    const userOpHash = await client.sendUserOperation({
        userOperation: {
            callData: enable_calldata as Hex
        }
    })

    return userOpHash
}

function hexToString(hex: string): `0x${string}` {
    return hex as `0x${string}`
}
