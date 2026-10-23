import { NextRequest, NextResponse } from "next/server";
import { decryptBuyerOutput } from "@shunya/core";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { encryptedOutputBase64, ivHex, authTagHex, kReturnBase64 } = body;

    if (!encryptedOutputBase64 || !ivHex || !authTagHex || !kReturnBase64) {
      return NextResponse.json(
        { error: "Missing required fields: encryptedOutputBase64, ivHex, authTagHex, kReturnBase64" },
        { status: 400 }
      );
    }

    const decrypted = decryptBuyerOutput(
      encryptedOutputBase64,
      ivHex,
      authTagHex,
      kReturnBase64
    );

    return NextResponse.json({
      success: true,
      aiOutputText: decrypted.aiOutputText,
      reasoningText: decrypted.reasoningText,
    });
  } catch (err: any) {
    console.error("[DecryptFallbackAPI] Decryption error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to decrypt output via fallback" },
      { status: 500 }
    );
  }
}
