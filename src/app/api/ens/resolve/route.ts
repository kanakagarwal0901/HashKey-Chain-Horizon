import { NextRequest, NextResponse } from "next/server";
import { realEnsService } from "@shunya/core";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const owner = searchParams.get("owner");

  if (!name) {
    return NextResponse.json({ error: "Name query parameter is required" }, { status: 400 });
  }

  const cleanName = name.trim().toLowerCase();

  try {
    if (owner) {
      const verification = await realEnsService.verifyNameOwnership(cleanName, owner);
      return NextResponse.json({
        success: true,
        name: cleanName,
        address: verification.resolvedAddress,
        verified: verification.verified,
        avatarUrl: verification.avatarUrl,
        error: verification.error,
      });
    }

    const result = await realEnsService.resolveName(cleanName);
    return NextResponse.json({
      success: true,
      name: cleanName,
      address: result.address,
      avatarUrl: result.avatarUrl,
    });
  } catch (err: any) {
    console.error("[API /api/ens/resolve] Error:", err?.message || err);
    return NextResponse.json(
      {
        success: false,
        name: cleanName,
        address: null,
        avatarUrl: null,
        error: err?.message || "Failed to resolve ENS name",
      },
      { status: 500 }
    );
  }
}
