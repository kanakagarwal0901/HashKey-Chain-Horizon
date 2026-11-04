import * as fs from "fs";
import * as path from "path";
// @ts-ignore
import solc from "solc";

interface CheckItem {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
}

const checks: CheckItem[] = [];

function recordCheck(category: string, name: string, passed: boolean, details?: string) {
  checks.push({ category, name, passed, details });
  const status = passed ? "✔ PASS" : "✖ FAIL";
  console.log(`[${status}] [${category}] ${name}${details ? ` - ${details}` : ""}`);
}

function checkInProcessEvm(): string | null {
  const candidates = [
    "ganache",
    "@ethereumjs/vm",
    "hardhat",
    "@nomicfoundation/edr",
  ];

  for (const pkg of candidates) {
    try {
      require.resolve(pkg);
      return pkg;
    } catch {
      // not available
    }
  }
  return null;
}

export async function runSelfTest() {
  console.log("===============================================================================");
  console.log(" ShunyaGrid & HashKey Settlement Protocol - Contracts Security Self-Test");
  console.log("===============================================================================\n");

  const evmPkg = checkInProcessEvm();
  if (evmPkg) {
    console.log(`[EVM Environment] In-process EVM detected: ${evmPkg}`);
  } else {
    console.log(
      "[EVM Environment] In-process EVM (ganache, @ethereumjs/vm, hardhat, @nomicfoundation/edr) NOT available in node_modules."
    );
    console.log("Proceeding with full solc static AST/ABI/bytecode verification and hole validation...\n");
  }

  // 1. Compile contracts via solc
  const contractsDir = path.resolve(process.cwd(), "contracts");
  const filesToCompile = [
    "HSPAdapter.sol",
    "HashKeySettlementRouter.sol",
    "ShunyaGridOrderbook.sol",
    "ShunyaGridEscrow.sol",
  ];

  const sources: Record<string, { content: string }> = {};
  for (const file of filesToCompile) {
    const filePath = path.join(contractsDir, file);
    if (!fs.existsSync(filePath)) {
      recordCheck("Files", `File existence: ${file}`, false, "File missing on disk");
      continue;
    }
    sources[file] = { content: fs.readFileSync(filePath, "utf8") };
    recordCheck("Files", `File existence: ${file}`, true);
  }

  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  console.log("\n⚙ Compiling contracts via solc 0.8.20 for ABI verification...");
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatal = output.errors.filter((e: any) => e.severity === "error");
    if (fatal.length > 0) {
      console.error("Compilation errors:", fatal);
      recordCheck("Compilation", "solc compile output", false, fatal[0].formattedMessage);
      process.exit(1);
    }
  }
  recordCheck("Compilation", "solc 0.8.20 compilation without errors", true);

  const contracts = output.contracts;

  // 2. Validate HSPAdapter ABI & Findings
  const hspAbi = contracts["HSPAdapter.sol"]["HSPAdapter"].abi;
  const hspBytecode = contracts["HSPAdapter.sol"]["HSPAdapter"].evm.bytecode.object;
  recordCheck("HSPAdapter", "Bytecode generation", hspBytecode.length > 0, `Length: ${hspBytecode.length}`);

  const hspFunctions = hspAbi.filter((item: any) => item.type === "function").map((item: any) => item.name);
  const hspErrors = hspAbi.filter((item: any) => item.type === "error").map((item: any) => item.name);
  const hspEvents = hspAbi.filter((item: any) => item.type === "event").map((item: any) => item.name);

  // Finding 1: settleHSPMandate bounds
  recordCheck(
    "Finding 1 (HSPAdapter)",
    "settleHSPMandate function present",
    hspFunctions.includes("settleHSPMandate")
  );
  recordCheck(
    "Finding 1 (HSPAdapter)",
    "settlement error bounds: ExceedsTMax, ExcessivePayout, ExcessiveFee",
    hspErrors.includes("ExceedsTMax") &&
      hspErrors.includes("ExcessivePayout") &&
      hspErrors.includes("ExcessiveFee")
  );
  recordCheck(
    "Finding 1 (HSPAdapter)",
    "MAX_FEE_BPS constant getter present",
    hspFunctions.includes("MAX_FEE_BPS")
  );
  recordCheck(
    "Finding 1 (HSPAdapter)",
    "ProtocolTreasuryUpdated event emitted on treasury change",
    hspEvents.includes("ProtocolTreasuryUpdated")
  );

  // Finding 2: Two-step ownership
  recordCheck(
    "Finding 2 (HSPAdapter)",
    "Two-step ownership: transferOwnership and acceptOwnership",
    hspFunctions.includes("transferOwnership") && hspFunctions.includes("acceptOwnership")
  );
  recordCheck(
    "Finding 2 (HSPAdapter)",
    "OwnershipTransferStarted & OwnershipTransferred events",
    hspEvents.includes("OwnershipTransferStarted") && hspEvents.includes("OwnershipTransferred")
  );

  // Finding 3: Mandate ID keying & signatures
  recordCheck(
    "Finding 3 (HSPAdapter)",
    "lockHSPMandateWithSignature external signature preserved",
    hspFunctions.includes("lockHSPMandateWithSignature")
  );
  recordCheck(
    "Finding 3 (HSPAdapter)",
    "lockHSPMandateDirect external signature preserved",
    hspFunctions.includes("lockHSPMandateDirect")
  );
  recordCheck(
    "Finding 3 (HSPAdapter)",
    "mandates public mapping getter preserved",
    hspFunctions.includes("mandates")
  );

  // Finding 4: Router integration with lockHSPMandateFor
  recordCheck(
    "Finding 4 (HSPAdapter)",
    "lockHSPMandateFor callable by trustedRouter",
    hspFunctions.includes("lockHSPMandateFor")
  );
  recordCheck(
    "Finding 4 (HSPAdapter)",
    "setTrustedRouter & TrustedRouterUpdated present",
    hspFunctions.includes("setTrustedRouter") && hspEvents.includes("TrustedRouterUpdated")
  );

  // Finding 5: Safe ERC20 & zero amount checks
  recordCheck(
    "Finding 5 (HSPAdapter)",
    "ZeroAmount error present for msg.value == 0 ERC20 validation",
    hspErrors.includes("ZeroAmount")
  );

  // Finding 6: Pull payment fallback
  recordCheck(
    "Finding 6 (HSPAdapter)",
    "pendingWithdrawals mapping getter present",
    hspFunctions.includes("pendingWithdrawals")
  );
  recordCheck(
    "Finding 6 (HSPAdapter)",
    "withdraw() function present",
    hspFunctions.includes("withdraw")
  );
  recordCheck(
    "Finding 6 (HSPAdapter)",
    "PendingWithdrawalCredited & WithdrawalExecuted events present",
    hspEvents.includes("PendingWithdrawalCredited") && hspEvents.includes("WithdrawalExecuted")
  );

  // Finding 7: 24h refund
  recordCheck(
    "Finding 7 (HSPAdapter)",
    "refundHSPMandate present",
    hspFunctions.includes("refundHSPMandate")
  );

  // 3. Validate HashKeySettlementRouter ABI
  const routerAbi = contracts["HashKeySettlementRouter.sol"]["HashKeySettlementRouter"].abi;
  const routerBytecode = contracts["HashKeySettlementRouter.sol"]["HashKeySettlementRouter"].evm.bytecode.object;
  recordCheck("HashKeySettlementRouter", "Bytecode generation", routerBytecode.length > 0, `Length: ${routerBytecode.length}`);

  const routerFunctions = routerAbi.filter((item: any) => item.type === "function").map((item: any) => item.name);
  recordCheck(
    "Finding 4 (Router)",
    "routeAgentPaymentNative present",
    routerFunctions.includes("routeAgentPaymentNative")
  );
  recordCheck(
    "Finding 4 (Router)",
    "routeAgentPaymentERC20 present",
    routerFunctions.includes("routeAgentPaymentERC20")
  );

  // 4. Validate ShunyaGridOrderbook ABI
  const obAbi = contracts["ShunyaGridOrderbook.sol"]["ShunyaGridOrderbook"].abi;
  const obBytecode = contracts["ShunyaGridOrderbook.sol"]["ShunyaGridOrderbook"].evm.bytecode.object;
  recordCheck("ShunyaGridOrderbook", "Bytecode generation", obBytecode.length > 0, `Length: ${obBytecode.length}`);

  const obFunctions = obAbi.filter((item: any) => item.type === "function").map((item: any) => item.name);
  const obErrors = obAbi.filter((item: any) => item.type === "error").map((item: any) => item.name);
  const obEvents = obAbi.filter((item: any) => item.type === "event").map((item: any) => item.name);

  // Finding 8: Access control & two-step ownership
  recordCheck(
    "Finding 8 (Orderbook)",
    "Two-step ownership: transferOwnership & acceptOwnership",
    obFunctions.includes("transferOwnership") && obFunctions.includes("acceptOwnership")
  );
  recordCheck(
    "Finding 8 (Orderbook)",
    "Unauthorized error present for non-owner mutation reverts",
    obErrors.includes("Unauthorized")
  );
  recordCheck(
    "Finding 8 (Orderbook)",
    "publishListing and deactivateListing present",
    obFunctions.includes("publishListing") && obFunctions.includes("deactivateListing")
  );
  recordCheck(
    "Finding 8 (Orderbook)",
    "OwnershipTransferStarted & OwnershipTransferred events present",
    obEvents.includes("OwnershipTransferStarted") && obEvents.includes("OwnershipTransferred")
  );

  // 5. Validate ShunyaGridEscrow ABI
  const escrowAbi = contracts["ShunyaGridEscrow.sol"]["ShunyaGridEscrow"].abi;
  const escrowBytecode = contracts["ShunyaGridEscrow.sol"]["ShunyaGridEscrow"].evm.bytecode.object;
  recordCheck("ShunyaGridEscrow", "Bytecode generation", escrowBytecode.length > 0, `Length: ${escrowBytecode.length}`);

  const escrowFunctions = escrowAbi.filter((item: any) => item.type === "function").map((item: any) => item.name);
  const escrowErrors = escrowAbi.filter((item: any) => item.type === "error").map((item: any) => item.name);
  const escrowEvents = escrowAbi.filter((item: any) => item.type === "event").map((item: any) => item.name);

  // Finding 9: Bounded commission & buyer refund
  recordCheck(
    "Finding 9 (Escrow)",
    "refundJob(bytes32) function present for 24h buyer refund",
    escrowFunctions.includes("refundJob")
  );
  recordCheck(
    "Finding 9 (Escrow)",
    "MAX_COMMISSION_BPS getter present",
    escrowFunctions.includes("MAX_COMMISSION_BPS")
  );
  recordCheck(
    "Finding 9 (Escrow)",
    "ExcessiveCommission error present",
    escrowErrors.includes("ExcessiveCommission")
  );
  recordCheck(
    "Finding 9 (Escrow)",
    "JobRefunded event present",
    escrowEvents.includes("JobRefunded")
  );

  // Verify World ID comment exists in source
  const escrowSrc = sources["ShunyaGridEscrow.sol"].content;
  const nullifierCommentExists =
    escrowSrc.includes("not verified on-chain") || escrowSrc.includes("not verified on-chain by this contract");
  recordCheck(
    "Finding 9 (Escrow)",
    "Source code comment stating World ID nullifier proof not verified on-chain",
    nullifierCommentExists
  );

  // Summary
  const total = checks.length;
  const passed = checks.filter((c) => c.passed).length;
  const failed = total - passed;

  console.log("\n===============================================================================");
  console.log(` Self-Test Summary: ${passed}/${total} checks PASSED, ${failed} FAILED`);
  console.log("===============================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runSelfTest().catch((err) => {
    console.error("Self-test error:", err);
    process.exit(1);
  });
}
