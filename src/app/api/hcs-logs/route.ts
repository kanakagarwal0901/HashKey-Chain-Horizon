import { NextResponse } from "next/server";
import { hederaEngine } from "@shunya/core";

export async function GET() {
  const receipts = hederaEngine.getReceipts();
  return NextResponse.json({
    success: true,
    hcsTopicId: "0.0.591300",
    receiptsCount: receipts.length,
    receipts,
  });
}
