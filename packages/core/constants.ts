import { type Address, zeroAddress } from "viem"

export const DUMMY_ECDSA_SIG =
    "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"

export const KernelImplToVersionMap: { [key: Address]: string } = {
    "0x8dD4DBB54d8A8Cf0DE6F9CCC4609470A30EfF18C": "0.2.2",
    "0x0DA6a956B9488eD4dd761E59f52FDc6c8068E6B5": "0.2.2",
    "0xD3F582F6B4814E989Ee8E96bc3175320B5A540ab": "0.2.3"
}
export const LATEST_KERNEL_VERSION = "0.2.3"

export const getKernelVersion = (kernelImpl?: Address): string => {
    if (!kernelImpl || kernelImpl === zeroAddress) return LATEST_KERNEL_VERSION
    for (const [addr, ver] of Object.entries(KernelImplToVersionMap)) {
        if (addr.toLowerCase() === kernelImpl.toLowerCase()) return ver
    }
    return "0.2.1"
}
