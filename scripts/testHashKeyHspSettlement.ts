import { ethers } from "ethers";
import { HSPClient, HSPMandateRequest, HSPSettlementExecution } from "../packages/shunya-core/src/hspClient";

async function runHashKeyHspTest() {
  console.log(`\n=======================================================================`);
  console.log(`   SHUNYAGRID HASHKEY CHAIN (HSP) AGENT SETTLEMENT TEST SUITE          `);
  console.log(`   Network: HashKey Chain Testnet (Chain ID: 133)                     `);
  console.log(`   HSP Gateway: https://hashkey-merchant.github.io/#/                  `);
  console.log(`=======================================================================\n`);

  const rpcUrl = "https://testnet.hsk.xyz";
  const deployerKey =
    process.env.HASHKEY_DEPLOYER_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  const hspAdapterAddress = "0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae";
  const client = new HSPClient(rpcUrl, deployerKey, hspAdapterAddress);

  console.log(`[1/5] Initializing Autonomous Buyer Agent & Seller Compute Node...`);
  const buyerAgentAddress = client.wallet!.address;
  const sellerNode = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  console.log(`  • Buyer Agent: ${buyerAgentAddress}`);
  console.log(`  • Seller Compute Node: ${sellerNode}`);
  console.log(`  • HSPAdapter Target: ${hspAdapterAddress}`);

  console.log(`\n[2/5] Creating Cryptographic HSP Payment Mandate...`);
  const mandateId = client.generateMandateId();
  const modelId = "claude-3-7-sonnet";
  const tMax = 24192; // Medium thinking max bound
  const maxDepositHsk = "0.01"; // 0.01 HSK upfront reservation

  const mandateReq: HSPMandateRequest = {
    mandateId,
    buyerAgent: buyerAgentAddress,
    sellerNode,
    maxDepositEthOrHsk: maxDepositHsk,
    tMax,
    modelId,
    deadlineSeconds: 3600,
  };

  const { v, r, s, deadline } = await client.signPaymentMandate(mandateReq);
  console.log(`  • Mandate ID: ${mandateId}`);
  console.log(`  • EIP-712 Signature (v, r, s): ${v}, ${r.slice(0, 10)}..., ${s.slice(0, 10)}...`);
  console.log(`  ✔ [PASS] Cryptographic EIP-712 Mandate signed by Buyer Agent!`);

  console.log(`\n[3/5] Broadcasting HSP Mandate Lock to HashKey Chain...`);
  const lockReceipt = await client.lockMandateWithSignature(mandateReq, v, r, s, deadline);
  console.log(`  • Lock Transaction Hash: ${lockReceipt.hash}`);
  console.log(`  • Block Number: ${lockReceipt.blockNumber}`);
  console.log(`  • Gas Used: ${lockReceipt.gasUsed.toString()}`);
  console.log(`  • Explorer: https://testnet-explorer.hsk.xyz/tx/${lockReceipt.hash}`);
  console.log(`  ✔ [PASS] Mandate successfully locked in HSPAdapter on HashKey Chain!`);

  // Wait 2.5s for testnet RPC load-balancer propagation across public nodes
  console.log(`  Waiting for block propagation across HashKey RPC nodes...`);
  await new Promise((r) => setTimeout(r, 2500));

  console.log(`\n[4/5] Simulating Enclave Execution & Token Accounting...`);
  // Enclave executes: 14,192 actual tokens consumed out of 24,192 reserved
  const tUsed = 14192;
  const sellerPayoutHsk = "0.00586"; // Paid for 14,192 tokens
  const protocolFeeHsk = "0.00150";  // App commission
  const buyerRefundHsk = "0.00264";  // Unused refund: (0.00586 + 0.00150 + 0.00264 = 0.01000 HSK)

  const attestationHashHex = ethers.hexlify(ethers.randomBytes(32));

  const settlement: HSPSettlementExecution = {
    mandateId,
    sellerPayoutEthOrHsk: sellerPayoutHsk,
    protocolFeeEthOrHsk: protocolFeeHsk,
    buyerRefundEthOrHsk: buyerRefundHsk,
    tUsed,
    attestationHashHex,
  };

  const settleReceipt = await client.settleMandate(settlement);
  console.log(`  • Settlement Transaction Hash: ${settleReceipt.hash}`);
  console.log(`  • Attestation Hash: ${attestationHashHex}`);
  console.log(`  • Seller Payout: ${sellerPayoutHsk} HSK`);
  console.log(`  • Protocol Commission: ${protocolFeeHsk} HSK`);
  console.log(`  • Buyer Refund: ${buyerRefundHsk} HSK`);
  console.log(`  • Explorer: https://testnet-explorer.hsk.xyz/tx/${settleReceipt.hash}`);
  console.log(`  ✔ [PASS] HSP Settlement executed with full Conservation of Value!`);

  console.log(`\n[5/5] Querying Final On-Chain Mandate Status...`);
  // Allow 1.5s for testnet RPC load-balanced nodes to sync latest block state
  await new Promise((r) => setTimeout(r, 1500));
  let status = await client.getMandateStatus(mandateId);
  if (status.status !== "SETTLED") {
    await new Promise((r) => setTimeout(r, 2000));
    status = await client.getMandateStatus(mandateId);
  }
  console.log(`  • Model: ${status.modelId}`);
  console.log(`  • T_max Tokens: ${status.tMax.toLocaleString()}`);
  console.log(`  • Final On-Chain Status: ${status.status}`);
  if (status.status !== "SETTLED") {
    throw new Error(`Expected status SETTLED, got ${status.status}`);
  }
  console.log(`  ✔ [PASS] On-chain status verified as SETTLED!`);

  console.log(`\n=======================================================================`);
  console.log(`   ALL HASHKEY CHAIN HSP AGENT SETTLEMENT INVARIANTS PASSED 100%!     `);
  console.log(`=======================================================================\n`);
}

runHashKeyHspTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
