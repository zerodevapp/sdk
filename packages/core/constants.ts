import type { EntryPointVersion } from "permissionless/types/entrypoint"
import { type Address, type Hex } from "viem"

export const DUMMY_ECDSA_SIG =
    "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"

export const KernelImplToVersionMap: { [key: Address]: string } = {
    "0x8dD4DBB54d8A8Cf0DE6F9CCC4609470A30EfF18C": "0.2.2",
    "0x0DA6a956B9488eD4dd761E59f52FDc6c8068E6B5": "0.2.2",
    "0xD3F582F6B4814E989Ee8E96bc3175320B5A540ab": "0.2.3",
    "0x5FC0236D6c88a65beD32EECDC5D60a5CAb377717": "0.2.3",
    "0xd3082872F8B06073A021b4602e022d5A070d7cfC": "0.2.4",
    "0x94F097E1ebEB4ecA3AAE54cabb08905B239A7D27": "0.3.0-beta"
}
export const TOKEN_ACTION = "0x2087C7FfD0d0DAE80a00EE74325aBF3449e0eaf1"
export const ONLY_ENTRYPOINT_HOOK_ADDRESS =
    "0xb230f0A1C7C95fa11001647383c8C7a8F316b900"
export const KERNEL_NAME = "Kernel"
export const LATEST_KERNEL_VERSION: { [key in EntryPointVersion]: string } = {
    "v0.6": "0.2.4",
    "v0.7": "0.3.0-beta"
}
export const VALIDATOR_TYPE = {
    SUDO: "0x00",
    SECONDARY: "0x01",
    PERMISSION: "0x02"
} as const
export enum VALIDATOR_MODE {
    DEFAULT = "0x00",
    ENABLE = "0x01"
}
export enum CALL_TYPE {
    SINGLE = "0x00",
    BATCH = "0x01",
    DELEGATE_CALL = "0xFF"
}
export enum EXEC_TYPE {
    DEFAULT = "0x00",
    TRY_EXEC = "0x01"
}

// Safe's library for create and create2: https://github.com/safe-global/safe-contracts/blob/0acdd35a203299585438f53885df630f9d486a86/contracts/libraries/CreateCall.sol
// Address was found here: https://github.com/safe-global/safe-deployments/blob/926ec6bbe2ebcac3aa2c2c6c0aff74aa590cbc6a/src/assets/v1.4.1/create_call.json
export const safeCreateCallAddress =
    "0x9b35Af71d77eaf8d7e40252370304687390A1A52"
export const KernelFactoryToInitCodeHashMap: { [key: Address]: Hex } = {
    "0x5de4839a76cf55d0c90e2061ef4386d962E15ae3":
        "0xee9d8350bd899dd261db689aafd87eb8a30f085adbaff48152399438ff4eed73",
    "0x6723b44Abeec4E71eBE3232BD5B455805baDD22f":
        "0x6fe6e6ea30eddce942b9618033ab8429f9ddac594053bec8a6744fffc71976e2"
}
