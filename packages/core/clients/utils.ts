export const setPimlicoAsProvider = (urlString: string): string => {
    const url = new URL(urlString)

    const params = url.searchParams

    if (params.has("bundlerProvider")) {
        params.set("bundlerProvider", "PIMLICO")
    } else if (params.has("paymasterProvider")) {
        params.set("paymasterProvider", "PIMLICO")
    } else {
        params.set("provider", "PIMLICO")
    }

    url.search = params.toString()

    return url.toString()
}

export const isProviderSet = (urlString: string, provider: string): boolean => {
    const url = new URL(urlString)
    const params = url.searchParams
    const _provider =
        params.get("provider") ??
        params.get("bundlerProvider") ??
        params.get("paymasterProvider")
    if (_provider === provider) return true
    return false
}
