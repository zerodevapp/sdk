import { EntryPointAbi, type UserOperationStruct } from "@alchemy/aa-core"
import type { NotPromise } from "./calcPreverificationGas"
import { encodeAbiParameters, parseAbiParameters, type Hex, keccak256 } from 'viem'

// UserOperation is the first parameter of validateUseOp
const validateUserOpMethod = 'simulateValidation'

// @ts-ignore
const UserOpType = EntryPointAbi.find(entry => entry.name === validateUserOpMethod)?.inputs[0]

function encode(typevalues: Array<{ type: string, val: any }>, forSignature: boolean): string {
    const types = typevalues.map(typevalue => typevalue.type === 'bytes' && forSignature ? 'bytes32' : typevalue.type).join(', ')
    const values = typevalues.map((typevalue) => typevalue.type === 'bytes' && forSignature ? keccak256(typevalue.val) : typevalue.val)
    return encodeAbiParameters(parseAbiParameters(types), values)
}

/**
 * pack the userOperation
 * @param op
 * @param forSignature "true" if the hash is needed to calculate the getUserOpHash()
 *  "false" to pack entire UserOp, for calculating the calldata cost of putting it on-chain.
 */
export function packUserOp(op: NotPromise<UserOperationStruct>, forSignature = true): string {
    if (forSignature) {
        // lighter signature scheme (must match UserOperation#pack): do encode a zero-length signature, but strip afterwards the appended zero-length value
        const userOpType = {
            components: [
                {
                    type: 'address',
                    name: 'sender'
                },
                {
                    type: 'uint256',
                    name: 'nonce'
                },
                {
                    type: 'bytes',
                    name: 'initCode'
                },
                {
                    type: 'bytes',
                    name: 'callData'
                },
                {
                    type: 'uint256',
                    name: 'callGasLimit'
                },
                {
                    type: 'uint256',
                    name: 'verificationGasLimit'
                },
                {
                    type: 'uint256',
                    name: 'preVerificationGas'
                },
                {
                    type: 'uint256',
                    name: 'maxFeePerGas'
                },
                {
                    type: 'uint256',
                    name: 'maxPriorityFeePerGas'
                },
                {
                    type: 'bytes',
                    name: 'paymasterAndData'
                },
                {
                    type: 'bytes',
                    name: 'signature'
                }
            ],
            name: 'userOp',
            type: 'tuple'
        }
        // console.log('hard-coded userOpType', userOpType)
        // console.log('from ABI userOpType', UserOpType)
        let encoded = encodeAbiParameters(userOpType.components, Object.values({
            ...op,
            signature: '0x'
        }))
        // remove leading word (total length) and trailing word (zero-length signature)
        encoded = '0x' + encoded.slice(66, encoded.length - 64) as Hex
        return encoded
    }

    const typevalues = (UserOpType as any).components.map((c: { name: keyof typeof op, type: string }) => ({
        type: c.type,
        val: op[c.name]
    }))
    return encode(typevalues, forSignature)
}