import { NextRequest, NextResponse } from "next/server";
import { calculateSellerBalance } from "@shunya/core";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawAccountId = searchParams.get("accountId");

    const result = await calculateSellerBalance(rawAccountId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[SellerBalanceAPI] Unhandled error:", error);
    const isClientError = error.message?.includes("Invalid Hedera Account ID");
    return NextResponse.json(
      { error: error.message || "Failed to fetch Hedera seller balance" },
      { status: isClientError ? 400 : 500 }
    );
  }
}
