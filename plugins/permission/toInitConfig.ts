import {
  concat,
  encodeFunctionData,
  getAbiItem,
  pad,
  toFunctionSelector,
  zeroAddress,
  type Hex,
} from "viem";
import type { PermissionPlugin } from "./types.js";
import { KernelV3_3AccountAbi } from "@zerodev/sdk";
import { VALIDATOR_TYPE } from "@zerodev/sdk/constants";

export async function toInitConfig(
  permissionPlugin: PermissionPlugin
): Promise<Hex[]> {
  const permissionInstallFunctionData = encodeFunctionData({
    abi: KernelV3_3AccountAbi,
    functionName: "installValidations",
    args: [
      [
        pad(
          concat([VALIDATOR_TYPE.PERMISSION, permissionPlugin.getIdentifier()]),
          { size: 21, dir: "right" }
        ),
      ],
      [{ nonce: 1, hook: zeroAddress }],
      [await permissionPlugin.getEnableData()],
      ["0x"],
    ],
  });
  const grantAccessFunctionData = encodeFunctionData({
    abi: KernelV3_3AccountAbi,
    functionName: "grantAccess",
    args: [
      pad(
        concat([VALIDATOR_TYPE.PERMISSION, permissionPlugin.getIdentifier()]),
        { size: 21, dir: "right" }
      ),
      toFunctionSelector(
        getAbiItem({ abi: KernelV3_3AccountAbi, name: "execute" })
      ),
      true,
    ],
  });
  return [permissionInstallFunctionData, grantAccessFunctionData];
}
