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
    signatureToHex,
    toHex
} from "viem"
import type { EntryPointVersion } from "viem/account-abstraction"
import type { ZeroDevPaymasterClient } from "./clients/paymasterClient.js"
import type { CALL_TYPE, EXEC_TYPE } from "./constants.js"
import type { EntryPointType, GetKernelVersion } from "./types/kernel.js"

export enum KERNEL_FEATURES {
    ERC1271_SIG_WRAPPER = "ERC1271_SIG_WRAPPER",
    ERC1271_WITH_VALIDATOR = "ERC1271_WITH_VALIDATOR",
    ERC1271_SIG_WRAPPER_WITH_WRAPPED_HASH = "ERC1271_SIG_WRAPPER_WITH_WRAPPED_HASH",
    ERC1271_REPLAYABLE = "ERC1271_REPLAYABLE"
}

export const KERNEL_FEATURES_BY_VERSION: Record<KERNEL_FEATURES, string> = {
    [KERNEL_FEATURES.ERC1271_SIG_WRAPPER]: ">=0.2.3 || >=0.3.0-beta",
    [KERNEL_FEATURES.ERC1271_WITH_VALIDATOR]: ">=0.3.0-beta",
    [KERNEL_FEATURES.ERC1271_SIG_WRAPPER_WITH_WRAPPED_HASH]: ">=0.3.0-beta",
    [KERNEL_FEATURES.ERC1271_REPLAYABLE]: ">=0.3.2"
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
    entryPointVersion extends EntryPointVersion
>(
    client: ZeroDevPaymasterClient<entryPointVersion>,
    {
        gasToken,
        approveAmount,
        entryPoint
    }: {
        gasToken: Address
        approveAmount: bigint
        entryPoint: EntryPointType<entryPointVersion>
    }
): Promise<{ to: Address; value: bigint; data: Hex }> => {
    const response = await client.request({
        method: "zd_pm_accounts",
        params: [
            {
                chainId: client.chain?.id as number,
                entryPointAddress: entryPoint.address
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
    entryPointVersion extends EntryPointVersion
>(
    entryPointVersion: EntryPointVersion,
    kernelVersion: GetKernelVersion<entryPointVersion>
) => {
    if (
        (entryPointVersion === "0.6" &&
            !satisfies(kernelVersion, ">=0.2.2 || <=0.2.4")) ||
        (entryPointVersion === "0.7" && !satisfies(kernelVersion, ">=0.3.0"))
    ) {
        throw new Error(
            "KernelVersion should be >= 0.2.2 and <= 0.2.4 for EntryPointV0.6 and >= 0.3.0 for EntryPointV0.7"
        )
    }
}

export const satisfiesRange = (version: string, range: string): boolean => {
    return satisfies(version, range)
}

// biome-ignore lint/suspicious/noExplicitAny: it's a recursive function, so it's hard to type
export function deepHexlify(obj: any): any {
    if (typeof obj === "function") {
        return undefined
    }
    if (obj == null || typeof obj === "string" || typeof obj === "boolean") {
        return obj
    }

    if (typeof obj === "bigint") {
        return toHex(obj)
    }

    if (obj._isBigNumber != null || typeof obj !== "object") {
        return toHex(obj).replace(/^0x0/, "0x")
    }
    if (Array.isArray(obj)) {
        return obj.map((member) => deepHexlify(member))
    }
    return Object.keys(obj).reduce(
        // biome-ignore lint/suspicious/noExplicitAny: it's a recursive function, so it's hard to type
        (set: any, key: string) => {
            set[key] = deepHexlify(obj[key])
            return set
        },
        {}
    )
}
