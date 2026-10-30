import { ethers } from "ethers";
import { getOrCreateEnclaveKeyPair, sealBuyerPromptAndFiles, decryptBuyerOutput } from "../packages/shunya-core/src/blindCrypto";
import { SHUNYA_TREASURY_EVM_ADDRESS } from "../src/lib/sepoliaPaymentVerifier";

async function main() {
  console.log("\n" + "=".repeat(78));
  console.log("   SHUNYAGRID LIVE AGENTIC A2A PAYMENT & INFERENCE: GEMINI FLASH TEST  ");
  console.log("   Network:  HashKey Chain Horizon Testnet (Chain ID: 133)             ");
  console.log("   Endpoint: http://localhost:3000/api/blind-execute                  ");
  console.log("=" .repeat(78) + "\n");

  // Step 1: Discover Gemini Flash Listing (target pratah-4c4a or any real registered seller)
  console.log("[STEP 1: DISCOVERY] Querying Orderbook for Gemini Flash Seller Node...");
  const listingsRes = await fetch("http://localhost:3000/api/listings");
  const listingsData = await listingsRes.json();
  // Find pratah-4c4a seller listing specifically (which has real sealed Gemini key)
  const geminiListing = listingsData.listings.find((l: any) => l.ensName?.includes("pratah") && l.model.includes("flash")) 
    || listingsData.listings.find((l: any) => l.model.includes("gemini") && l.model.includes("flash"));

  if (!geminiListing) {
    throw new Error("No Gemini Flash listing found on orderbook");
  }

  console.log(`  ✔ Seller Node:     ${geminiListing.ensName}`);
  console.log(`  ✔ Listing ID:      ${geminiListing.id}`);
  console.log(`  ✔ Model:           ${geminiListing.model} (Provider: ${geminiListing.provider})`);
  console.log(`  ✔ Price:           $${(geminiListing.pricePer1kMicroUsdc / 1_000_000).toFixed(4)} / 1k tokens`);
  console.log(`  ✔ Available Quota: ${geminiListing.availableTokens.toLocaleString()} tokens`);

  // Step 2: Encrypt prompt client-side in browser/agent RAM
  console.log("\n[STEP 2: CONFIDENTIAL ENCRYPTION] Encrypting Prompt in Agent RAM...");
  const prompt = "Explain in 2 sentences why HashKey Chain's HSP (HashKey Settlement Protocol) enables autonomous agent payments without human confirmation popups.";
  console.log(`  • Plaintext Prompt: "${prompt}"`);

  const { publicKey: enclavePubKey } = getOrCreateEnclaveKeyPair();
  const { buyerLocalReturnKeyBase64, encryptedEnvelope } = sealBuyerPromptAndFiles(
    prompt,
    [],
    enclavePubKey
  );
  console.log(`  ✔ Generated Ephemeral Return Key: ${buyerLocalReturnKeyBase64.slice(0, 20)}...`);
  console.log(`  ✔ Sealed AES-256-GCM Envelope:   ${encryptedEnvelope.encryptedPromptBase64.slice(0, 32)}...`);

  // Step 3: Broadcast Real On-Chain Payment on HashKey Chain Horizon
  console.log("\n[STEP 3: A2A ON-CHAIN PAYMENT] Broadcasting Native HSK Escrow on HashKey Chain...");
  const HASHKEY_TESTNET_RPC = "https://testnet.hsk.xyz";
  const AGENT_KEY = process.env.BUYER_AGENT_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  const provider = new ethers.JsonRpcProvider(HASHKEY_TESTNET_RPC);
  const agentWallet = new ethers.Wallet(AGENT_KEY, provider);
  const agentAddress = agentWallet.address;
  const balance = await provider.getBalance(agentAddress);

  console.log(`  • Agent Payer Address: ${agentAddress}`);
  console.log(`  • Agent HSK Balance:   ${parseFloat(ethers.formatEther(balance)).toFixed(4)} HSK`);
  console.log(`  • Protocol Treasury:   ${SHUNYA_TREASURY_EVM_ADDRESS}`);

  // Send real on-chain transaction to Treasury (covers upfront T_max escrow for seller's rate)
  const tMaxTokens = geminiListing.model.includes("thinking") ? 26192 : 12000;
  const requiredUsdc = (tMaxTokens / 1000) * (geminiListing.pricePer1kMicroUsdc / 1_000_000);
  const hskUsdRate = 0.0894;
  const paymentHsk = (Math.ceil((requiredUsdc / hskUsdRate) * 1.05 * 100) / 100).toFixed(2); // 5% buffer
  console.log(`  • T_max Bound:         ${tMaxTokens.toLocaleString()} tokens ($${requiredUsdc.toFixed(4)} USDC)`);
  console.log(`  • Sending ${paymentHsk} HSK to Treasury...`);
  const tx = await agentWallet.sendTransaction({
    to: SHUNYA_TREASURY_EVM_ADDRESS,
    value: ethers.parseEther(paymentHsk),
  });

  console.log(`  ✔ Tx Broadcast:        ${tx.hash}`);
  console.log(`    Waiting for HashKey Chain block confirmation...`);
  const receipt = await tx.wait(1);
  console.log(`  ✔ Confirmed in Block:  #${receipt?.blockNumber}`);
  console.log(`  ✔ Blockscout Explorer: https://testnet-explorer.hskchain.net/tx/${tx.hash}`);

  // Allow 3.5s for testnet block propagation across all RPC node replicas
  console.log(`    Syncing across RPC cluster nodes...`);
  await new Promise((resolve) => setTimeout(resolve, 3500));

  // Step 4: Call Blind Execute with confirmed On-Chain Tx Hash
  console.log("\n[STEP 4: BLIND EXECUTION] Submitting Encrypted Envelope to Platform API...");
  const execRes = await fetch("http://localhost:3000/api/blind-execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      modelId: geminiListing.model,
      thinkingLevel: "none",
      listingId: geminiListing.id,
      encryptedEnvelope,
      paymentTxId: tx.hash,
      buyerAddress: agentAddress,
    }),
  });

  if (!execRes.ok) {
    const errText = await execRes.text();
    throw new Error(`Execution failed (${execRes.status}): ${errText}`);
  }

  const execData = await execRes.json();
  console.log(`  ✔ HTTP Status:          200 OK`);
  console.log(`  ✔ Enclave Mandate ID:   ${execData.hashKeySettlement?.mandateId}`);
  console.log(`  ✔ Block Confirmed:      #${execData.hashKeySettlement?.blockNumber}`);
  console.log(`  ✔ Tokens Consumed:      ${execData.tokenAccounting?.tUsedActual.toLocaleString()} tokens`);
  console.log(`  ✔ Upfront Escrow:       $${execData.tokenAccounting?.buyerPaidUsdc.toFixed(4)} USDC`);
  console.log(`  ✔ Seller Node Earned:   ${execData.hashKeySettlement?.sellerPayoutHsk} HSK ($${execData.tokenAccounting?.sellerPayoutUsdc.toFixed(4)})`);
  console.log(`  ✔ Protocol Fee:         ${execData.hashKeySettlement?.protocolFeeHsk} HSK ($${execData.tokenAccounting?.protocolCommissionUsdc.toFixed(4)})`);
  console.log(`  ✔ Buyer Refund:         ${execData.hashKeySettlement?.buyerRefundHsk} HSK (Zero-Cutoff Refund)`);
  console.log(`  ✔ 0G Attestation Hash:  ${execData.zeroGVerification?.attestationHash}`);

  // Step 5: Decrypt AI Output in Agent RAM
  console.log("\n[STEP 5: AGENT DECRYPTION] Decrypting AI Answer in Agent Memory...");
  const decrypted = decryptBuyerOutput(
    execData.encryptedOutput.encryptedOutputBase64,
    execData.encryptedOutput.ivHex,
    execData.encryptedOutput.authTagHex,
    buyerLocalReturnKeyBase64
  );

  console.log(`\n  Decrypted Gemini Flash Output:`);
  console.log(`  ${"-".repeat(65)}`);
  console.log(`  ${decrypted.aiOutputText.split("\n").join("\n  ")}`);
  console.log(`  ${"-".repeat(65)}`);
  if (decrypted.reasoningText) {
    console.log(`  Reasoning Summary: ${decrypted.reasoningText}`);
  }

  console.log("\n" + "=".repeat(78));
  console.log("   [SUCCESS] LIVE A2A AGENTIC PAYMENT & GEMINI FLASH COMPLETED!");
  console.log("   Live on HashKey Chain Horizon Testnet (Chain ID: 133)");
  console.log("=" .repeat(78) + "\n");
}

main().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
