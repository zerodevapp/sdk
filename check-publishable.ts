// npm Trusted Publishing rejects a publish whose package.json repository does
// not match the repo running the workflow. Every published package needs
// repository.url = this repo and repository.directory = its folder.
const url = "git+https://github.com/zerodevapp/sdk.git"

const problems: string[] = []
for (const file of new Bun.Glob("{packages,plugins}/*/package.json").scanSync(
    "."
)) {
    const pkg = await Bun.file(file).json()
    if (pkg.private === true) continue
    const directory = file.replace("/package.json", "")
    if (pkg.repository?.url !== url || pkg.repository?.directory !== directory)
        problems.push(
            `${pkg.name}: repository must be { "url": "${url}", "directory": "${directory}" }`
        )
}

if (problems.length > 0) {
    console.error(problems.join("\n"))
    process.exit(1)
}
console.log("All published packages have a matching repository field.")
