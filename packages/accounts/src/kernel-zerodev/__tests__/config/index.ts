import { polygonMumbai } from "viem/chains";
import { generatePrivateKey } from "viem/accounts";
import { type Hex } from "viem";

export const config = {
  privateKey: (process.env.PRIVATE_KEY as Hex) ?? generatePrivateKey(),
  ownerWallet: process.env.OWNER_WALLET,
  mockWallet: "0x48D4d3536cDe7A257087206870c6B6E76e3D4ff4",
  chain: polygonMumbai,
  rpcProvider: "https://mumbai-bundler.etherspot.io/",
  validatorAddress: "0xd9AB5096a832b9ce79914329DAEE236f8Eea0390" as Hex,
  accountFactoryAddress: "0x5de4839a76cf55d0c90e2061ef4386d962E15ae3" as Hex,
  entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as Hex,
  // Turn off all policies related to gas sponsorship for this projectId
  // To make all the testcases pass
  projectId: "8db3f9f0-f8d0-4c69-9bc6-5c522ee25844",
  projectIdWithGasSponsorship: "c73037ef-8c0b-48be-a581-1f3d161151d3",
};
