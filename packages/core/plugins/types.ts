import {
  Account,
  Address,
  Chain,
  Client,
  Hex,
  LocalAccount,
  Transport,
} from "viem";
import { type UserOperation } from "../types/userOperation";
import { ExecutorData } from "./toSessionKeyValidatorPlugin";

export type KernelPlugin<
  Name extends string = string,
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain | undefined
> = LocalAccount<Name> & {
  signer: Account;
  client: Client<transport, chain>;
  entryPoint: Address;
  getNonceKey: () => Promise<bigint>;
  getDummySignature(accountAddress: Address, calldata:Hex, pluginEnableSignature?: Hex): Promise<Hex>;
  signUserOperation: (
    UserOperation: UserOperation,
    pluginEnableSignature?: Hex
  ) => Promise<Hex>;
  getValidatorSignature: (accountAddress: Address) => Promise<Hex>;
  getEnableData(kernelAccountAddress?: Address): Promise<Hex>;
  getPluginApproveSignature(
    accountAddress: Address,
    plugin: KernelPlugin
  ): Promise<Hex>;
  getExecutorData(): ExecutorData;
};

export enum ValidatorMode {
  sudo = "0x00000000",
  plugin = "0x00000001",
  enable = "0x00000002",
}
