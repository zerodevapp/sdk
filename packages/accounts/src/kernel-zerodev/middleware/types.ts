import type { BytesLike, Hex, UserOperationStruct } from "@alchemy/aa-core";

export type SupportedGasToken = "USDC" | "PEPE" | "TEST_ERC20";

export type PaymasterPolicy = "VERIFYING_PAYMASTER" | "TOKEN_PAYMASTER";

interface PaymasterConfigOptions {
    VERIFYING_PAYMASTER: {};
    TOKEN_PAYMASTER: { gasToken: SupportedGasToken };
}

export type PaymasterCommonConfig = {
    projectId: string,
    chainId: number,
}

export type PaymasterConfig<T extends PaymasterPolicy> = {
    policy: T,
} & PaymasterConfigOptions[T];

export interface IPaymasterDataMiddleware {
    paymasterConfig: PaymasterConfig<PaymasterPolicy>;
    commonCfg: PaymasterCommonConfig;
    getPaymasterResponse: (struct: UserOperationStruct, erc20Struct?: Partial<UserOperationStruct>) => Promise<UserOperationStruct>;
    signUserOp: (
        userOp: UserOperationStruct,
        callData?: BytesLike,
        gasTokenAddress?: string,
        erc20UserOp?: Partial<UserOperationStruct>,
        erc20CallData?: BytesLike
    ) => Promise<UserOperationStruct | undefined>;
}


export interface IPaymasterDataMiddlewareClass<T extends PaymasterPolicy> {
    new(paymasterConfig: PaymasterConfig<T>, commonCfg: PaymasterCommonConfig): IPaymasterDataMiddleware;
}

export type PaymasterMiddlewareMap = {
    [P in PaymasterPolicy]:  IPaymasterDataMiddlewareClass<P>
};

interface IGasTokenAddresses {
    [key: string]: {
        [chainId: number]: Hex;
    };
}

export const gasTokenChainAddresses: IGasTokenAddresses = {
    "USDC": {
        1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        // 5: "0x2f3A40A3db8a7e3D09B0adfEfbCe4f6F81927557",
        137: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        // 80001: "",
        // 420: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
        42161: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
        // 421613: "",
        43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"
        // 43113: "",
        // 56: "",
        // 97: ""
    },
    "PEPE": {
        1: "0x6982508145454Ce325dDbE47a25d4ec3d2311933"
    }
};

export function getGasTokenAddress(gasToken: SupportedGasToken, chainId: number): Hex | undefined {
    if (gasToken === "TEST_ERC20") {
        return "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B";
    }
    return gasTokenChainAddresses[gasToken][chainId] || undefined;
}
