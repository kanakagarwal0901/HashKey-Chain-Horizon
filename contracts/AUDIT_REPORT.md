# ShunyaGrid & HashKey Settlement Protocol Smart Contract Security Audit Report

**Audit Target**: `contracts/HSPAdapter.sol`, `contracts/HashKeySettlementRouter.sol`, `contracts/ShunyaGridOrderbook.sol`, `contracts/ShunyaGridEscrow.sol`  
**Date**: November 2026  
**Compiler Version**: Solidity `^0.8.20`  
**License**: MIT  

---

## 1. Executive Summary

A thorough security evaluation and code review was conducted across the core settlement and orderbook contracts. The previous assessment contained inaccurate "SAFE / 0.0 RISK / PRODUCTION READY" certifications despite several critical attack vectors, including unbounded owner fees, push-payment DoS vulnerabilities, router address misattribution trapping buyer refunds, and completely unauthenticated orderbook mutations.

All identified vulnerabilities have been remediated. The contracts are now substantially hardened with mathematical payout caps, pull-payment fallbacks, safe low-level token wrappers, caller-attributed orderbook permissions, and two-step ownership management. However, several inherent residual risks (detailed in Section 3) remain and must be managed operationally.

### Contract Status Overview

| Contract | Prior Assessment | Post-Remediation Status | Key Mitigations |
| :--- | :--- | :--- | :--- |
| **`HSPAdapter.sol`** | Inaccurate "SAFE" | **Remediated & Hardened** | Bounded pro-rata payouts, MAX 20% protocol fee cap, pull-payment fallback (`withdraw()`), 24h buyer self-refund, safe ERC20 wrappers, two-step ownership. |
| **`HashKeySettlementRouter.sol`** | Inaccurate "SAFE" | **Remediated & Hardened** | `lockHSPMandateFor()` attribution passing buyer address, safe ERC20 low-level approval/transfer wrappers. |
| **`ShunyaGridOrderbook.sol`** | Unreviewed | **Remediated & Hardened** | Two-step ownership, caller-restricted `publishListing` / `deactivateListing` (only listing owner or contract owner). |
| **`ShunyaGridEscrow.sol`** | Inaccurate "SAFE" | **Remediated & Hardened** | 20% commission cap, 24h buyer timeout refund (`refundJob()`), documented off-chain World ID ZK verification boundary. |

---

## 2. Vulnerability Findings & Implemented Fixes

### Finding 1: Unbounded Settlement Payouts & Protocol Fees (HSPAdapter.sol)
* **Severity**: **HIGH**
* **Vulnerability**: `settleHSPMandate` previously only validated that `sellerPayout + protocolFee + buyerRefund == maxDeposit`. `tUsed` and `attestationHash` were completely ignored. A malicious or compromised owner could configure a rogue treasury via `setProtocolTreasury` and siphon 100% of the buyer deposit as `protocolFee`.
* **Fix**:
  1. Enforced `tUsed <= mandate.tMax`.
  2. Enforced pro-rata ceiling on seller payouts: `sellerPayout <= (mandate.maxDeposit * tUsed) / mandate.tMax`.
  3. Capped protocol fee at `MAX_FEE_BPS = 2000` (max 20%): `protocolFee <= (mandate.maxDeposit * MAX_FEE_BPS) / 10000`.
  4. Kept the strict Conservation of Value invariant (`sellerPayout + protocolFee + buyerRefund == mandate.maxDeposit`), ensuring remaining funds are refunded to the buyer.
  5. Added `ProtocolTreasuryUpdated` event emission to `setProtocolTreasury`.

### Finding 2: Single-Step Ownership Lockout (HSPAdapter.sol & ShunyaGridOrderbook.sol)
* **Severity**: **MEDIUM**
* **Vulnerability**: Single-step ownership transfer posed a critical risk of permanent contract lockout if an incorrect or non-callable address was provided.
* **Fix**: Implemented two-step ownership management (`transferOwnership` + `acceptOwnership`) with `OwnershipTransferStarted` and `OwnershipTransferred` events on both `HSPAdapter` and `ShunyaGridOrderbook`.

### Finding 3: Mandate ID Front-Running & Squatting (HSPAdapter.sol)
* **Severity**: **LOW-MEDIUM**
* **Vulnerability**: `mandates` is keyed by `bytes32 mandateId`. If an attacker discovers a mandateId prior to block inclusion, they could front-run the transaction with a 1-wei deposit.
* **Remediation Choice**: To preserve external ABI compatibility for indexers, SDKs, and settlement callers without altering `settleHSPMandate(bytes32 mandateId, ...)` or public getters, the `mapping(bytes32 => HSPPaymentMandate) public mandates` keying was preserved. Because client and server engines generate cryptographically random 256-bit UUID/keccak256 identifiers, squatting requires mempool front-running rather than collision guessing. (See Residual Risks).

### Finding 4: Buyer Misattribution in Native & ERC20 Routing (HashKeySettlementRouter.sol)
* **Severity**: **HIGH**
* **Vulnerability**: When routing native payments, `routeAgentPaymentNative` called `lockHSPMandateDirect` directly, causing `hspAdapter` to record `buyerAgent = address(router)`. If the settlement refunded the buyer or the mandate timed out, refund funds were sent to the router where they became trapped. Furthermore, the ERC20 path transferred tokens directly to the adapter rather than approving it.
* **Fix**:
  1. Added `lockHSPMandateFor(address buyer, bytes32 mandateId, ...)` to `HSPAdapter`, callable only by `trustedRouter`.
  2. Updated `HashKeySettlementRouter.routeAgentPaymentNative` and `routeAgentPaymentERC20` to forward `msg.sender` as `buyer`.
  3. In `routeAgentPaymentERC20`, implemented safe `_safeTransferFrom` into router, followed by `_safeApprove` to `hspAdapter`, and finally `lockHSPMandateFor`.

