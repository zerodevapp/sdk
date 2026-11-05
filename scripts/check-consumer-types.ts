// Run after `bun run build`: checks the packed SDK at its declared viem floor.
import {
    access,
    lstat,
    mkdtemp,
    readFile,
    realpath,
    rm,
    writeFile
} from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const core = join(root, "packages/core")
await access(join(core, "_types/index.d.ts")).catch(() => {
    throw new Error(
        "Build the workspace packages before running check:consumer-types"
    )
})
const manifest = JSON.parse(await readFile(join(core, "package.json"), "utf8"))
const { minVersion } = createRequire(join(core, "package.json"))("semver")
const viemVersion = minVersion(manifest.peerDependencies.viem)?.version
if (!viemVersion) throw new Error("Cannot resolve the declared viem minimum")

const npm = Bun.which("npm")
if (!npm)
    throw new Error("npm must be available to install the isolated consumer")
const run = async (command: string[], cwd: string) => {
    const child = Bun.spawn(command, {
        cwd,
        stdout: "inherit",
        stderr: "inherit"
    })
    const code = await child.exited
    if (code !== 0) throw new Error(`${command[0]} exited with status ${code}`)
}

const tempRoot = resolve(tmpdir())
const temp = await mkdtemp(join(tempRoot, "zerodev-consumer-"))
if (
    dirname(resolve(temp)) !== tempRoot ||
    !basename(temp).startsWith("zerodev-consumer-")
) {
    throw new Error("Unexpected consumer temporary directory")
}
try {
    const pack = Bun.spawn(
        [
            npm,
            "pack",
            core,
            "--ignore-scripts",
            "--pack-destination",
            temp,
            "--json"
        ],
        { cwd: root, stdout: "pipe", stderr: "inherit" }
    )
    const output = await new Response(pack.stdout).text()
    if ((await pack.exited) !== 0)
        throw new Error("Packing the built SDK failed")
    const [{ filename }] = JSON.parse(output) as { filename: string }[]
    if (basename(filename) !== filename)
        throw new Error("Unexpected package filename")
    await writeFile(
        join(temp, "package.json"),
        JSON.stringify({
            name: "zerodev-consumer-types",
            private: true,
            type: "module",
            dependencies: {
                "@zerodev/sdk": `file:./${filename}`,
                viem: viemVersion
            },
            devDependencies: {
                typescript: "5.9.3",
                "@types/node": "24.0.0"
            }
        })
    )
    await writeFile(
        join(temp, "check.ts"),
        'import { createKernelAccountClient } from "@zerodev/sdk";\nexport const clientFactory = createKernelAccountClient;\n'
    )
    await writeFile(
        join(temp, "tsconfig.json"),
        JSON.stringify({
            compilerOptions: {
                target: "ES2022",
                module: "NodeNext",
                moduleResolution: "NodeNext",
                strict: true,
                skipLibCheck: false,
                noUncheckedSideEffectImports: true,
                noEmit: true
            },
            include: ["check.ts"]
        })
    )
    console.log(
        `Checking packed SDK against declared viem minimum ${viemVersion}`
    )
    await run(
        [
            npm,
            "install",
            "--ignore-scripts",
            "--no-audit",
            "--no-fund",
            "--registry=https://registry.npmjs.org"
        ],
        temp
    )

    const installed = join(temp, "node_modules/@zerodev/sdk")
    if ((await lstat(installed)).isSymbolicLink()) {
        throw new Error(
            "Consumer must use the packed SDK, not a workspace link"
        )
    }
    const installedManifest = JSON.parse(
        await readFile(join(installed, "package.json"), "utf8")
    )
    const installedViem = JSON.parse(
        await readFile(join(temp, "node_modules/viem/package.json"), "utf8")
    )
    if (
        (await realpath(installed)) !==
            join(await realpath(temp), "node_modules/@zerodev/sdk") ||
        installedManifest.version !== manifest.version ||
        installedManifest.peerDependencies.viem !==
            manifest.peerDependencies.viem ||
        installedViem.version !== viemVersion
    ) {
        throw new Error("Consumer did not install the current packed SDK")
    }
    await run(
        [
            "node",
            join(temp, "node_modules/typescript/bin/tsc"),
            "--project",
            "tsconfig.json"
        ],
        temp
    )
    console.log(`Packed SDK declarations type-check with viem ${viemVersion}`)
} finally {
    // Remove only this invocation's absolute directory, validated above.
    await rm(temp, { recursive: true, force: true })
}
