import { NextRequest, NextResponse } from "next/server";
import { realEnsService } from "@shunya/core";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address query parameter is required" }, { status: 400 });
  }

  const cleanAddr = address.trim();
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!ethAddressRegex.test(cleanAddr)) {
    return NextResponse.json({ error: "Invalid Ethereum address format" }, { status: 400 });
  }

  try {
    const result = await realEnsService.lookupAddress(cleanAddr);
    return NextResponse.json({
      success: true,
      address: result.address,
      ensName: result.ensName,
      avatarUrl: result.avatarUrl,
    });
  } catch (err: any) {
    console.error("[API /api/ens/reverse] Error:", err?.message || err);
    return NextResponse.json(
      {
        success: false,
        address: cleanAddr,
        ensName: null,
        avatarUrl: null,
        error: err?.message || "Failed to reverse resolve ENS",
      },
      { status: 500 }
    );
  }
}
