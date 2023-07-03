import axios from "axios";
import { BACKEND_URL } from "../constants";

export const getChainId = async (
    projectId: string,
    backendUrl?: string
): Promise<number | undefined> => {
    try {
        const { data: {chainId} } = await axios.post(
            `${backendUrl ?? BACKEND_URL}/v1/projects/get-chain-id`, {
            projectId
        },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );
        return chainId;
    } catch (error) {
        console.log(error);
        return undefined;
    }
};