/**
 * Wallet-signature authorization for state-changing API calls (EIP-712, chain 133).
 * Shared by server routes (verify) and browser pages (build typed data, then
 * eth_signTypedData_v4 / ethers signer.signTypedData).
 *
 * Replay protection: every signed request carries a random 32-byte nonce and a
 * deadline (max 10 minutes ahead). The server records used nonces until their
 * deadline passes.
 */
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { MAX_DEADLINE_WINDOW_SECONDS, typedDataFor, type AuthPrimaryType, type SignedAuth } from "./authSignaturesShared";

export * from "./authSignaturesShared";

// ---------------- server-side nonce store ----------------
const NONCE_FILE = path.resolve(process.cwd(), ".data", "used_auth_nonces.json");
let usedNonces: Map<string, number> | null = null;

function loadNonces(): Map<string, number> {
  if (usedNonces) return usedNonces;
  usedNonces = new Map();
  try {
    const raw = JSON.parse(fs.readFileSync(NONCE_FILE, "utf8")) as Record<string, number>;
    const now = Math.floor(Date.now() / 1000);
    for (const [k, v] of Object.entries(raw)) if (v > now) usedNonces.set(k, v);
  } catch {
    /* no file yet */
  }
  return usedNonces;
}

function persistNonces() {
  try {
    fs.mkdirSync(path.dirname(NONCE_FILE), { recursive: true });
    fs.writeFileSync(NONCE_FILE, JSON.stringify(Object.fromEntries(loadNonces())));
  } catch (e: any) {
    console.warn("[authSignatures] could not persist nonce store:", e?.message);
  }
}

/**
 * Verify an EIP-712 signed request. Returns the recovered signer (checksummed)
 * or throws an Error with a client-safe message. `expectedSigner` must match.
 * Consumes the nonce synchronously (before any await in the caller), so
 * concurrent replays of the same signature are rejected.
 */
export function verifyAndConsumeAuth<T extends { nonce: string; deadline: number | string | bigint }>(
  primaryType: AuthPrimaryType,
  signed: SignedAuth<T> | undefined | null,
  expectedSigner: string
): string {
  if (!signed || !signed.signature || !signed.message) throw new Error("Missing wallet signature");
  const msg = signed.message;
  const now = Math.floor(Date.now() / 1000);
  const deadline = Number(msg.deadline);
  if (!Number.isFinite(deadline) || deadline < now) throw new Error("Signature expired");
  if (deadline > now + MAX_DEADLINE_WINDOW_SECONDS) throw new Error("Signature deadline too far in the future");
  if (!ethers.isHexString(msg.nonce, 32)) throw new Error("Invalid nonce");

  const { domain, types } = typedDataFor(primaryType);
  let recovered: string;
  try {
    recovered = ethers.verifyTypedData(domain, types, msg as any, signed.signature);
  } catch {
    throw new Error("Invalid signature");
  }
  if (!expectedSigner || recovered.toLowerCase() !== expectedSigner.toLowerCase()) {
    throw new Error("Signature does not match wallet");
  }

  const nonces = loadNonces();
  const key = `${primaryType}:${recovered.toLowerCase()}:${msg.nonce.toLowerCase()}`;
  if (nonces.has(key)) throw new Error("Signature already used");
  nonces.set(key, deadline);
  for (const [k, v] of nonces) if (v < now) nonces.delete(k);
  persistNonces();
  return recovered;
}
