import { type UserOperation, getUserOperationHash } from "permissionless"
import { type SmartAccountSigner } from "permissionless/accounts"
import type {
    EntryPoint,
    GetEntryPointVersion
} from "permissionless/types/entrypoint"
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    encodeAbiParameters,
    keccak256,
    parseAbiParameters
} from "viem"
import { getChainId } from "viem/actions"
import { getValidatorAddress } from "./toWeightedECDSAValidatorPlugin"

export async function signWithSingleSigner<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = "custom",
    TAddress extends Address = Address
>(
    client: Client<TTransport, TChain, undefined>,
    {
        signer,
        totalSignerAddresses,
        userOperation,
        entryPoint: entryPointAddress,
        validatorAddress
    }: {
        signer: SmartAccountSigner<TSource, TAddress>
        totalSignerAddresses: Array<Address>
        userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
        entryPoint: EntryPoint
        validatorAddress?: Address
    }
): Promise<Hex> {
    validatorAddress =
        validatorAddress ?? getValidatorAddress(entryPointAddress)
    if (!validatorAddress) {
        throw new Error("Validator address not provided")
    }

    // if the signer is not in the list of totalSignerAddresses, throw an error
    if (!totalSignerAddresses.includes(signer.address)) {
        throw new Error("Signer is not in the list of totalSignerAddresses.")
    }
    // make sure that totalSignerAddresses is sorted in descending order, otherwise throw an error
    if (
        totalSignerAddresses.some(
            (address, index) =>
                index !== 0 &&
                BigInt(address) > BigInt(totalSignerAddresses[index - 1])
        )
    ) {
        throw new Error(
            "totalSignerAddresses is not sorted in descending order."
        )
    }

    // get the order of the signer in the list of signers
    const signerIndex = totalSignerAddresses.indexOf(signer.address)

    // Fetch chain id
    const chainId = await getChainId(client)

    // if the order is not the last, sign for callDataAndNonceHash
    if (signerIndex !== totalSignerAddresses.length - 1) {
        const callDataAndNonceHash = keccak256(
            encodeAbiParameters(parseAbiParameters("address, bytes, uint256"), [
                userOperation.sender,
                userOperation.callData,
                userOperation.nonce
            ])
        )

        const signature = await signer.signTypedData({
            domain: {
                name: "WeightedECDSAValidator",
                version: "0.0.3",
                chainId,
                verifyingContract: validatorAddress
            },
            types: {
                Approve: [{ name: "callDataAndNonceHash", type: "bytes32" }]
            },
            primaryType: "Approve",
            message: {
                callDataAndNonceHash
            }
        })

        return signature
    }
    // otherwise sign for userOpHash
    const userOpHash = getUserOperationHash({
        userOperation: {
            ...userOperation,
            signature: "0x"
        },
        entryPoint: entryPointAddress,
        chainId
    })

    const signature = await signer.signMessage({ message: { raw: userOpHash } })
    return signature
}
