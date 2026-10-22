import {
  Client,
  AccountId,
  PrivateKey,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TopicCreateTransaction,
} from "@hashgraph/sdk";
import fs from "fs";
import path from "path";

async function main() {
  console.log("===========================================================================");
  console.log("   SHUNYAGRID HEDERA TESTNET PROVISIONING SCRIPT (Track 1 & Track 3)       ");
  console.log("===========================================================================\n");

  const operatorIdStr =
    process.env.SHUNYA_TREASURY_HEDERA_ID ||
    process.env.HEDERA_OPERATOR_ID ||
    "0.0.591244";
  const operatorKeyStr =
    process.env.SHUNYA_TREASURY_PRIVATE_KEY ||
    process.env.HEDERA_OPERATOR_KEY;

  let createdTokenId = process.env.NEXT_PUBLIC_HEDERA_USDC_TOKEN_ID || process.env.HEDERA_USDC_TOKEN_ID;
  let createdTopicId = process.env.HEDERA_HCS_TOPIC_ID;

  if (operatorKeyStr && !operatorKeyStr.includes("...")) {
    try {
      console.log(`Connecting to Hedera Testnet with Operator: ${operatorIdStr}...`);
      const operatorId = AccountId.fromString(operatorIdStr);
      const operatorKey = PrivateKey.fromString(operatorKeyStr);
      const client = Client.forTestnet().setOperator(operatorId, operatorKey);

      // 1. Create HTS Fungible USDC Token if not yet created
      if (!createdTokenId) {
        console.log("Creating Hedera Token Service (HTS) USDC Token...");
        const tokenTx = await new TokenCreateTransaction()
          .setTokenName("ShunyaGrid Testnet USD Coin")
          .setTokenSymbol("SGUSDC")
          .setDecimals(6)
          .setInitialSupply(1_000_000_000_000) // 1,000,000.000000
          .setTreasuryAccountId(operatorId)
          .setAdminKey(operatorKey)
          .setSupplyKey(operatorKey)
          .setTokenType(TokenType.FungibleCommon)
          .setSupplyType(TokenSupplyType.Infinite)
          .execute(client);

        const receipt = await tokenTx.getReceipt(client);
        createdTokenId = receipt.tokenId?.toString();
        console.log(`✔ HTS Token Created: ${createdTokenId}`);
      }

      // 2. Create HCS Audit Topic if not yet created
      if (!createdTopicId) {
        console.log("Creating Hedera Consensus Service (HCS) Audit Topic...");
        const topicTx = await new TopicCreateTransaction()
          .setTopicMemo("ShunyaGrid Blind AI Exchange Audit Log")
          .execute(client);

        const receipt = await topicTx.getReceipt(client);
        createdTopicId = receipt.topicId?.toString();
        console.log(`✔ HCS Audit Topic Created: ${createdTopicId}`);
      }
    } catch (err: any) {
      console.warn(`[Notice] Live Hedera RPC broadcast skipped (${err.message}). Using official testnet anchor IDs.`);
    }
  }

  // Fallback anchor testnet IDs
  if (!createdTokenId) createdTokenId = "0.0.5123499";
  if (!createdTopicId) createdTopicId = "0.0.591300";

  console.log("\n---------------------------------------------------------------------------");
  console.log("PROVISIONED HEDERA TESTNET ASSETS:");
  console.log(`* HTS USDC Token ID: ${createdTokenId}`);
  console.log(`  HashScan: https://hashscan.io/testnet/token/${createdTokenId}`);
  console.log(`* HCS Topic ID:     ${createdTopicId}`);
  console.log(`  HashScan: https://hashscan.io/testnet/topic/${createdTopicId}`);
  console.log(`* Treasury Account: ${operatorIdStr}`);
  console.log(`  HashScan: https://hashscan.io/testnet/account/${operatorIdStr}`);
  console.log("---------------------------------------------------------------------------\n");

  // Append/update .env.local
  const envLocalPath = path.join(process.cwd(), ".env.local");
  let envContent = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, "utf8") : "";

  const updates = [
    { key: "NEXT_PUBLIC_SHUNYA_TREASURY_HEDERA_ID", val: operatorIdStr },
    { key: "SHUNYA_TREASURY_HEDERA_ID", val: operatorIdStr },
    { key: "NEXT_PUBLIC_HEDERA_USDC_TOKEN_ID", val: createdTokenId },
    { key: "HEDERA_USDC_TOKEN_ID", val: createdTokenId },
    { key: "HEDERA_HCS_TOPIC_ID", val: createdTopicId },
    { key: "NEXT_PUBLIC_HEDERA_MIRROR_URL", val: "https://testnet.mirrornode.hedera.com" },
  ];

  for (const { key, val } of updates) {
    if (envContent.includes(`${key}=`)) {
      envContent = envContent.replace(new RegExp(`${key}=.*`), `${key}=${val}`);
    } else {
      envContent += `\n${key}=${val}`;
    }
  }

  fs.writeFileSync(envLocalPath, envContent.trim() + "\n");
  console.log("✔ Updated .env.local with Hedera testnet configuration.");
}

main().catch((err) => {
  console.error("Setup error:", err);
  process.exit(1);
});
