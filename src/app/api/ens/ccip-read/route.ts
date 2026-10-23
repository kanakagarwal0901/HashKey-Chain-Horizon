import { NextRequest, NextResponse } from "next/server";
import { arkivDb, ensService, realEnsService } from "@shunya/core";

/**
 * ERC-3668 CCIP-Read Off-Chain Gateway for *.shunyagrid.eth
 * Standard ENS gateway allowing standard Ethereum tools & wallets to resolve ShunyaGrid subnames.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subname = searchParams.get("subname");

  if (!subname) {
    return NextResponse.json(
      {
        gateway: "ShunyaGrid ERC-3668 CCIP-Read ENS Off-Chain Gateway",
        spec: "ERC-3668",
        status: "online",
        supportedParentDomain: "shunyagrid.eth",
      },
      { status: 200 }
    );
  }

  const cleanSubname = subname.trim().toLowerCase();

  // 1. If it's a real ENS name, delegate to real ENS
  if (cleanSubname.endsWith(".eth") && !cleanSubname.endsWith(".shunyagrid.eth")) {
    const onChain = await realEnsService.resolveName(cleanSubname);
    return NextResponse.json({
      success: true,
      subname: cleanSubname,
      address: onChain.address,
      avatarUrl: onChain.avatarUrl,
      source: "ethereum-mainnet-ens",
    });
  }

  // 2. Protocol subname: lookup in Arkiv listings & ENS namespace
  const allListings = arkivDb.getAllListings();
  const matchedListing = allListings.find(
    (l) => l.ensName?.toLowerCase() === cleanSubname || l.ensName?.toLowerCase() === `${cleanSubname}.shunyagrid.eth`
  );

  if (matchedListing) {
    return NextResponse.json({
      success: true,
      subname: matchedListing.ensName,
      address: matchedListing.ownerAddress,
      hedaraPayoutAccount: matchedListing.hedaraPayoutAccount,
      model: matchedListing.model,
      availableTokens: matchedListing.availableTokens,
      worldIdVerified: matchedListing.humanVerified,
      source: "arkiv-ens-resolver",
    });
  }

  const record = await ensService.resolveSubname(cleanSubname);
  if (record) {
    return NextResponse.json({
      success: true,
      subname: record.subname,
      address: record.ownerAddress,
      hedaraPayoutAccount: record.hedaraPayoutAccount,
      source: "namespace-ens-resolver",
    });
  }

  return NextResponse.json(
    {
      success: false,
      error: `Subname "${cleanSubname}" not found in ShunyaGrid ENS registry`,
    },
    { status: 404 }
  );
}
