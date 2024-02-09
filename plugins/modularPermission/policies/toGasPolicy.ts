import {
    type Address,
    type Hex,
    concatHex,
    encodeAbiParameters,
    zeroAddress
} from "viem"
import { PolicyFlags } from "../index.js"
import { GAS_POLICY_CONTRACT } from "../index.js"

export type PolicyParams = {
    policyAddress?: Address
    policyFlag?: PolicyFlags
}

export type GasPolicyParams = PolicyParams & {
    maxGasAllowedInWei: bigint
    enforcePaymaster?: boolean
    paymasterAddress?: Address
}

export type Policy = {
    getPolicyData: () => Hex
    getPolicyInfoInBytes: () => Hex
}

export async function toGasPolicy({
    policyAddress = GAS_POLICY_CONTRACT,
    policyFlag = PolicyFlags.FOR_ALL_VALIDATION,
    maxGasAllowedInWei,
    enforcePaymaster = false,
    paymasterAddress = zeroAddress
}: GasPolicyParams): Promise<Policy> {
    return {
        getPolicyData: () => {
            return encodeAbiParameters(
                [
                    { name: "maxGasAllowedInWei", type: "uint128" },
                    { name: "enforcePaymaster", type: "bool" },
                    { name: "paymasterAddress", type: "address" }
                ],
                [maxGasAllowedInWei, enforcePaymaster, paymasterAddress]
            )
        },
        getPolicyInfoInBytes: () => {
            return concatHex([policyFlag, policyAddress])
        }
    }
}
