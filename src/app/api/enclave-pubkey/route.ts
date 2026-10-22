import { NextResponse } from "next/server";
import { getEnclaveAttestationReport } from "@/lib/enclaveKeyVault";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = getEnclaveAttestationReport();
  return NextResponse.json({
    enclaveId: "0g-sealed-tee-node-mumbai-01",
    publicKeyPem: report.enclavePublicKeyPem,
    publicKey: report.enclavePublicKeyPem,
    signingPublicKeyPem: report.signingPublicKeyPem,
    measurementHash: report.measurementHash,
    teeProvider: report.teeProvider,
    supportedAlgorithms: ["RSA-OAEP-SHA256", "AES-256-GCM"],
    attestationContract: "0x8849b291d2938192a019e091b29a8f237190abcd",
    zeroGStorageNode: process.env.NEXT_PUBLIC_0G_INDEXER_RPC || "https://indexer-storage-testnet-turbo.0g.ai",
  });
}
