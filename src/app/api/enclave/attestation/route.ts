import { NextResponse } from "next/server";
import { getEnclaveAttestationReport } from "@/lib/enclaveKeyVault";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = getEnclaveAttestationReport();
  return NextResponse.json({
    status: "verified",
    ...report,
    publicKey: report.enclavePublicKeyPem,
    publicKeyPem: report.enclavePublicKeyPem,
  });
}
