import { NextRequest, NextResponse } from "next/server";
import {
  verifyApiKeyWithProvider,
  getOrCreateEnclaveKeyPair,
  unwrapSellerApiKey,
  cleanApiKey,
} from "@shunya/core";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, model, sealedApiKey, apiKey } = body || {};
    const sealed = (sealedApiKey || apiKey || "").trim();

    if (!provider || !model || !sealed) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: "Missing required fields: provider, model, and sealedApiKey must be provided.",
        },
        { status: 400 }
      );
    }

    // Unwrap sealed key server-side using enclave private key
    let rawKey = "";
    try {
      const { privateKey } = getOrCreateEnclaveKeyPair();
      rawKey = cleanApiKey(unwrapSellerApiKey(sealed, privateKey));
      if (!rawKey) {
        throw new Error("Unwrapped API key is empty");
      }
    } catch (unwrapErr: any) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: `Malformed sealed API key envelope: ${unwrapErr?.message || "RSA-OAEP unwrap failure"}`,
        },
        { status: 400 }
      );
    }

    // Call provider API to test the key and query model & remaining tokens
    const result = await verifyApiKeyWithProvider(provider, model, rawKey);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("API key verification error:", err);
    return NextResponse.json(
      {
        success: false,
        valid: false,
        error: `Failed to verify API key: ${err.message}`,
      },
      { status: 500 }
    );
  }
}
