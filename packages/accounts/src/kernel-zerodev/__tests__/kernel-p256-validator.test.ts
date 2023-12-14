// kernel-p256-validator.test.ts

import { expect } from "chai";
import { P256Validator } from "../validator/p256-validator.js";
import { P256Provider } from "../validator-provider/p256-provider.js";
import { config } from "./config/index.js";
import { polygonMumbai } from "viem/chains";
import { type SignTypedDataParams } from "@alchemy/aa-core";
import {
  type Hash,
  type Hex,
  keccak256,
  hashTypedData,
  toBytes,
  encodeFunctionData,
  http,
  createPublicClient,
  toHex,
  concatHex,
} from "viem";
import { ec as EC } from "elliptic";
import { TEST_ERC20Abi } from "../abis/Test_ERC20Abi.js";
import { CHAIN_ID_TO_NODE, P256_VALIDATOR_ADDRESS } from "../constants.js";
import { randomHexString } from "../utils.js";
import { P256ValidatorAbi } from "../abis/P256ValidatorAbi.js";

const client = createPublicClient({
  chain: polygonMumbai,
  transport: http(CHAIN_ID_TO_NODE[polygonMumbai.id]),
});

const ec = new EC("p256");
const keyPair = ec.genKeyPair();

const validatorParams = {
  keyPair,
  projectId: config.projectIdWithGasSponsorship,
  chain: polygonMumbai,
};

function createSignatureObject(signature: string) {
  const signatureBuffer = Buffer.from(signature.slice(2), "hex");
  return {
    r: signatureBuffer.subarray(0, 32).toString("hex"),
    s: signatureBuffer.subarray(32).toString("hex"),
  };
}

describe("P256 Validator Test", function () {
  let p256Validator: P256Validator;

  beforeEach(async () => {
    p256Validator = await P256Validator.init(validatorParams);
  });

  it("should properly initialize", () => {
    expect(p256Validator).to.be.instanceOf(P256Validator);
  });

  it("should initialize with the correct public key", async () => {
    const publicKey = keyPair.getPublic();
    expect(p256Validator.publicKey).to.eql(publicKey);
  });

  it("should correctly sign the message", async () => {
    const message = "Hello world!";
    const signature = await p256Validator.signMessage(message);

    const signatureObject = createSignatureObject(signature);

    const isValid = keyPair.verify(
      keccak256(toBytes(message)),
      signatureObject
    );
    expect(isValid).to.equal(true);
  });

  it("should correctly sign typed data", async () => {
    const domain = {
      name: "Ether Mail",
      version: "1",
      chainId: 1,
      verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
    } as const;

    // The named list of all type definitions
    const types = {
      Person: [
        { name: "name", type: "string" },
        { name: "wallet", type: "address" },
      ],
      Mail: [
        { name: "from", type: "Person" },
        { name: "to", type: "Person" },
        { name: "contents", type: "string" },
      ],
    } as const;

    const value = {
      from: {
        name: "Cow",
        wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
      },
      to: {
        name: "Bob",
        wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
      },
      contents: "Hello, Bob!",
    };

    const typedData: SignTypedDataParams = {
      domain,
      types,
      message: value,
      primaryType: "Mail",
    };

    const hash = hashTypedData(typedData);

    const hashBytes = toBytes(hash);

    const signature = await p256Validator.signTypedData(typedData);
    expect(signature).to.match(/^0x[0-9a-fA-F]+$/);

    const signatureObject = createSignatureObject(signature);

    const valid = ec.verify(hashBytes, signatureObject, keyPair);
    expect(valid).to.equal(true);
  });

  it("should not be susceptible to signature malleability", async () => {
    const userOpHash = randomHexString(32);
    const signature = keyPair.sign(userOpHash, { canonical: true });

    const malleableSignature = Buffer.concat([
      signature.r.toArrayLike(Buffer, "be", 32),
      Buffer.from([signature.s.toArrayLike(Buffer, "be", 32)[0] ^ 0x01]), // Flip a bit
      signature.s.toArrayLike(Buffer, "be", 32).slice(1),
    ]);

    const signatureObject = {
      r: malleableSignature.subarray(0, 32).toString("hex"),
      s: malleableSignature.subarray(32).toString("hex"),
    };

    const isValid = ec.verify(toBytes(userOpHash), signatureObject, keyPair);
    expect(isValid).to.be.equal(false);
  });

  it(
    "should send userop with p256 validator",
    async () => {
      const p256Provider = await P256Provider.init({
        projectId: config.projectIdWithGasSponsorship,
        keyPair,
        bundlerProvider: "ALCHEMY",
        usePaymaster: true,
        opts: {
          accountConfig: {
            index: 70004n,
          },
          paymasterConfig: { policy: "VERIFYING_PAYMASTER" },
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });

      const accountAddress = await p256Provider.getAccount().getAddress();

      const balanceBefore = await client.readContract({
        address: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [accountAddress],
      });
      const mintData = encodeFunctionData({
        abi: TEST_ERC20Abi,
        args: [accountAddress, 700000000000000000n],
        functionName: "mint",
      });

      const result = await p256Provider.sendUserOperation({
        target: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
        data: mintData,
        value: 0n,
      });

      await p256Provider.waitForUserOperationTransaction(result.hash as Hash);
      const balanceAfter = await client.readContract({
        address: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
        abi: TEST_ERC20Abi,
        functionName: "balanceOf",
        args: [accountAddress],
      });
      expect(Number(balanceAfter.toString())).to.eq(
        Number((balanceBefore + 700000000000000000n).toString())
      );
    },
    { timeout: 100000 }
  );

  it(
    "should send userop to change owner",
    async () => {
      const p256Provider = await P256Provider.init({
        projectId: config.projectIdWithGasSponsorship,
        keyPair,
        bundlerProvider: "ALCHEMY",
        usePaymaster: true,
        opts: {
          accountConfig: {
            index: 70004n,
          },
          paymasterConfig: { policy: "VERIFYING_PAYMASTER" },
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });

      const accountAddress = await p256Provider.getAccount().getAddress();

      const keypair2 = ec.genKeyPair();

      const x = toHex(
        keypair2.getPublic().getX().toArrayLike(Buffer, "be", 32)
      ) as Hex;
      const y = toHex(
        keypair2.getPublic().getY().toArrayLike(Buffer, "be", 32)
      ) as Hex;

      const newOwner = concatHex([x, y]);

      const enableData = p256Provider.getValidator().encodeEnable(newOwner);
      let tx = await p256Provider.sendUserOperation({
        target: P256_VALIDATOR_ADDRESS,
        data: enableData,
      });
      await p256Provider.waitForUserOperationTransaction(tx.hash as Hash);

      const owner = await createPublicClient({
        chain: polygonMumbai,
        transport: http(CHAIN_ID_TO_NODE[polygonMumbai.id]),
      }).readContract({
        address: P256_VALIDATOR_ADDRESS,
        abi: P256ValidatorAbi,
        functionName: "p256PublicKey",
        args: [accountAddress],
      });

      const ownerX = toHex(owner[0]) as Hex;
      const ownerY = toHex(owner[1]) as Hex;

      const ownerHex = concatHex([ownerX, ownerY]);

      expect(ownerHex).to.equal(newOwner);
    },
    { timeout: 100000 }
  );
});
