import { NextResponse } from "next/server";
import { arkivDb, MODEL_TOKEN_CATALOG } from "@shunya/core";

// Arc Marketplace Discovery API (Arc Bounty Track)
export async function GET() {
  const listings = arkivDb.getAllListings();
  const models = Object.values(MODEL_TOKEN_CATALOG);

  return NextResponse.json({
    protocol: "ShunyaGrid",
    version: "1.0.0",
    description: "Blind, Zero-Cutoff AI API Token Exchange initialized in Arc Studio",
    arcStudioProject: "https://studio.arc.com/project/shunyagrid-mumbai-2026",
    networkSupport: ["Arc", "Hedera Testnet", "0G Galileo", "Ethereum"],
    catalog: models.map((m) => ({
      modelId: m.modelId,
      thinkingLevel: m.thinkingLevel,
      tMax: m.totalMaxTokens,
      tMin: m.minRequiredTokens,
      defaultRateUsdcPer1k: m.defaultPricePer1kMicroUsdc / 1_000_000,
    })),
    activeSellersCount: listings.length,
    activeSellers: listings.map((l) => ({
      ensName: l.ensName,
      model: l.model,
      availableTokens: l.availableTokens,
      pricePer1kUsdc: l.pricePer1kMicroUsdc / 1_000_000,
      humanVerified: l.humanVerified,
      payoutChain: "Hedera HTS (Bridgable to Arc via CCTP)",
    })),
  });
}
