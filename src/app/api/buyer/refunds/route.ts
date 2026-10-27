import { NextRequest, NextResponse } from "next/server";
import { buyerRefundEngine } from "@shunya/core";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (address) {
    const refunds = buyerRefundEngine.getRefundsForBuyer(address);
    return NextResponse.json({
      success: true,
      address,
      refunds,
    });
  }

  const refunds = buyerRefundEngine.getAllRefunds();
  return NextResponse.json({
    success: true,
    totalRefunds: refunds.length,
    refunds,
  });
}
