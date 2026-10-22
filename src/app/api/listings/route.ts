import { NextRequest, NextResponse } from "next/server";
import {
  arkivDb,
  worldIdService,
  ensService,
  getOrCreateEnclaveKeyPair,
  unwrapSellerApiKey,
  getMinimumListingQuotaForModel,
  verifyApiKeyWithProvider,
} from "@shunya/core";

function sanitizeListings(listings: any[]) {
  return listings.map((l) => {
    const { sealedApiKey, ...rest } = l;
    return { ...rest, hasSealedKey: Boolean(sealedApiKey) };
  });
}

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
      listings: sanitizeListings(eligible),
    });
  }

  // Return all listings (sealedApiKey stripped for public orderbook privacy)
  const all = arkivDb.getAllListings();
  return NextResponse.json({
    success: true,
    currentBlock: arkivDb.getCurrentBlock(),
    count: all.length,
    listings: sanitizeListings(all),
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

    // 1. Valid Crypto Wallet Address Check
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(ownerAddress)) {
      return NextResponse.json(
        { error: "Invalid crypto wallet address: Must be a connected 42-character Ethereum address (0x...)" },
        { status: 400 }
      );
    }

    // 2. Minimum Token Quota Condition Check
    const minRequiredQuota = getMinimumListingQuotaForModel(model);
    if (Number(availableTokens) < minRequiredQuota) {
      return NextResponse.json(
        {
          error: `Insufficient quota: ${model} requires at least ${minRequiredQuota.toLocaleString()} tokens to satisfy the Zero-Cutoff listing condition.`,
        },
        { status: 400 }
      );
    }

    // 3. Enclave Pre-flight Key & Provider live test call validation
    let rawKey = "";
    try {
      const { privateKey } = getOrCreateEnclaveKeyPair();
      if (sealedApiKey.startsWith("ENCLAVE_SEALED:")) {
        rawKey = sealedApiKey.replace("ENCLAVE_SEALED:", "");
      } else {
        rawKey = unwrapSellerApiKey(sealedApiKey, privateKey);
      }
    } catch {
      return NextResponse.json({ error: "Malformed sealed API key envelope" }, { status: 400 });
    }

    // Perform live test call to the provider API to verify model access & remaining tokens
    const keyVerdict = await verifyApiKeyWithProvider(provider || "", model, rawKey);
    if (!keyVerdict.valid) {
      return NextResponse.json(
        {
          error: `API Key Verification Failed: ${keyVerdict.error || "The provider rejected this API key for the selected model."}`,
          details: keyVerdict,
        },
        { status: 400 }
      );
    }

    // 4. Verify World ID Proof (Mandatory for Seller Onboarding)
    if (!worldIdProof || !worldIdProof.nullifier_hash) {
      return NextResponse.json(
        { error: "World ID verification required: You must verify your human identity with World ID to list on Arkiv." },
        { status: 403 }
      );
    }

    const verifyRes = await worldIdService.verifyProof({
      action: "seller-listing",
      nullifier_hash: worldIdProof.nullifier_hash,
      merkle_root: worldIdProof.merkle_root,
      proof: worldIdProof.proof,
    });

    if (!verifyRes.success) {
      return NextResponse.json(
        { error: "World ID proof verification failed: Invalid proof or duplicate nullifier." },
        { status: 403 }
      );
    }

    const humanVerified = true;
    const nullifier = verifyRes.nullifier_hash;

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
