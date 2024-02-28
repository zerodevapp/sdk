import type {
    ModularPermissionAccountParams,
    ModularPermissionPlugin
} from "./types"

export function base64ToBytes(base64: string) {
    const binString = atob(base64)
    return Uint8Array.from(binString, (m) => m.codePointAt(0) as number)
}

export function bytesToBase64(bytes: Uint8Array) {
    const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join("")
    return btoa(binString)
}

export function isModularPermissionValidatorPlugin(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    plugin: any
): plugin is ModularPermissionPlugin {
    return plugin?.getPluginSerializationParams !== undefined
}

export const serializeModularPermissionAccountParams = (
    params: ModularPermissionAccountParams
) => {
    const jsonString = JSON.stringify(params)
    const uint8Array = new TextEncoder().encode(jsonString)
    const base64String = bytesToBase64(uint8Array)
    return base64String
}

export const deserializeModularPermissionAccountParams = (params: string) => {
    const uint8Array = base64ToBytes(params)
    const jsonString = new TextDecoder().decode(uint8Array)
    return JSON.parse(jsonString) as ModularPermissionAccountParams
}