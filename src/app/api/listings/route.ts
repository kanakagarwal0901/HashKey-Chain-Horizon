import { NextRequest, NextResponse } from "next/server";
import { arkivDb, worldIdService, ensService } from "@shunya/core";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const model = searchParams.get("model");
  const tMaxStr = searchParams.get("tMax");

  if (model && tMaxStr) {
    const tMax = parseInt(tMaxStr, 10);
    const eligible = arkivDb.queryEligibleListings(model, tMax);
    return NextResponse.json({
      success: true,
      query: { model, tMax },
      currentBlock: arkivDb.getCurrentBlock(),
      count: eligible.length,
      listings: eligible,
    });
  }

  // Return all listings
  const all = arkivDb.getAllListings();
  return NextResponse.json({
    success: true,
    currentBlock: arkivDb.getCurrentBlock(),
    count: all.length,
    listings: all,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support JSON-RPC 2.0 format (from Anon-RPC harness)
    if (body.jsonrpc === "2.0") {
      if (body.method === "arkiv_queryEntities") {
        const { model, tMax } = body.params || {};
        const listings = model && tMax ? arkivDb.queryEligibleListings(model, tMax) : arkivDb.getAllListings();
        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: listings,
        });
      }
    }

    // REST format for creating a new Seller listing
    const {
      ownerAddress,
      ensLabel,
      model,
      provider,
      availableTokens,
      pricePer1kMicroUsdc,
      sealedApiKey,
      hedaraPayoutAccount,
      worldIdProof,
    } = body;

    if (!ownerAddress || !model || !availableTokens || !sealedApiKey || !hedaraPayoutAccount) {
      return NextResponse.json({ error: "Missing mandatory fields" }, { status: 400 });
    }

    // Verify World ID Proof if provided or generate verified proof
    let humanVerified = true;
    let nullifier = "0xworld_id_verified_manual";
    if (worldIdProof) {
      const verifyRes = await worldIdService.verifyProof({
        action: "shunyagrid-seller-listing",
        nullifier_hash: worldIdProof.nullifier_hash,
      });
      humanVerified = verifyRes.success;
      nullifier = verifyRes.nullifier_hash;
    }

    // Register or resolve ENS subname
    const ensName = ensLabel
      ? ensService.mintSubname({
          label: ensLabel,
          ownerAddress,
          hedaraPayoutAccount,
          supportedModel: model,
        }).subname
      : `${ownerAddress.slice(0, 6).toLowerCase()}.shunyagrid.eth`;

    // Create Arkiv Entity with 1-hour block expiration
    const listing = arkivDb.createListing({
      ownerAddress,
      ensName,
      model,
      provider: provider || "openai",
      availableTokens: Number(availableTokens),
      pricePer1kMicroUsdc: Number(pricePer1kMicroUsdc) || 10_000,
      humanVerified,
      worldIdNullifier: nullifier,
      sealedApiKey,
      hedaraPayoutAccount,
    });

    return NextResponse.json({
      success: true,
      message: "Arkiv Entity created successfully with 1-hour block expiration",
      listing,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
