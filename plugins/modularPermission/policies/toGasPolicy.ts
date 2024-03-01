import { concatHex, encodeAbiParameters, zeroAddress } from "viem"
import { PolicyFlags } from "../constants.js"
import { GAS_POLICY_CONTRACT } from "../constants.js"
import type { GasPolicyParams, Policy } from "./types.js"

export async function toGasPolicy({
    policyAddress = GAS_POLICY_CONTRACT,
    policyFlag = PolicyFlags.FOR_ALL_VALIDATION,
    maxGasAllowedInWei,
    enforcePaymaster = false,
    paymasterAddress = zeroAddress,
    type = "gas"
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
        getSignaturePolicyData: () => {
            return "0x"
        },
        getPolicyInfoInBytes: () => {
            return concatHex([policyFlag, policyAddress])
        },
        policyParams: {
            type,
            policyAddress,
            policyFlag,
            maxGasAllowedInWei,
            enforcePaymaster,
            paymasterAddress
        } as GasPolicyParams
    }
}
