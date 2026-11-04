export const dynamic = "force-dynamic";
export const revalidate = 0;

import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { verifyAndConsumeAuth } from "@/lib/authSignatures";
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
  const deleteIdFromQuery = searchParams.get("id");
  let body: any = null;
  try {
    body = await request.json();
  } catch {}
  const deleteId = deleteIdFromQuery || body?.id || body?.listingId;

  // Single delete
  if (deleteId) {
    const listing = arkivDb.getListingById(deleteId);
    if (!listing) {
      return NextResponse.json({ error: `Listing ${deleteId} not found` }, { status: 404 });
    }

    // Single delete needs ListingWrite action "delete" signed by the listing owner
    if (!body?.auth) {
      return NextResponse.json({ error: "Missing required wallet signature (body.auth)" }, { status: 401 });
    }

    try {
      const signer = verifyAndConsumeAuth("ListingWrite", body.auth, listing.ownerAddress);
      const msg = body.auth.message;
      if (msg.action !== "delete") {
        return NextResponse.json({ error: "Invalid action in auth message: expected 'delete'" }, { status: 400 });
      }
      if (msg.listingId && msg.listingId !== deleteId) {
        return NextResponse.json({ error: "listingId in signed message does not match target listing" }, { status: 400 });
      }
      if (
        msg.owner.toLowerCase() !== listing.ownerAddress.toLowerCase() ||
        signer.toLowerCase() !== listing.ownerAddress.toLowerCase()
      ) {
        return NextResponse.json({ error: "Only the listing owner can delete this listing" }, { status: 403 });
      }
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message || "Unauthorized signature" }, { status: 401 });
    }

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

  // Delete-all: ONLY with header x-admin-token == env ADMIN_API_TOKEN (env unset -> always 403)
  const adminTokenHeader = request.headers.get("x-admin-token");
  const envAdminToken = process.env.ADMIN_API_TOKEN;
  if (!envAdminToken || !adminTokenHeader || adminTokenHeader !== envAdminToken) {
    return NextResponse.json(
      { error: "Forbidden: Admin token required to clear orderbook" },
      { status: 403 }
    );
  }

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
    // Finding 4: Never return sealedApiKey in any response
    if (body.jsonrpc === "2.0") {
      if (body.method === "arkiv_queryEntities") {
        const { model, tMax } = body.params || {};
        const listings = model && tMax ? arkivDb.queryEligibleListings(model, tMax) : arkivDb.getAllListings();
        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: sanitizeListings(listings),
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
      auth,
      action: requestAction,
      listingId: requestListingId,
    } = body;

    const resolvedPayout = (payoutAddress || sellerPayoutAddress || hedaraPayoutAccount || ownerAddress || "").trim();

    if (!ownerAddress || !model || !availableTokens || !sealedApiKey || !resolvedPayout) {
      return NextResponse.json({ error: "Missing mandatory fields" }, { status: 400 });
    }

    // Finding 1: Require body.auth (ListingWrite) verified with verifyAndConsumeAuth
    if (!auth) {
      return NextResponse.json({ error: "Missing required wallet signature (body.auth)" }, { status: 401 });
    }

    let signerAddress: string;
    try {
      signerAddress = verifyAndConsumeAuth("ListingWrite", auth, ownerAddress);
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message || "Unauthorized signature" }, { status: 401 });
    }

    // Verify message fields equal request parameters
    const msg = auth.message;
    const action = requestAction || (requestListingId ? "update" : "create");
    if (msg.action !== action) {
      return NextResponse.json(
        { error: `Auth message action mismatch: expected '${action}', got '${msg.action}'` },
        { status: 400 }
      );
    }
    const expectedListingId = requestListingId || "";
    if (msg.listingId !== expectedListingId) {
      return NextResponse.json(
        { error: `Auth message listingId mismatch: expected '${expectedListingId}', got '${msg.listingId}'` },
        { status: 400 }
      );
    }
    if (msg.model !== model) {
      return NextResponse.json(
        { error: `Auth message model mismatch: expected '${model}', got '${msg.model}'` },
        { status: 400 }
      );
    }
    if (msg.payoutAddress.toLowerCase() !== resolvedPayout.toLowerCase()) {
      return NextResponse.json(
        { error: `Auth message payoutAddress mismatch: expected '${resolvedPayout}', got '${msg.payoutAddress}'` },
        { status: 400 }
      );
    }
    const sealedKeyHash = ethers.keccak256(ethers.toUtf8Bytes(sealedApiKey));
    if (msg.sealedApiKeyHash.toLowerCase() !== sealedKeyHash.toLowerCase()) {
      return NextResponse.json(
        { error: "Auth message sealedApiKeyHash mismatch with sealedApiKey" },
        { status: 400 }
      );
    }
    const expectedPrice = BigInt(Math.round(Number(pricePer1kMicroUsdc) || 10_000));
    if (BigInt(msg.pricePer1kMicroUsdc) !== expectedPrice) {
      return NextResponse.json(
        { error: `Auth message pricePer1kMicroUsdc mismatch: expected ${expectedPrice}, got ${msg.pricePer1kMicroUsdc}` },
        { status: 400 }
      );
    }

    // Update only if stored owner == signer
    if (requestListingId) {
      const existingListing = arkivDb.getListingById(requestListingId);
      if (existingListing && existingListing.ownerAddress.toLowerCase() !== signerAddress.toLowerCase()) {
        return NextResponse.json(
          { error: "Forbidden: Only stored listing owner can update this listing" },
          { status: 403 }
        );
      }
    }
    const existingByOwnerModel = arkivDb.getAllListings().find(
      (l) =>
        l.ownerAddress.toLowerCase() === ownerAddress.toLowerCase() &&
        l.model.toLowerCase() === model.toLowerCase()
    );
    if (existingByOwnerModel && existingByOwnerModel.ownerAddress.toLowerCase() !== signerAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Forbidden: Only stored listing owner can update this listing" },
        { status: 403 }
      );
    }

    // Finding 5: Reject create if another owner's listing already has the same sealedApiKey hash
    const duplicateKeyListing = arkivDb.getAllListings().find((l) => {
      if (!l.sealedApiKey) return false;
      const h = ethers.keccak256(ethers.toUtf8Bytes(l.sealedApiKey));
      return h.toLowerCase() === sealedKeyHash.toLowerCase() && l.ownerAddress.toLowerCase() !== signerAddress.toLowerCase();
    });
    if (duplicateKeyListing) {
      return NextResponse.json(
        { error: "Sealed API key has already been registered by another owner" },
        { status: 400 }
      );
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
    // Finding 9: Remove key-prefix logging
    console.log(`[Listings API] Live key verification: model=${model}, provider=${effectiveProvider}, len=${rawKey.length}`);

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
      walletAddress: ownerAddress,
      signal: ownerAddress,
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

    let publishedOnChain = false;
    try {
      publishedOnChain = await remoteOrderbookSync.publishListing(listing);
    } catch (syncErr) {
      console.warn("[POST /api/listings] Remote sync notice:", syncErr);
    }

    // Finding 4: Never return sealedApiKey in any response
    const { sealedApiKey: _removedSealedKey, ...safeListing } = listing;

    return NextResponse.json(
      {
        success: true,
        message: "Listing entity created successfully on HashKey Chain orderbook",
        listing: safeListing,
        publishedOnChain,
      },
      { headers: noCacheHeaders }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
