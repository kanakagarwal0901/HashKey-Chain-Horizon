import assert from "assert";
import { ethers } from "ethers";
import { hashKeyTreasury } from "../packages/shunya-core/src/hashkeyTreasury";
import { calculateSellerBalance } from "../packages/shunya-core/src/sellerBalance";
import {
  newNonceAndDeadline,
  typedDataFor,
  type SignedAuth,
} from "../src/lib/authSignaturesShared";
import { verifyAndConsumeAuth } from "../src/lib/authSignatures";

async function runSelfTest() {
  console.log("=== Security Sweep Self-Test ===");

  // 1. Generate two random ethers wallets
  const walletA = ethers.Wallet.createRandom();
  const walletB = ethers.Wallet.createRandom();
  console.log(`Wallet A: ${walletA.address}`);
  console.log(`Wallet B: ${walletB.address}`);

  // 2. Test 1: SellerSweep signed by A accepted once
  console.log("\n[Test 1] SellerSweep signed by A → accepted once");
  const { nonce: nonce1, deadline: deadline1 } = newNonceAndDeadline();
  const sweepMsg1 = {
    seller: walletA.address,
    recipient: walletB.address,
    amountHsk: "5.0",
    destinationChain: "hashkey-testnet",
    targetToken: "HSK",
    nonce: nonce1,
    deadline: deadline1,
  };
  const { domain, types } = typedDataFor("SellerSweep");
  const sig1 = await walletA.signTypedData(domain, types, sweepMsg1);
  const authPayload1: SignedAuth<typeof sweepMsg1> = {
    message: sweepMsg1,
    signature: sig1,
  };

  const recovered1 = verifyAndConsumeAuth("SellerSweep", authPayload1, walletA.address);
  assert.strictEqual(
    recovered1.toLowerCase(),
    walletA.address.toLowerCase(),
    "Recovered signer must match Wallet A"
  );
  console.log("  ✓ Accepted once successfully. Signer:", recovered1);

  // 3. Test 2: Replay of same signature rejected
  console.log("\n[Test 2] Replay of same signature → rejected");
  let replayRejected = false;
  try {
    verifyAndConsumeAuth("SellerSweep", authPayload1, walletA.address);
  } catch (err: any) {
    replayRejected = true;
    console.log(`  ✓ Replay rejected with error: "${err.message}"`);
    assert(
      err.message.includes("Signature already used"),
      `Expected 'Signature already used', got: ${err.message}`
    );
  }
  assert.strictEqual(replayRejected, true, "Replay must be rejected");

  // 4. Test 3: Expected signer = B rejected
  console.log("\n[Test 3] Expected signer = B → rejected");
  const { nonce: nonce2, deadline: deadline2 } = newNonceAndDeadline();
  const sweepMsg2 = {
    seller: walletA.address,
    recipient: walletB.address,
    amountHsk: "2.5",
    destinationChain: "hashkey-testnet",
    targetToken: "HSK",
    nonce: nonce2,
    deadline: deadline2,
  };
  const sig2 = await walletA.signTypedData(domain, types, sweepMsg2);
  const authPayload2: SignedAuth<typeof sweepMsg2> = {
    message: sweepMsg2,
    signature: sig2,
  };

  let signerMismatchRejected = false;
  try {
    verifyAndConsumeAuth("SellerSweep", authPayload2, walletB.address);
  } catch (err: any) {
    signerMismatchRejected = true;
    console.log(`  ✓ Signer mismatch rejected with error: "${err.message}"`);
    assert(
      err.message.includes("Signature does not match wallet"),
      `Expected 'Signature does not match wallet', got: ${err.message}`
    );
  }
  assert.strictEqual(signerMismatchRejected, true, "Signer mismatch must be rejected");

  // 5. Test 4: Tampered amount rejected
  console.log("\n[Test 4] Tampered amount → rejected");
  const { nonce: nonce3, deadline: deadline3 } = newNonceAndDeadline();
  const sweepMsg3 = {
    seller: walletA.address,
    recipient: walletB.address,
    amountHsk: "1.0",
    destinationChain: "hashkey-testnet",
    targetToken: "HSK",
    nonce: nonce3,
    deadline: deadline3,
  };
  const sig3 = await walletA.signTypedData(domain, types, sweepMsg3);
  const tamperedPayload: SignedAuth<typeof sweepMsg3> = {
    message: {
      ...sweepMsg3,
      amountHsk: "1000000.0", // Tampered!
    },
    signature: sig3,
  };

  let tamperRejected = false;
  try {
    verifyAndConsumeAuth("SellerSweep", tamperedPayload, walletA.address);
  } catch (err: any) {
    tamperRejected = true;
    console.log(`  ✓ Tampered amount rejected with error: "${err.message}"`);
  }
  assert.strictEqual(tamperRejected, true, "Tampered payload must be rejected");

  // 6. Test 5: Assert ledger reports 0 available for unknown address (pure function, no network)
  console.log("\n[Test 5] Assert ledger reports 0 available for unknown address (pure function, no network)");
  const unknownWallet = ethers.Wallet.createRandom();
  console.log(`Unknown Address: ${unknownWallet.address}`);

  const ledgerBalance = hashKeyTreasury.getSellerBalance(unknownWallet.address);
  console.log(`  Ledger currentBalanceHsk: ${ledgerBalance.currentBalanceHsk}`);
  console.log(`  Ledger currentBalanceUsdc: ${ledgerBalance.currentBalanceUsdc}`);
  console.log(`  Ledger lifetimeSettledHsk: ${ledgerBalance.lifetimeSettledHsk}`);
  assert.strictEqual(ledgerBalance.currentBalanceHsk, 0, "Unknown address currentBalanceHsk must be 0");
  assert.strictEqual(ledgerBalance.currentBalanceUsdc, 0, "Unknown address currentBalanceUsdc must be 0");
  assert.strictEqual(ledgerBalance.lifetimeSettledHsk, 0, "Unknown address lifetimeSettledHsk must be 0");

  const calcBalance = await calculateSellerBalance(unknownWallet.address);
  console.log(`  calculateSellerBalance availableBalance: ${calcBalance.availableBalance}`);
  assert.strictEqual(calcBalance.availableBalance, 0, "calculateSellerBalance availableBalance must be 0");
  assert.strictEqual(calcBalance.currentBalanceHsk, 0, "calculateSellerBalance currentBalanceHsk must be 0");

  // 7. Test 6: executeUniversalSweep rejects when ledger has 0 balance (no on-chain fallback or bypass)
  console.log("\n[Test 6] executeUniversalSweep rejects sweep for unknown address with 0 balance");
  let sweepOverdrawRejected = false;
  try {
    await hashKeyTreasury.executeUniversalSweep({
      sellerAddress: unknownWallet.address,
      recipientAddress: walletB.address,
      amountHsk: 1.0,
      destinationChain: "hashkey-testnet",
      targetToken: "HSK",
    });
  } catch (err: any) {
    sweepOverdrawRejected = true;
    console.log(`  ✓ Sweep overdraw rejected with error: "${err.message}"`);
    assert(
      err.message.includes("Exceeds available ledger balance"),
      `Expected 'Exceeds available ledger balance', got: ${err.message}`
    );
  }
  assert.strictEqual(sweepOverdrawRejected, true, "Sweep exceeding ledger balance must be rejected");

  // 8. Test 7: Reject negative and zero amounts
  console.log("\n[Test 7] Reject amounts <= 0 or non-numeric");
  let zeroAmountRejected = false;
  try {
    await hashKeyTreasury.executeUniversalSweep({
      sellerAddress: unknownWallet.address,
      recipientAddress: walletB.address,
      amountHsk: 0,
      destinationChain: "hashkey-testnet",
      targetToken: "HSK",
    });
  } catch (err: any) {
    zeroAmountRejected = true;
    console.log(`  ✓ Zero amount rejected with error: "${err.message}"`);
  }
  assert.strictEqual(zeroAmountRejected, true, "Zero amount must be rejected");

  console.log("\n=== ALL 7 SECURITY SWEEP SELF-TESTS PASSED ===");
}

runSelfTest().catch((err) => {
  console.error("Self-test FAILED:", err);
  process.exit(1);
});
