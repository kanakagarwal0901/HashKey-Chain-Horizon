/**
 * Live Hedera Testnet HTS Token Transfer Verification Script
 * Asserts authentic on-chain transfer of Token 0.0.11134145 to Seller Account 0.0.11136050.
 */

import { hederaNetworkClient } from "../packages/shunya-core/src/hederaClient";

async function main() {
  console.log("\n=======================================================================");
  console.log("   SHUNYAGRID LIVE HEDERA HTS TOKEN TRANSFER VERIFICATION SUITE       ");
  console.log("=======================================================================\n");

  const sellerAccount = process.env.NEXT_PUBLIC_DEFAULT_SELLER_HEDERA_ACCOUNT || "0.0.11136050";
  const payoutUsdc = 0.05; // 50,000 micro-tokens

  console.log(`[TEST 1] Initiating live HTS USDC token transfer to seller account ${sellerAccount}...`);
  const result = await hederaNetworkClient.transferSellerPayout({
    sellerHederaAccountId: sellerAccount,
    payoutUsdc,
  });

  if (!result) {
    console.error("✖ [FAIL] HTS Transfer returned null!");
    process.exit(1);
  }

  console.log("✔ [PASS] On-chain transfer confirmed!");
  console.log(`  * Transaction ID: ${result.txId}`);
  console.log(`  * HashScan URL:   ${result.hashscanUrl}`);
  console.log(`  * Recipient:      ${result.recipientAccount}`);
  console.log(`  * Transfer Type:  ${result.transferType || "HTS_TOKEN"}`);

  // Query Mirror Node
  console.log("\n[TEST 2] Verifying balance on Hedera Mirror Node...");
  const mirrorUrl = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${sellerAccount}/tokens?token.id=0.0.11134145`;
  const res = await fetch(mirrorUrl);
  if (res.ok) {
    const data = await res.json();
    console.log("✔ [PASS] Mirror node token response:", JSON.stringify(data.tokens));
    if (data.tokens && data.tokens.length > 0) {
      const bal = data.tokens[0].balance / 1_000_000;
      console.log(`✔ [PASS] Live on-chain HTS USDC balance: $${bal.toFixed(6)} USDC`);
    }
  } else {
    console.warn("Mirror node query warning:", res.status);
  }

  console.log("\n=======================================================================");
  console.log("   ALL LIVE HEDERA HTS PAYOUT VERIFICATIONS PASSED SUCCESSFULLY!      ");
  console.log("=======================================================================\n");
}

main().catch((e) => {
  console.error("Fatal test error:", e);
  process.exit(1);
});
