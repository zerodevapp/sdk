// Builds every workspace package that has a build script. A package starts as
// soon as the workspace packages it depends on are built (they compile against
// each other's _types), so independent plugins build in parallel.
import { cpus } from "node:os"

const dirs = [
    ...new Bun.Glob("{packages,plugins}/*/package.json").scanSync(".")
].map((p) => p.replace("/package.json", ""))

const pkgs = new Map<string, { dir: string; deps: string[] }>()
for (const dir of dirs) {
    const json = await Bun.file(`${dir}/package.json`).json()
    if (!json.scripts?.build) continue
    const deps = Object.keys({
        ...json.dependencies,
        ...json.peerDependencies,
        ...json.devDependencies
    })
    pkgs.set(json.name, { dir, deps })
}
for (const pkg of pkgs.values()) pkg.deps = pkg.deps.filter((d) => pkgs.has(d))

// Each package runs three tsc passes; cap parallel builds by CPU count.
let slots = Math.max(1, cpus().length - 1)
const waiting: (() => void)[] = []
const slot = async () => {
    if (slots > 0) slots--
    else await new Promise<void>((r) => waiting.push(r))
}
const release = () => {
    const next = waiting.shift()
    if (next) next()
    else slots++
}

const builds = new Map<string, Promise<boolean>>()
const build = (name: string): Promise<boolean> => {
    let p = builds.get(name)
    if (p) return p
    const pkg = pkgs.get(name)
    if (!pkg) throw new Error(`Unknown package ${name}`)
    const { dir, deps } = pkg
    p = (async () => {
        const depsOk = (await Promise.all(deps.map(build))).every(Boolean)
        if (!depsOk) {
            console.log(`⏩ ${dir}: skipped, a dependency failed`)
            return false
        }
        await slot()
        const start = performance.now()
        const proc = Bun.spawn(["bun", "run", "build"], {
            cwd: dir,
            stdout: "pipe",
            stderr: "pipe"
        })
        const [out, err, code] = await Promise.all([
            new Response(proc.stdout).text(),
            new Response(proc.stderr).text(),
            proc.exited
        ])
        release()
        const secs = ((performance.now() - start) / 1000).toFixed(0)
        if (code === 0) {
            console.log(`✅ ${dir} (${secs}s)`)
            return true
        }
        console.log(`❌ ${dir} (${secs}s)\n${out}${err}`)
        return false
    })()
    builds.set(name, p)
    return p
}

const results = await Promise.all([...pkgs.keys()].map(build))
const failed = results.filter((ok) => !ok).length
console.log(failed ? `\n${failed} package(s) failed` : "\nAll packages built")
process.exit(failed ? 1 : 0)
