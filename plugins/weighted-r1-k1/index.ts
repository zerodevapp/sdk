import type { KernelValidator } from "@zerodev/sdk/types"
import {
    createWeightedValidator
    // getCurrentSigners,
    // getUpdateConfigCall
} from "./toWeightedECDSAValidatorPlugin.js"
import {
    toECDSASigner,
    type ECDSASignerParams
} from "./signers/toECDSASigner.js"
import { toWebAuthnPubKey, WebAuthnMode } from "./signers/toWebAuthnPubKey.js"
import {
    toWebAuthnSigner,
    type WebAuthnKey,
    type WebAuthnModularSignerParams
} from "./signers/toWebAuthnSigner.js"

export {
    createWeightedValidator,
    // getUpdateConfigCall,
    // getCurrentSigners,
    type KernelValidator,
    toECDSASigner,
    type ECDSASignerParams,
    toWebAuthnPubKey,
    type WebAuthnKey,
    WebAuthnMode,
    type WebAuthnModularSignerParams,
    toWebAuthnSigner
}
export * from "./constants.js"
