import { NextRequest, NextResponse } from "next/server";
import { worldIdService } from "@shunya/core";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { nullifier_hash, merkle_root, proof, signal, action } = body;

    const result = await worldIdService.verifyProof({
      nullifier_hash,
      merkle_root,
      proof,
      signal,
      walletAddress: signal,
      action: action || "shunyagrid-gate",
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, verified: false, error: result.error || "World ID verification failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      nullifier_hash: result.nullifier_hash,
      message: "Proof of Human verified and registered successfully",
    });
  } catch (err: any) {
    console.error("World ID manual register error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to register World ID proof" },
      { status: 500 }
    );
  }
}
