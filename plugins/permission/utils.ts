import type { PermissionAccountParams, PermissionPlugin } from "./types.js"

export function base64ToBytes(base64: string) {
    const binString = atob(base64)
    return Uint8Array.from(binString, (m) => m.codePointAt(0) as number)
}

export function bytesToBase64(bytes: Uint8Array) {
    const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join("")
    return btoa(binString)
}

export function isPermissionValidatorPlugin(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    plugin: any
): plugin is PermissionPlugin {
    return plugin?.getPluginSerializationParams !== undefined
}

export const serializePermissionAccountParams = (
    params: PermissionAccountParams
) => {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const replacer = (_: string, value: any) => {
        if (typeof value === "bigint") {
            return value.toString()
        }
        return value
    }

    const jsonString = JSON.stringify(params, replacer)
    const uint8Array = new TextEncoder().encode(jsonString)
    const base64String = bytesToBase64(uint8Array)
    return base64String
}

export const deserializePermissionAccountParams = (params: string) => {
    const uint8Array = base64ToBytes(params)
    const jsonString = new TextDecoder().decode(uint8Array)
    return JSON.parse(jsonString) as PermissionAccountParams
}

export const isKernelVersionAfter = (
    kernelVersion: string,
    version: string
): boolean => {
    // semver.gt returns true if kernelVersion > 0.3.1
    // coerce to handle versions like 0.3.2, 0.3.10, etc.
    const semver = require("semver")
    return semver.gt(semver.coerce(kernelVersion), version)
}
