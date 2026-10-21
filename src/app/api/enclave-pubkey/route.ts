import { NextResponse } from "next/server";
import { getOrCreateEnclaveKeyPair } from "@shunya/core";

export async function GET() {
  const { publicKey } = getOrCreateEnclaveKeyPair();
  return NextResponse.json({
    enclaveId: "0g-sealed-tee-node-mumbai-01",
    publicKeyPem: publicKey,
    supportedAlgorithms: ["RSA-OAEP-SHA256", "AES-256-GCM"],
    attestationContract: "0x8849b291d2938192a019e091b29a8f237190abcd",
    zeroGStorageNode: "https://rpc-storage-testnet.0g.ai",
  });
}
