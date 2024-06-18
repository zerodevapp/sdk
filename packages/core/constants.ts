import { type Address, type Hex, zeroAddress } from "viem"
import type {
    KERNEL_V2_VERSION_TYPE,
    KERNEL_V3_VERSION_TYPE,
    KERNEL_VERSION_TYPE
} from "./types/kernel.js"

export const DUMMY_ECDSA_SIG =
    "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"

// export const KernelImplToVersionMap: { [key: Address]: string } = {
//     "0x8dD4DBB54d8A8Cf0DE6F9CCC4609470A30EfF18C": "0.2.2",
//     "0x0DA6a956B9488eD4dd761E59f52FDc6c8068E6B5": "0.2.2",
//     "0xD3F582F6B4814E989Ee8E96bc3175320B5A540ab": "0.2.3",
//     "0x5FC0236D6c88a65beD32EECDC5D60a5CAb377717": "0.2.3",
//     "0xd3082872F8B06073A021b4602e022d5A070d7cfC": "0.2.4",
//     "0x94F097E1ebEB4ecA3AAE54cabb08905B239A7D27": "0.3.0"
// }

export const FACTORY_ADDRESS_V0_6 = "0x5de4839a76cf55d0c90e2061ef4386d962E15ae3"
export const FACTORY_ADDRESS_V0_6_INIT_CODE_HASH =
    "0xee9d8350bd899dd261db689aafd87eb8a30f085adbaff48152399438ff4eed73"

export const KernelVersionToAddressesMap: {
    [key in KERNEL_VERSION_TYPE]: {
        accountImplementationAddress: Address
        factoryAddress: Address
        metaFactoryAddress?: key extends KERNEL_V3_VERSION_TYPE
            ? Address
            : never
        initCodeHash?: Hex
    }
} = {
    "0.0.2": {
        accountImplementationAddress: zeroAddress,
        factoryAddress: "0xaee9762ce625e0a8f7b184670fb57c37bfe1d0f1"
    },
    "0.2.2": {
        accountImplementationAddress:
            "0x0DA6a956B9488eD4dd761E59f52FDc6c8068E6B5",
        factoryAddress: FACTORY_ADDRESS_V0_6,
        initCodeHash: FACTORY_ADDRESS_V0_6_INIT_CODE_HASH
    },
    "0.2.3": {
        accountImplementationAddress:
            "0xD3F582F6B4814E989Ee8E96bc3175320B5A540ab",
        factoryAddress: FACTORY_ADDRESS_V0_6,
        initCodeHash: FACTORY_ADDRESS_V0_6_INIT_CODE_HASH
    },
    "0.2.4": {
        accountImplementationAddress:
            "0xd3082872F8B06073A021b4602e022d5A070d7cfC",
        factoryAddress: FACTORY_ADDRESS_V0_6,
        initCodeHash: FACTORY_ADDRESS_V0_6_INIT_CODE_HASH
    },
    "0.3.0": {
        accountImplementationAddress:
            "0x94F097E1ebEB4ecA3AAE54cabb08905B239A7D27",
        factoryAddress: "0x6723b44Abeec4E71eBE3232BD5B455805baDD22f",
        metaFactoryAddress: "0xd703aaE79538628d27099B8c4f621bE4CCd142d5",
        initCodeHash:
            "0x6fe6e6ea30eddce942b9618033ab8429f9ddac594053bec8a6744fffc71976e2"
    },
    "0.3.1": {
        accountImplementationAddress:
            "0xBAC849bB641841b44E965fB01A4Bf5F074f84b4D",
        factoryAddress: "0xaac5D4240AF87249B3f71BC8E4A2cae074A3E419",
        metaFactoryAddress: "0xd703aaE79538628d27099B8c4f621bE4CCd142d5",
        initCodeHash:
            "0x85d96aa1c9a65886d094915d76ccae85f14027a02c1647dde659f869460f03e6"
    }
}

export const KERNEL_V0_2: KERNEL_V2_VERSION_TYPE = "0.0.2"
export const KERNEL_V2_2: KERNEL_V2_VERSION_TYPE = "0.2.2"
export const KERNEL_V2_3: KERNEL_V2_VERSION_TYPE = "0.2.3"
export const KERNEL_V2_4: KERNEL_V2_VERSION_TYPE = "0.2.4"
export const KERNEL_V3_0: KERNEL_V3_VERSION_TYPE = "0.3.0"
export const KERNEL_V3_1: KERNEL_V3_VERSION_TYPE = "0.3.1"

export const TOKEN_ACTION = "0x2087C7FfD0d0DAE80a00EE74325aBF3449e0eaf1"
export const ONLY_ENTRYPOINT_HOOK_ADDRESS =
    "0xb230f0A1C7C95fa11001647383c8C7a8F316b900"
export const KERNEL_NAME = "Kernel"

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
