export const ECDSA_SIGNER_CONTRACT =
    "0x6A6F069E2a08c2468e7724Ab3250CdBFBA14D4FF"
export const WEBAUTHN_SIGNER_CONTRACT_V0_0_1 =
    "0x8AA55d4BfAE101609078681A69B5bc3181516612"
/**
 * @dev WEBAUTHN_SIGNER_CONTRACT_V0_0_2 updates
 * - Fixed checkSignature issue
 */
export const WEBAUTHN_SIGNER_CONTRACT_V0_0_2 =
    "0x58625164e306242c7613223bDeb68fbe11300606"

export const CALL_POLICY_CONTRACT_V0_0_1 =
    "0xe4Fec84B7B002273ecC86baa65a831ddB92d30a8"
/**
 * @dev CALL_POLICY_CONTRACT_V0_0_2 updates
 * - Added ONE_OF condition
 * - Added native ETH transfer support
 * - Added `zeroAddress` target address support, which means you can approve any contracts with specific selector. (e.g. approve any ERC20 transfer)
 */
export const CALL_POLICY_CONTRACT_V0_0_2 =
    "0x67Fa43ca2D689beA4d10b9F2C96828828A2Ab275"

/**
 * @dev CALL_POLICY_CONTRACT_V0_0_3 updates
 * - Fixed a bug with delegatecall
 */
export const CALL_POLICY_CONTRACT_V0_0_3 =
    "0xB3CB5f502250360335614df1421f2AAbE98CE503"

/**
 * @dev CALL_POLICY_CONTRACT_V0_0_4 updates
 * - Fixed erc4337 storage violation with custom storage slot (Works with Alchemy now)
 */
export const CALL_POLICY_CONTRACT_V0_0_4 =
    "0x9a52283276A0ec8740DF50bF01B28A80D880eaf2"

export const GAS_POLICY_CONTRACT = "0xaeFC5AbC67FfD258abD0A3E54f65E70326F84b23"
export const RATE_LIMIT_POLICY_CONTRACT =
    "0xf63d4139B25c836334edD76641356c6b74C86873"
export const SIGNATURE_POLICY_CONTRACT =
    "0xF6A936c88D97E6fad13b98d2FD731Ff17eeD591d"
export const SUDO_POLICY_CONTRACT = "0x67b436caD8a6D025DF6C82C5BB43fbF11fC5B9B7"
export const TIMESTAMP_POLICY_CONTRACT =
    "0xB9f8f524bE6EcD8C945b1b87f9ae5C192FdCE20F"

export enum PolicyFlags {
    FOR_ALL_VALIDATION = "0x0000",
    NOT_FOR_VALIDATE_USEROP = "0x0001",
    NOT_FOR_VALIDATE_SIG = "0x0002"
}
