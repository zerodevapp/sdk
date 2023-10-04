import axios from "axios";
import { BACKEND_URL } from "../constants.js";
import type { Hex } from "viem";

export const getChainId = async (
  projectId: string,
  backendUrl?: string
): Promise<number | undefined> => {
  try {
    const {
      data: { chainId },
    } = await axios.post(
      `${backendUrl ?? BACKEND_URL}/v1/projects/get-chain-id`,
      {
        projectId,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return chainId;
  } catch (error) {
    console.log(error);
    return undefined;
  }
};

export const getRecoveryData = async (recoveryId: string) => {
  try {
    const { data } = await axios.get(
      `${BACKEND_URL}/v1/recovery/${recoveryId}`,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return data;
  } catch (error) {
    console.log(error);
    return undefined;
  }
};

export const postRecoveryData = async (
  enableData: Hex,
  scwAddress: Hex,
  recoveryConfig: string
): Promise<string | undefined> => {
  try {
    const {
      data: { recoveryId },
    } = await axios.post(
      `${BACKEND_URL}/v1/recovery`,
      {
        enableData,
        scwAddress,
        recoveryConfig,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return recoveryId;
  } catch (error) {
    console.log(error);
    return undefined;
  }
};

export const setSignatures = async (recoveryId: string, signatures: string) => {
  try {
    const { data } = await axios.patch(
      `${BACKEND_URL}/v1/recovery/${recoveryId}`,
      {
        signatures,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return data;
  } catch (error) {
    console.log(error);
  }
};
