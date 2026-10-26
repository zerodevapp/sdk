// Runs docker compose for the local stack. A Bun file (not a package.json
// script) so that packages/e2e/.env is loaded and passed to compose.
const proc = Bun.spawn(
    [
        "docker",
        "compose",
        "--env-file",
        `${import.meta.dir}/stack.env`,
        "-f",
        `${import.meta.dir}/compose.yml`,
        ...process.argv.slice(2)
    ],
    { stdio: ["inherit", "inherit", "inherit"] }
)
process.exit(await proc.exited)
