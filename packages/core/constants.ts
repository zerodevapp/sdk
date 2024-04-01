import { type Address, type Hex } from "viem"

export const DUMMY_ECDSA_SIG =
    "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"

export const KernelImplToVersionMap: { [key: Address]: string } = {
    "0x8dD4DBB54d8A8Cf0DE6F9CCC4609470A30EfF18C": "0.2.2",
    "0x0DA6a956B9488eD4dd761E59f52FDc6c8068E6B5": "0.2.2",
    "0xD3F582F6B4814E989Ee8E96bc3175320B5A540ab": "0.2.3",
    "0x5FC0236D6c88a65beD32EECDC5D60a5CAb377717": "0.2.3",
    "0xd3082872F8B06073A021b4602e022d5A070d7cfC": "0.2.4"
}
export const TOKEN_ACTION = "0x2087C7FfD0d0DAE80a00EE74325aBF3449e0eaf1"
export const KERNEL_NAME = "Kernel"
export const LATEST_KERNEL_VERSION = "0.2.4"
export const KernelFactoryToInitCodeHashMap: { [key: Address]: Hex } = {
    "0x5de4839a76cf55d0c90e2061ef4386d962E15ae3":
        "0xee9d8350bd899dd261db689aafd87eb8a30f085adbaff48152399438ff4eed73"
}
