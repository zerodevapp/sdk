import type { Hex } from "viem";
import type { ZeroDevProvider } from "../provider";
import type { Paymaster } from "./base";

export type SupportedGasToken = "USDC" | "PEPE" | "TEST_ERC20";

export type PaymasterPolicy = "VERIFYING_PAYMASTER" | "TOKEN_PAYMASTER";

interface PaymasterConfigOptions {
    VERIFYING_PAYMASTER: {};
    TOKEN_PAYMASTER: { gasToken: SupportedGasToken };
}

export type PaymasterConfig<T extends PaymasterPolicy> = {
    policy: T,
} & PaymasterConfigOptions[T];
export interface IGasTokenAddresses {
    [key: string]: {
        [chainId: number]: Hex;
    };
}

export interface IPaymaster<T extends PaymasterPolicy> {
    new(provider: ZeroDevProvider, paymasterConfig: PaymasterConfig<T>): Paymaster;
}

export type PaymasterMap = {
    [P in PaymasterPolicy]: IPaymaster<P>
};


