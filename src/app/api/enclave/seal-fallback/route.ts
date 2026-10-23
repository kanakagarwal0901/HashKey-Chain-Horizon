import { NextRequest, NextResponse } from "next/server";
import { sealBuyerPromptAndFiles, getOrCreateEnclaveKeyPair } from "@shunya/core";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promptText, files = [], enclavePublicKeyPem } = body;

    if (!promptText && (!files || files.length === 0)) {
      return NextResponse.json({ error: "Missing promptText or files" }, { status: 400 });
    }

    const keyPem = enclavePublicKeyPem || getOrCreateEnclaveKeyPair().publicKey;

    const fileBuffers = (files || []).map((f: any) => ({
      filename: f.filename || "file.txt",
      mimeType: f.mimeType || "text/plain",
      data: Buffer.from(f.base64Data || "", "base64"),
    }));

    const sealed = sealBuyerPromptAndFiles(promptText || "", fileBuffers, keyPem);

    return NextResponse.json({
      success: true,
      buyerLocalReturnKeyBase64: sealed.buyerLocalReturnKeyBase64,
      encryptedEnvelope: sealed.encryptedEnvelope,
    });
  } catch (err: any) {
    console.error("[SealFallbackAPI] Sealing error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to seal prompt via fallback" },
      { status: 500 }
    );
  }
}
