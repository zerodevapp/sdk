# Clients

- Keep bundlerClient
- Remove smartAccountClient
  - Since it doesn't make sense to tie signer to account client
  - Having a signer client is better abstraction
- Use wallet client abs for signer
- smartAccount actions

  - doesn't makes sense

- BundlerClient

  - sendUserOperation(fullSignedUserOp,...)
  - estimateUserOperationGas(partialUserOp,...)
  - eth_maxPriorityFeePerGas

- PaymasterClient

  - getPaymasterAndData(partialUserOp)
    -> PND
    -> gas limits
  - getPaymasterAddress

- SignerClient
  - signMessage
  - signTypedData
  - getAddress

```ts
type SmartAccountSigner = Account /*Viem Account*/ && {
  signMessage: (msg: Uint8Array | Hex | string) => Promise<Hash>;
  signTypedData: (params: SignTypedDataParams) => Promise<Hash>;
  getAddress: () => Promise<Address>;
};
type toSmartAccountSigner = (
  source: AccountSource, // Viem AccountSource
): GetAccountReturnType<AccountSource>;

// Can implement different Account signer like below
// toFireblocksAccountSigner
// toTurnKeyAccountSigner
```

- Account
  - getAddress
  - getNonce
  - getAccountInitCode
  - encodeCall
    - encodeExecute
    - encodeExecuteDelegate
    - encodeBatchExecute
  - sign methods
    - signMessageWith6492
    - signTypedDataWith6492
    - signMessage
    - signTypedData
    - signUserOp

```ts
export type SmartAccount<
  Name extends string = string,
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain | undefined
> = LocalAccount<Name> & {
  client: Client<transport, chain>;
  entryPoint: Address;
  getNonce: () => Promise<bigint>;
  getInitCode: () => Promise<Hex>;
  encodeCallData: (
    args:
      | {
          to: Address;
          value: bigint;
          data: Hex;
        }
      | {
          to: Address;
          value: bigint;
          data: Hex;
        }[]
  ) => Promise<Hex>;
  signMessageWith6492: (msg: Uint8Array | Hex | string) => Promise<Hash>;
  signTypedDataWith6492: (params: SignTypedDataParams) => Promise<Hash>;
  signUserOperation: (UserOperation: UserOperation) => Promise<Hex>;
};
```

- Validator/Plugin
  - sign methods
    - signMessage
    - signTypedData
    - signUserOp
  - getSignature (validator specific data can be encoded inside sig)
    - dummy variant
  - getNonceKey
  - getCalldata

```ts
export type Plugin<
    Name extends string = string,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = LocalAccount<Name> & {
  getDynamicDummySignature: (msg: Uint8Array | Hex | string) => Promise<Hash>;
  getDummyUserOperationSignature: (calldata: Hex) => Promise<Hex>;
  getSignature: (msg: Uint8Array | Hex | string) => Promise<Hash>;
  signUserOperation: (UserOperation: UserOperation) => Promise<Hex>;
  getNonceKey: () => Promise<Hex>;
  getCalldata: (UserOperation: UserOperation) => Promise<Hex>;
}
```
