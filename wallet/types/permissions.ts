export interface PermissionsType {
    [address: string]: {
        [chainId: string]: {
            sessionId: string
            entryPoint: string
            signerPrivateKey: string
            approval: string
        }[]
    }
}
