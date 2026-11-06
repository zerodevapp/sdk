import { describe } from "bun:test"
import type { KernelV3Version } from "./accounts"

export function forEachKernelVersion(
    versions: readonly KernelV3Version[],
    fn: (kernelVersion: KernelV3Version) => void
) {
    for (const kernelVersion of versions) {
        describe(`kernel ${kernelVersion}`, () => fn(kernelVersion))
    }
}
