import { NextRequest, NextResponse } from "next/server";
import { verifyApiKeyWithProvider } from "@shunya/core";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, model, apiKey } = body || {};

    if (!provider || !model || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: "Missing required fields: provider, model, and apiKey must be provided.",
        },
        { status: 400 }
      );
    }

    // Call provider API to test the key and query model & remaining tokens
    const result = await verifyApiKeyWithProvider(provider, model, apiKey);

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
