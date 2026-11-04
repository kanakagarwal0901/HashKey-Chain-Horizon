/**
 * Browser-safe part of the wallet-signature auth scheme (EIP-712, chain 133).
 * Pages import from here; server routes import verifyAndConsumeAuth from ./authSignatures.
 */
import { ethers } from "ethers";

export const AUTH_DOMAIN = { name: "ShunyaGrid", version: "1", chainId: 133 } as const;
export const MAX_DEADLINE_WINDOW_SECONDS = 600;

export const AUTH_TYPES = {
  SellerSweep: [
    { name: "seller", type: "address" },
    { name: "recipient", type: "address" },
    { name: "amountHsk", type: "string" },
    { name: "destinationChain", type: "string" },
    { name: "targetToken", type: "string" },
    { name: "nonce", type: "bytes32" },
    { name: "deadline", type: "uint256" },
  ],
  ListingWrite: [
    { name: "owner", type: "address" },
    { name: "action", type: "string" }, // "create" | "update" | "delete"
    { name: "listingId", type: "string" }, // "" for create
    { name: "model", type: "string" },
    { name: "payoutAddress", type: "address" },
    { name: "sealedApiKeyHash", type: "bytes32" }, // keccak256(utf8(sealedApiKey)), ZeroHash for delete
    { name: "pricePer1kMicroUsdc", type: "uint256" },
    { name: "nonce", type: "bytes32" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export type AuthPrimaryType = keyof typeof AUTH_TYPES;

export interface SignedAuth<T> {
  message: T;
  signature: string;
}

/** Browser/agent helper: fresh nonce + deadline. */
export function newNonceAndDeadline(windowSeconds = 300): { nonce: string; deadline: number } {
  return {
    nonce: ethers.hexlify(ethers.randomBytes(32)),
    deadline: Math.floor(Date.now() / 1000) + Math.min(windowSeconds, MAX_DEADLINE_WINDOW_SECONDS),
  };
}

export function typedDataFor(primaryType: AuthPrimaryType) {
  return { domain: AUTH_DOMAIN, types: { [primaryType]: AUTH_TYPES[primaryType] } as Record<string, any> };
}

