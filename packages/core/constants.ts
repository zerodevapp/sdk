import { type Address } from "viem"

export const DUMMY_ECDSA_SIG =
    "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"

export const KernelImplToVersionMap: { [key: Address]: string } = {
    "0x8dD4DBB54d8A8Cf0DE6F9CCC4609470A30EfF18C": "0.2.2",
    "0x0DA6a956B9488eD4dd761E59f52FDc6c8068E6B5": "0.2.2",
    "0xD3F582F6B4814E989Ee8E96bc3175320B5A540ab": "0.2.3",
    "0x5FC0236D6c88a65beD32EECDC5D60a5CAb377717": "0.2.3"
}
export const TOKEN_ACTION = "0x2087C7FfD0d0DAE80a00EE74325aBF3449e0eaf1"
export const LATEST_KERNEL_VERSION = "0.2.3"
