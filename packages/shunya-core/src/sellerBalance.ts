import { hashKeyTreasury, SellerTreasuryBalance } from "./hashkeyTreasury";

export interface SellerBalanceResult {
  success: boolean;
  accountId: string;
  sellerAddress: string;
  hskBalance: number;
  currentBalanceHsk: number;
  currentBalanceUsdc: number;
  displayBalance: number;
  availableBalance: number;
  htsUsdcBalance: number;
  rawHtsUsdcBalance: number;
  lifetimeSettledHsk: number;
  lifetimeSettledUsdc: number;
  totalSweptHsk: number;
  totalSweptUsdc: number;
  hspAdapterAddress: string;
  blockscoutAccountUrl: string;
  blockscoutTokenUrl: string;
  recentSettlements: any[];
  recentSweeps: any[];
  timestamp: string;
  isLive: boolean;
  message?: string;
  error?: string;
}

export async function calculateSellerBalance(rawAddress?: string | null): Promise<SellerBalanceResult> {
  const sellerAddress = (rawAddress || "0xE17fe685764Bc9Bf749B7a72a9fC1452a7235d21").trim();

  const balance = hashKeyTreasury.getSellerBalance(sellerAddress);

  return {
    success: true,
    accountId: sellerAddress,
    sellerAddress,
    hskBalance: balance.currentBalanceHsk,
    currentBalanceHsk: balance.currentBalanceHsk,
    currentBalanceUsdc: balance.currentBalanceUsdc,
    displayBalance: balance.currentBalanceUsdc,
    availableBalance: balance.currentBalanceUsdc,
    htsUsdcBalance: balance.currentBalanceUsdc,
    rawHtsUsdcBalance: Math.round(balance.currentBalanceUsdc * 1_000_000),
    lifetimeSettledHsk: balance.lifetimeSettledHsk,
    lifetimeSettledUsdc: balance.lifetimeSettledUsdc,
    totalSweptHsk: balance.totalSweptHsk,
    totalSweptUsdc: balance.totalSweptUsdc,
    hspAdapterAddress: balance.hspAdapterAddress,
    blockscoutAccountUrl: balance.blockscoutAccountUrl,
    blockscoutTokenUrl: `https://testnet-explorer.hskchain.net/token/0x054ed45810DbBAb8B27668922D110669c9D88D0a`,
    recentSettlements: balance.recentSettlements,
    recentSweeps: balance.recentSweeps,
    timestamp: new Date().toISOString(),
    isLive: true,
  };
}
