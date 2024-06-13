import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless"
import type { EntryPoint } from "permissionless/types/entrypoint"
import { satisfies } from "semver"
import {
    type Address,
    type Hex,
    concatHex,
    encodeFunctionData,
    erc20Abi,
    hexToSignature,
    isHex,
    pad,
    signatureToHex
} from "viem"
import type { ZeroDevPaymasterClient } from "./clients/paymasterClient.js"
import type { CALL_TYPE, EXEC_TYPE } from "./constants.js"
import type { GetKernelVersion } from "./types/kernel.js"

export enum KERNEL_FEATURES {
    ERC1271_SIG_WRAPPER = "ERC1271_SIG_WRAPPER",
    ERC1271_WITH_VALIDATOR = "ERC1271_WITH_VALIDATOR",
    ERC1271_SIG_WRAPPER_WITH_WRAPPED_HASH = "ERC1271_SIG_WRAPPER_WITH_WRAPPED_HASH"
}

export const KERNEL_FEATURES_BY_VERSION: Record<KERNEL_FEATURES, string> = {
    [KERNEL_FEATURES.ERC1271_SIG_WRAPPER]: ">=0.2.3 || >=0.3.0-beta",
    [KERNEL_FEATURES.ERC1271_WITH_VALIDATOR]: ">=0.3.0-beta",
    [KERNEL_FEATURES.ERC1271_SIG_WRAPPER_WITH_WRAPPED_HASH]: ">=0.3.0-beta"
}

export const hasKernelFeature = (
    feature: KERNEL_FEATURES,
    version: string
): boolean => {
    if (!(feature in KERNEL_FEATURES_BY_VERSION)) {
        return false
    }

    return satisfies(version, KERNEL_FEATURES_BY_VERSION[feature])
}

export const getERC20PaymasterApproveCall = async <
    entryPoint extends EntryPoint
>(
    client: ZeroDevPaymasterClient<entryPoint>,
    {
        gasToken,
        approveAmount
    }: {
        gasToken: Address
        approveAmount: bigint
    }
): Promise<{ to: Address; value: bigint; data: Hex }> => {
    const response = await client.request({
        method: "zd_pm_accounts",
        params: [
            {
                chainId: client.chain?.id as number,
                entryPointAddress: ENTRYPOINT_ADDRESS_V06
            }
        ]
    })
    return {
        to: gasToken,
        data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [response[0], approveAmount]
        }),
        value: 0n
    }
}

export const fixSignedData = (sig: Hex): Hex => {
    let signature = sig
    if (!isHex(signature)) {
        signature = `0x${signature}`
        if (!isHex(signature)) {
            throw new Error(`Invalid signed data ${sig}`)
        }
    }

    let { r, s, v } = hexToSignature(signature)
    if (v === 0n || v === 1n) v += 27n
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const joined = signatureToHex({ r, s, v: v! })
    return joined
}

export const getExecMode = ({
    callType,
    execType
}: {
    callType: CALL_TYPE
    execType: EXEC_TYPE
}): Hex => {
    return concatHex([
        callType, // 1 byte
        execType, // 1 byte
        "0x00000000", // 4 bytes
        "0x00000000", // 4 bytes
        pad("0x00000000", { size: 22 })
    ])
}

export const validateKernelVersionWithEntryPoint = <
    entryPoint extends EntryPoint
>(
    entryPointAddress: entryPoint,
    kernelVersion: GetKernelVersion<entryPoint>
) => {
    if (
        (entryPointAddress === ENTRYPOINT_ADDRESS_V06 &&
            !satisfies(kernelVersion, ">=0.2.2 || <=0.2.4")) ||
        (entryPointAddress === ENTRYPOINT_ADDRESS_V07 &&
            !satisfies(kernelVersion, ">=0.3.0"))
    ) {
        throw new Error(
            "KernelVersion should be >= 0.2.2 and <= 0.2.4 for EntryPointV0.6 and >= 0.3.0 for EntryPointV0.7"
        )
    }
}

export const satisfiesRange = (version: string, range: string): boolean => {
    return satisfies(version, range)
}
