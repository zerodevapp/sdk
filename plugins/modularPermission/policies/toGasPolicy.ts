import type { EntryPoint } from "permissionless/types/entrypoint"
import { concatHex, encodeAbiParameters, zeroAddress } from "viem"
import { PolicyFlags } from "../constants.js"
import { GAS_POLICY_CONTRACT } from "../constants.js"
import type { GasPolicyParams, Policy } from "./types.js"

export async function toGasPolicy<entryPoint extends EntryPoint>({
    policyAddress = GAS_POLICY_CONTRACT,
    policyFlag = PolicyFlags.FOR_ALL_VALIDATION,
    maxGasAllowedInWei,
    enforcePaymaster = false,
    paymasterAddress = zeroAddress
}: GasPolicyParams): Promise<Policy<entryPoint>> {
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
            type: "gas",
            policyAddress,
            policyFlag,
            maxGasAllowedInWei,
            enforcePaymaster,
            paymasterAddress
        } as GasPolicyParams & { type: "gas" }
    }
}
