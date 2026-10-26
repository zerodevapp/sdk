import { EIP1271Abi, verifyEIP6492Signature } from "@zerodev/sdk"
import {
    type Address,
    BaseError,
    ContractFunctionRevertedError,
    ContractFunctionZeroDataError,
    type Hex,
    RawContractError
} from "viem"
import { getPublicClient } from "./clients"
import type { ChainKey } from "./env"

const ERC1271_MAGIC = "0x1626ba7e"

// A contract-level "no" (revert, or no code to answer) means the signature is
// not valid. Anything else (RPC down, timeouts) must surface as an error so a
// negative assertion cannot pass during an outage.
const isContractLevelFailure = (error: unknown) =>
    error instanceof BaseError &&
    Boolean(
        error.walk(
            (e) =>
                e instanceof ContractFunctionRevertedError ||
                e instanceof ContractFunctionZeroDataError ||
                e instanceof RawContractError ||
                (e instanceof BaseError && e.name === "ExecutionRevertedError")
        )
    )

export function falseOnRevert(check: Promise<boolean>): Promise<boolean> {
    return check.catch((error) => {
        if (isContractLevelFailure(error)) return false
        throw error
    })
}

export function isValid6492(
    key: ChainKey,
    signer: Address,
    hash: Hex,
    signature: Hex
): Promise<boolean> {
    return falseOnRevert(
        verifyEIP6492Signature({
            signer,
            hash,
            signature,
            client: getPublicClient(key)
        })
    )
}

export function isValid1271(
    key: ChainKey,
    account: Address,
    hash: Hex,
    signature: Hex,
    caller?: Address
): Promise<boolean> {
    return falseOnRevert(
        getPublicClient(key)
            .readContract({
                address: account,
                abi: EIP1271Abi,
                functionName: "isValidSignature",
                args: [hash, signature],
                account: caller
            })
            .then((result) => result === ERC1271_MAGIC)
    )
}

export async function isDeployed(key: ChainKey, address: Address) {
    const code = await getPublicClient(key).getCode({ address })
    return code !== undefined && code !== "0x"
}
