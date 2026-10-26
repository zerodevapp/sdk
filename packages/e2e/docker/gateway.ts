// Local stand-in for meta-aa-provider's Ultra Relay sponsored path
// (meta-aa-provider src/api/v3/controllers/{paymaster,bundler}Controller.ts).
// ponytail: mimics only the UR-sponsored branch; the network tier in
// packages/test exercises the real gateway.

type Upstreams = Record<string, { bundler: string; node: string }>
type JsonRpcRequest = {
    jsonrpc: "2.0"
    id: number | string | null
    method: string
    params?: unknown[]
}
type UserOp = Record<string, unknown>

const ZERO_FEES = { maxFeePerGas: "0x0", maxPriorityFeePerGas: "0x0" }

// meta-aa-provider sends these to the bundler and everything else (eth_call,
// eth_getCode, ...) to the chain's node (shared/utils/bundlerUtils.ts
// isERC4337RpcMethod).
const ERC4337_METHODS = new Set([
    "eth_sendUserOperation",
    "eth_estimateUserOperationGas",
    "eth_getUserOperationReceipt",
    "eth_getUserOperationByHash",
    "eth_supportedEntryPoints",
    "eth_maxPriorityFeePerGas",
    "rundler_maxPriorityFeePerGas",
    "pimlico_getUserOperationGasPrice",
    "pimlico_getUserOperationStatus",
    "thirdweb_getUserOperationGasPrice",
    "zd_getUserOperationGasPrice",
    "zd_sponsorUserOperation",
    "zd_pm_accounts",
    "alchemy_requestPaymasterAndData",
    "stackup_getERC20TokenQuotes",
    "pm_getPaymasterData",
    "pm_getPaymasterStubData",
    "eth_callUserOperation"
])
const ROUTE = /^\/api\/v3\/([^/]+)\/chain\/(\d+)\/?$/
// meta-aa-provider returns real fees for UR projects without gas policies.
const UNSPONSORED_PROJECT = "unsponsored"

// Only quantity fields: "0x" is never a valid zero for r/s/address, and
// rewriting those would mask a malformed signature
// (meta-aa-provider shared/utils/helper.ts normalizeEip7702Auth).
const AUTH_QUANTITY_FIELDS = ["nonce", "chainId", "yParity", "v"]

function normalizeAuth(auth: unknown) {
    if (!auth || typeof auth !== "object") return auth
    const out: Record<string, unknown> = { ...auth }
    for (const field of AUTH_QUANTITY_FIELDS) {
        if (out[field] === "0x") out[field] = "0x0"
    }
    return out
}

// Same fix-ups meta-aa-provider applies before forwarding to UR:
// both 7702 auth aliases get normalizeEip7702Auth (normalizeUserOpEip7702);
// zd_sponsorUserOperation's UR branch renames authorization → eip7702Auth,
// overwriting any existing one (pm_* does not rename); v0.6 ops need
// paymasterAndData for UR's schema (normalizeUserOpForUpstreamEstimate).
export function normalizeUserOp(
    userOp: UserOp,
    { renameAuthorization = false }: { renameAuthorization?: boolean } = {}
): UserOp {
    const op: UserOp = { ...userOp }
    if (op.authorization) op.authorization = normalizeAuth(op.authorization)
    if (op.eip7702Auth) op.eip7702Auth = normalizeAuth(op.eip7702Auth)
    if (renameAuthorization && op.authorization) {
        op.eip7702Auth = op.authorization
        op.authorization = undefined
    }
    if (
        typeof op.initCode === "string" &&
        typeof op.paymasterAndData !== "string"
    ) {
        op.paymasterAndData = "0x"
    }
    // Drops keys set to undefined above.
    return JSON.parse(JSON.stringify(op))
}

async function forward(upstream: string, body: JsonRpcRequest) {
    const res = await fetch(upstream, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
    })
    return res.json()
}

function estimate(
    upstream: string,
    id: JsonRpcRequest["id"],
    userOp: UserOp,
    entryPointAddress: string
) {
    return forward(upstream, {
        jsonrpc: "2.0",
        id,
        method: "eth_estimateUserOperationGas",
        params: [userOp, entryPointAddress]
    })
}

async function handleRpc(
    { bundler: upstream, node }: Upstreams[string],
    req: JsonRpcRequest,
    sponsored: boolean
) {
    if (!ERC4337_METHODS.has(req.method)) return forward(node, req)
    switch (req.method) {
        case "zd_getUserOperationGasPrice":
            if (!sponsored) {
                return forward(upstream, {
                    ...req,
                    method: "pimlico_getUserOperationGasPrice"
                })
            }
            return {
                jsonrpc: "2.0",
                id: req.id,
                result: {
                    slow: ZERO_FEES,
                    standard: ZERO_FEES,
                    fast: ZERO_FEES
                }
            }
        case "zd_sponsorUserOperation": {
            const { userOp, entryPointAddress } = (req.params?.[0] ?? {}) as {
                userOp: UserOp
                entryPointAddress: string
            }
            return estimate(
                upstream,
                req.id,
                normalizeUserOp(userOp, { renameAuthorization: true }),
                entryPointAddress
            )
        }
        case "pm_getPaymasterStubData":
        case "pm_getPaymasterData": {
            const [userOp, entryPointAddress] = (req.params ?? []) as [
                UserOp,
                string
            ]
            return estimate(
                upstream,
                req.id,
                normalizeUserOp(userOp),
                entryPointAddress
            )
        }
        default:
            return forward(upstream, req)
    }
}

export function createGateway(upstreams: Upstreams) {
    return async (request: Request): Promise<Response> => {
        const { pathname } = new URL(request.url)
        if (request.method === "GET" && pathname === "/health") {
            return new Response("ok")
        }
        const [, projectId, chainId] = pathname.match(ROUTE) ?? []
        const upstream = chainId ? upstreams[chainId] : undefined
        const sponsored = projectId !== UNSPONSORED_PROJECT
        if (!upstream) {
            return Response.json(
                { error: `unknown route ${pathname}` },
                { status: 404 }
            )
        }
        const body = await request.json()
        const result = Array.isArray(body)
            ? await Promise.all(
                  body.map((r: JsonRpcRequest) =>
                      handleRpc(upstream, r, sponsored)
                  )
              )
            : await handleRpc(upstream, body as JsonRpcRequest, sponsored)
        return Response.json(result)
    }
}

if (import.meta.main) {
    const upstreams = JSON.parse(process.env.GATEWAY_UPSTREAMS ?? "{}")
    const port = Number(process.env.PORT ?? 4000)
    Bun.serve({ port, fetch: createGateway(upstreams) })
    console.log(`gateway listening on :${port}`, upstreams)
}
