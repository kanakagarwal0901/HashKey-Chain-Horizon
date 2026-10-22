import {
  Client,
  AccountId,
  PrivateKey,
  TopicId,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  AccountBalanceQuery,
} from "@hashgraph/sdk";
import fs from "fs";
import path from "path";

function parseHederaPrivateKey(keyStr: string): PrivateKey {
  const clean = keyStr.trim().replace(/^0x/, "");
  if (clean.length === 64) {
    try { return PrivateKey.fromStringECDSA(clean); } catch {}
  }
  try { return PrivateKey.fromStringDer(clean); } catch {}
  try { return PrivateKey.fromStringECDSA(clean); } catch {}
  try { return PrivateKey.fromStringED25519(clean); } catch {}
  return PrivateKey.fromString(clean);
}

async function main() {
  console.log("===========================================================================");
  console.log("   SHUNYAGRID HEDERA TESTNET PROVISIONING SCRIPT (Track 1 & Track 3)       ");
  console.log("===========================================================================\n");

  const args = process.argv.slice(2);
  const accountArg = args.find((a) => a.startsWith("--account="))?.split("=")[1];
  const keyArg = args.find((a) => a.startsWith("--key="))?.split("=")[1];
  const forceNew = args.includes("--force-new");

  const operatorIdStr =
    accountArg ||
    process.env.HEDERA_OPERATOR_ID ||
    process.env.SHUNYA_TREASURY_HEDERA_ID ||
    process.env.NEXT_PUBLIC_SHUNYA_TREASURY_HEDERA_ID ||
    "";

  const operatorKeyStr =
    keyArg ||
    process.env.HEDERA_OPERATOR_KEY ||
    process.env.SHUNYA_TREASURY_PRIVATE_KEY ||
    "";

  if (!operatorIdStr || !operatorKeyStr || operatorKeyStr.includes("...")) {
    console.error("❌ Error: No valid Hedera Testnet credentials provided.");
    console.log("\nPlease provide your credentials either by:");
    console.log("  1. Setting HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY in .env.local, or");
    console.log("  2. Running: npx tsx scripts/setup-hedera-testnet.ts --account=0.0.xxxx --key=your_private_key");
    console.log("\nYou can get a free testnet account with 10,000 HBAR at https://portal.hedera.com\n");
    process.exit(1);
  }

  console.log(`[1/4] Connecting to Hedera Testnet with Operator: ${operatorIdStr}...`);
  const operatorId = AccountId.fromString(operatorIdStr.trim());
  const operatorKey = parseHederaPrivateKey(operatorKeyStr);
  const client = Client.forTestnet().setOperator(operatorId, operatorKey);

  // Check balance on-chain via Mirror Node REST (reliable and avoids direct consensus throttling)
  try {
    const res = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${operatorIdStr.trim()}`);
    if (res.ok) {
      const data = await res.json();
      const tinybars = data.balance?.balance || 0;
      const hbarBalance = tinybars / 100_000_000;
      console.log(`      ✔ Operator Verified On-Chain! Live Balance: ${hbarBalance.toFixed(2)} HBAR`);
      if (hbarBalance < 10) {
        console.warn("      ⚠️ Warning: Low testnet HBAR balance. You may need to request faucet funds.");
      }
    } else {
      console.log(`      Connected to Hedera Testnet.`);
    }
  } catch (err: any) {
    console.warn(`      Balance lookup notice: ${err.message}`);
  }

  let createdTokenId = forceNew ? undefined : process.env.NEXT_PUBLIC_HEDERA_USDC_TOKEN_ID || process.env.HEDERA_USDC_TOKEN_ID;
  let createdTopicId = forceNew ? undefined : process.env.HEDERA_HCS_TOPIC_ID;

  // 1. Create HTS Fungible USDC Token if not yet set
  if (!createdTokenId) {
    console.log("\n[2/4] Creating Hedera Token Service (HTS) Fungible USDC Token...");
    try {
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
      console.log(`      ✔ HTS Token Created On-Chain: ${createdTokenId}`);
      console.log(`      HashScan: https://hashscan.io/testnet/token/${createdTokenId}`);
    } catch (err: any) {
      console.error("      ❌ Failed to create HTS Token:", err.message);
      throw err;
    }
  } else {
    console.log(`\n[2/4] Using existing HTS Token: ${createdTokenId}`);
  }

  // 2. Create HCS Audit Topic if not yet set
  if (!createdTopicId) {
    console.log("\n[3/4] Creating Hedera Consensus Service (HCS) Audit Topic...");
    try {
      const topicTx = await new TopicCreateTransaction()
        .setTopicMemo("ShunyaGrid Blind AI Exchange Audit Log")
        .setAdminKey(operatorKey)
        .execute(client);

      const receipt = await topicTx.getReceipt(client);
      createdTopicId = receipt.topicId?.toString();
      console.log(`      ✔ HCS Audit Topic Created On-Chain: ${createdTopicId}`);
      console.log(`      HashScan: https://hashscan.io/testnet/topic/${createdTopicId}`);
    } catch (err: any) {
      console.error("      ❌ Failed to create HCS Topic:", err.message);
      throw err;
    }
  } else {
    console.log(`\n[3/4] Using existing HCS Topic: ${createdTopicId}`);
  }

  // 3. Submit initialization message to verify HCS writes
  console.log("\n[4/4] Submitting cryptographic verification message to HCS Topic...");
  try {
    const testMessage = JSON.stringify({
      protocol: "ShunyaGrid-v1",
      event: "HCS_TOPIC_INITIALIZED",
      operator: operatorIdStr,
      timestamp: new Date().toISOString(),
      network: "testnet",
    });

    const msgTx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(createdTopicId!))
      .setMessage(testMessage)
      .execute(client);

    const msgReceipt = await msgTx.getReceipt(client);
    console.log(`      ✔ HCS Message Submitted! Sequence Number: ${msgReceipt.topicSequenceNumber}`);
    console.log(`      HashScan: https://hashscan.io/testnet/transaction/${msgTx.transactionId.toString()}`);
  } catch (err: any) {
    console.warn(`      HCS test submission notice: ${err.message}`);
  }

  // 4. Update .env.local
  const envLocalPath = path.join(process.cwd(), ".env.local");
  let envContent = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, "utf8") : "";

  const updates = [
    { key: "HEDERA_OPERATOR_ID", val: operatorIdStr },
    { key: "HEDERA_OPERATOR_KEY", val: operatorKeyStr },
    { key: "SHUNYA_TREASURY_HEDERA_ID", val: operatorIdStr },
    { key: "SHUNYA_TREASURY_PRIVATE_KEY", val: operatorKeyStr },
    { key: "NEXT_PUBLIC_SHUNYA_TREASURY_HEDERA_ID", val: operatorIdStr },
    { key: "NEXT_PUBLIC_HEDERA_USDC_TOKEN_ID", val: createdTokenId },
    { key: "HEDERA_USDC_TOKEN_ID", val: createdTokenId },
    { key: "HEDERA_HCS_TOPIC_ID", val: createdTopicId },
    { key: "HEDERA_NETWORK", val: "testnet" },
    { key: "HEDERA_LIVE_CHECK", val: "true" },
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
  console.log("\n✔ Updated .env.local with live on-chain assets.");

  console.log("\n===========================================================================");
  console.log("   PROVISIONING COMPLETE (100% REAL HEDERA TESTNET)");
  console.log("===========================================================================");
  console.log(`* Account ID:     ${operatorIdStr}`);
  console.log(`* HTS Token ID:   ${createdTokenId}`);
  console.log(`* HCS Topic ID:   ${createdTopicId}`);
  console.log("===========================================================================\n");
}

main().catch((err) => {
  console.error("Setup error:", err);
  process.exit(1);
});