### Finding 5: Unsafe ERC20 Token Handling & Missing msg.value Guard (HSPAdapter.sol)
* **Severity**: **MEDIUM**
* **Vulnerability**: Direct calls to `IERC20.transfer` and `IERC20.transferFrom` fail on non-standard tokens that return `void` instead of `bool` (such as USDT). Additionally, depositing ERC20 tokens while attaching native HSK (`msg.value > 0`) could lead to lost funds, and fee-on-transfer tokens could result in an accounting deficit.
* **Fix**:
  1. Added low-level `_safeTransfer` and `_safeTransferFrom` wrappers verifying contract code length and handling both boolean and void returns.
  2. Enforced `msg.value == 0` for all ERC20 deposit functions.
  3. Recorded actual received amount by calculating balance deltas (`balanceOf(after) - balanceOf(before)`).

### Finding 6: Push-Payment Denial of Service (HSPAdapter.sol)
* **Severity**: **HIGH**
* **Vulnerability**: In `settleHSPMandate` and `refundHSPMandate`, native HSK transfers reverted if `sellerNode`, `buyerAgent`, or `protocolTreasury` failed or was a contract rejecting ETH. A malicious seller or buyer could intentionally revert in `receive()`, halting settlement for all other participants.
* **Fix**: Adopted the Pull-over-Push pattern. If a native call fails during settlement or refund, the exact amount is credited to `pendingWithdrawals[recipient]` and a `PendingWithdrawalCredited` event is emitted. The recipient can withdraw their balance at any time via `withdraw()`.

### Finding 7: Insufficient Timeout on Buyer Self-Refund (HSPAdapter.sol)
* **Severity**: **MEDIUM**
* **Vulnerability**: The previous 1-hour timeout allowed premature buyer cancellations while asynchronous A2A workflows or multi-hop tasks were still processing.
* **Fix**: Extended the buyer self-refund constraint to `block.timestamp >= mandate.createdAt + 24 hours`. The contract owner retains emergency refund authority at any time.

### Finding 8: Missing Access Control on Node Listings (ShunyaGridOrderbook.sol)
* **Severity**: **HIGH**
* **Vulnerability**: Anyone could invoke `publishListing` with any existing `id` and overwrite the seller's `payoutAddress`, `sealedApiKey`, and pricing. Similarly, anyone could call `deactivateListing` on any node.
* **Fix**:
  1. For updating existing listings: caller must be `item.ownerAddress` or `contract owner`.
  2. For publishing new listings: `ownerAddress` must match `msg.sender` unless caller is `contract owner` (server relay).
  3. For deactivating listings: caller must be `item.ownerAddress` or `contract owner`.

### Finding 9: Missing Buyer Refund & Unbounded Escrow Commission (ShunyaGridEscrow.sol)
* **Severity**: **HIGH**
* **Vulnerability**: `ShunyaGridEscrow` lacked any buyer refund mechanism, permanently locking funds if the owner failed to settle. Furthermore, `protocolCommission` was unbounded, allowing the owner to seize the entire deposit.
* **Fix**:
  1. Added `refundJob(bytes32 jobId)` enabling buyers to claim a full refund after a 24-hour timeout (or owner at any time).
  2. Bounded protocol commission to `MAX_COMMISSION_BPS = 2000` (max 20%).
  3. Added explicit code documentation noting that World ID ZK proofs are verified off-chain, and only the single-use nullifier is tracked on-chain.

---

## 3. Residual Risks & Operational Considerations

1. **Mandate ID Collision / Mempool Front-Running**:
   - Because `mandates` is indexed by `mandateId` rather than `keccak256(buyer, mandateId)`, an adversarial node in a public mempool could theoretically copy a seen `mandateId` and submit a 1-wei deposit.
   - *Operational Mitigation*: Clients must generate cryptographically random 256-bit identifiers (`crypto.getRandomValues(new Uint8Array(32))`). On public testnets/mainnet, transactions should be submitted via private RPC endpoints or low-latency sequencers to minimize mempool exposure.

2. **World ID Verification Boundary**:
   - `ShunyaGridEscrow` records nullifiers to prevent duplicate spends, but does not verify World ID ZK SNARK proofs on-chain (due to gas overhead and verifier availability on HashKey Chain). Proof validation occurs on the API relayer before transactions are submitted.
   - *Operational Mitigation*: Relayers must reject invalid or unverified World ID proofs before submitting on-chain calls.

3. **Owner Authority & Centralization**:
   - The contract owner has the privilege to settle mandates, route emergency refunds, and update trusted routers and treasuries.
   - *Operational Mitigation*: In production, ownership should be transferred to a multi-signature wallet (e.g. Safe) or a timelock governance contract.

4. **Pull-Payment User Experience**:
   - If an agent or seller smart contract fails to accept native HSK, funds are credited to `pendingWithdrawals`. Agents must be programmed to detect `PendingWithdrawalCredited` events and invoke `withdraw()`.
