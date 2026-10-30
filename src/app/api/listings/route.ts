export const dynamic = "force-dynamic";
export const revalidate = 0;

import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  arkivDb,
  worldIdService,
  ensService,
  realEnsService,
  getOrCreateEnclaveKeyPair,
  unwrapSellerApiKey,
  getMinimumListingQuotaForModel,
  verifyApiKeyWithProvider,
  getModelMetadata,
  cleanApiKey,
  remoteOrderbookSync,
} from "@shunya/core";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function sanitizeListings(listings: any[]) {
  return listings.map((l) => {
    const { sealedApiKey, ...rest } = l;
    return { ...rest, hasSealedKey: Boolean(sealedApiKey) };
  });
}

export async function GET(request: NextRequest) {
  try {
    await arkivDb.syncWithRemote();
  } catch (syncErr) {
    console.warn("[GET /api/listings] Cloud orderbook sync notice:", syncErr);
  }
  const { searchParams } = new URL(request.url);
  const model = searchParams.get("model");
  const tMaxStr = searchParams.get("tMax");
  const reload = searchParams.get("reload");

  if (reload === "true") {
    arkivDb.reloadFromDisk();
  }

  if (model && tMaxStr) {
    const tMax = parseInt(tMaxStr, 10);
    const eligible = arkivDb.queryEligibleListings(model, tMax);
    return NextResponse.json(
      {
        success: true,
        query: { model, tMax },
        currentBlock: arkivDb.getCurrentBlock(),
        count: eligible.length,
        listings: sanitizeListings(eligible),
      },
      { headers: noCacheHeaders }
    );
  }

  // Return all listings (sealedApiKey stripped for public orderbook privacy)
  const all = arkivDb.getAllListings();
  return NextResponse.json(
    {
      success: true,
      currentBlock: arkivDb.getCurrentBlock(),
      count: all.length,
      listings: sanitizeListings(all),
    },
    { headers: noCacheHeaders }
  );
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deleteId = searchParams.get("id");
  const reload = searchParams.get("reload");

  if (reload === "true") {
    try {
      const listingsPath = path.join(process.cwd(), ".data", "arkiv_listings.json");
      if (fs.existsSync(listingsPath)) {
        const raw = fs.readFileSync(listingsPath, "utf8");
        const list = JSON.parse(raw);
        if ((arkivDb as any).listings) {
          (arkivDb as any).listings.clear();
          for (const item of list) {
            (arkivDb as any).listings.set(item.id, item);
          }
        }
      }
    } catch (e) {
      console.error("Error reloading listings from disk:", e);
    }
    const all = arkivDb.getAllListings();
    return NextResponse.json(
      {
        success: true,
        message: "Arkiv orderbook reloaded from disk",
        count: all.length,
        listings: sanitizeListings(all),
      },
      { headers: noCacheHeaders }
    );
  }

  if (deleteId) {
    if (typeof (arkivDb as any)?.deleteListing === "function") {
      (arkivDb as any).deleteListing(deleteId);
    }
    const all = arkivDb.getAllListings();
    return NextResponse.json(
      {
        success: true,
        message: `Deleted listing ${deleteId}`,
        count: all.length,
        listings: sanitizeListings(all),
      },
      { headers: noCacheHeaders }
    );
  }

  if (typeof (arkivDb as any)?.clearOrderbook === "function") {
    arkivDb.clearOrderbook();
  } else {
    // Fallback if singleton is from a previous hot module
    if ((arkivDb as any)?.listings) {
      (arkivDb as any).listings.clear();
    }
    if ((arkivDb as any)?.entityMutexes) {
      (arkivDb as any).entityMutexes.clear();
    }
  }

  // Explicitly ensure on-disk persistence files are cleared
  try {
    const listingsPath = path.join(process.cwd(), ".data", "arkiv_listings.json");
    if (fs.existsSync(listingsPath)) {
      fs.writeFileSync(listingsPath, JSON.stringify([], null, 2), "utf8");
    }
    const mirrorPath = path.join(process.cwd(), ".data", "arkiv-entities-mirror.json");
    if (fs.existsSync(mirrorPath)) {
      fs.writeFileSync(mirrorPath, JSON.stringify({}, null, 2), "utf8");
    }
  } catch (err) {
    console.error("Error clearing on-disk orderbook files:", err);
  }

  try {
    await remoteOrderbookSync.pushRemoteListings([]);
  } catch {}

  return NextResponse.json(
    {
      success: true,
      message: "Orderbook cleared successfully",
      count: 0,
      listings: [],
    },
    { headers: noCacheHeaders }
  );
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
      sellerPayoutAddress,
      payoutAddress,
      worldIdProof,
    } = body;

    const resolvedPayout = (payoutAddress || sellerPayoutAddress || hedaraPayoutAccount || ownerAddress || "").trim();

    if (!ownerAddress || !model || !availableTokens || !sealedApiKey || !resolvedPayout) {
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
      rawKey = cleanApiKey(unwrapSellerApiKey(sealedApiKey, privateKey));
      if (!rawKey) {
        throw new Error("Unwrapped key is empty");
      }
    } catch (unwrapErr: any) {
      console.error("[Listings API] Failed to unwrap sealed API key:", unwrapErr?.message);
      return NextResponse.json(
        { error: `Malformed sealed API key envelope: ${unwrapErr?.message || "RSA-OAEP unwrap failure"}` },
        { status: 400 }
      );
    }

    // Determine the exact provider corresponding to this model
    const effectiveProvider = getModelMetadata(model)?.provider || provider || "";
    console.log(`[Listings API] Live key verification: model=${model}, provider=${effectiveProvider}, keyPrefix=${rawKey.slice(0, 8)}..., len=${rawKey.length}`);

    // Perform live test call to the provider API to verify model access & remaining tokens
    const keyVerdict = await verifyApiKeyWithProvider(effectiveProvider, model, rawKey);
    if (!keyVerdict.valid) {
      console.warn(`[Listings API] Upstream key rejection:`, keyVerdict.error);
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
        { error: "Human verification required: You must verify your human identity to list on the orderbook." },
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

    // If seller specifies a real root .eth domain, verify on-chain ownership
    if (ensLabel && realEnsService.isStandardEnsDomain(ensLabel)) {
      const verify = await realEnsService.verifyNameOwnership(ensLabel, ownerAddress);
      if (!verify.verified) {
        return NextResponse.json(
          { error: `ENS Ownership Verification Failed: ${verify.error || "Connected wallet does not own this ENS domain."}` },
          { status: 400 }
        );
      }
    }

    // Register or resolve ENS subname
    const ensName = ensLabel
      ? ensService.mintSubname({
          label: ensLabel,
          ownerAddress,
          hedaraPayoutAccount: resolvedPayout,
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
      hedaraPayoutAccount: resolvedPayout,
      payoutAddress: resolvedPayout,
    });

    try {
      await remoteOrderbookSync.publishListing(listing);
    } catch (syncErr) {
      console.warn("[POST /api/listings] Remote sync notice:", syncErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Listing entity created successfully with 1-hour block expiration",
        listing,
      },
      { headers: noCacheHeaders }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
