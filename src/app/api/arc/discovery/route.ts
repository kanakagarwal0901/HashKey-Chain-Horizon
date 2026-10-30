import { NextResponse } from "next/server";
import { arkivDb, MODEL_TOKEN_CATALOG } from "@shunya/core";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// Marketplace Discovery API
export async function GET() {
  try {
    await arkivDb.syncWithRemote();
  } catch (syncErr) {
    console.warn("[GET /api/arc/discovery] Sync notice:", syncErr);
  }

  const listings = arkivDb.getAllListings();
  const models = Object.values(MODEL_TOKEN_CATALOG);

  return NextResponse.json(
    {
      protocol: "ShunyaGrid",
      version: "1.0.0",
      description: "Blind, Zero-Cutoff AI API Token Exchange initialized in Arc Studio",
      arcStudioProject: "https://github.com/kanakagarwal0901/HashKey-Chain-Horizon",
      networkSupport: ["HashKey Chain Testnet", "Ethereum Sepolia", "Arbitrum Sepolia", "Base Sepolia"],
      catalog: models.map((m) => ({
        modelId: m.modelId,
        thinkingLevel: m.thinkingLevel,
        tMax: m.totalMaxTokens,
        tMin: m.minRequiredTokens,
        defaultRateUsdcPer1k: m.defaultPricePer1kMicroUsdc / 1_000_000,
      })),
      activeSellersCount: listings.length,
      activeSellers: listings.map((l) => ({
        id: l.id,
        ensName: l.ensName,
        model: l.model,
        availableTokens: l.availableTokens,
        pricePer1kUsdc: l.pricePer1kMicroUsdc / 1_000_000,
        humanVerified: l.humanVerified,
        payoutAddress: l.payoutAddress || l.ownerAddress,
        payoutChain: "HashKey Chain HSP (Bridgable via Router)",
      })),
    },
    { headers: noCacheHeaders }
  );
}
