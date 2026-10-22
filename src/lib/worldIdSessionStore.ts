import crypto from "crypto";
import { signRequest } from "@worldcoin/idkit/signing";
import { IDKit, orbLegacy, configureIDKitRuntime } from "@worldcoin/idkit";
import qrcode from "qrcode";

// Crucial: instruct IDKit to never allow Next.js Data Cache to cache bridge polling requests
configureIDKitRuntime({
  fetch: (input: any, init: any) => {
    return fetch(input, {
      ...init,
      cache: "no-store",
    });
  },
});

export interface ActiveWorldIdSession {
  sessionId: string;
  connectorURI: string;
  simulatorUrl: string;
  qrDataUrl: string;
  walletAddress: string;
  createdAt: number;
  req: any;
  cachedResult?: any;
  rpId: string;
  action: string;
  nonce: string;
  signalHash?: string;
  isStaging?: boolean;
  environment?: "staging" | "production";
}

// In-memory global store to preserve sessions across Next.js API route invocations
const globalForSessions = globalThis as unknown as {
  worldIdSessions?: Map<string, ActiveWorldIdSession>;
};

export const worldIdSessions =
  globalForSessions.worldIdSessions ?? new Map<string, ActiveWorldIdSession>();

if (process.env.NODE_ENV !== "production") {
  globalForSessions.worldIdSessions = worldIdSessions;
}

/**
 * Creates a real, live Worldcoin Staging Bridge session using official IDKit.
 * Generates the authentic connectorURI and simulator deep link.
 */
export async function createRealWorldIdSession(
  walletAddress: string = "0xAnonymous",
  customAppId?: string,
  customAction?: string
): Promise<ActiveWorldIdSession> {
  const sessionId = crypto.randomUUID();
  const appId =
    customAppId ||
    process.env.WORLD_ID_APP_ID ||
    "app_9c7005e230a8dc3eced53aaa2b78a17f";
  const action =
    customAction ||
    process.env.WORLD_ID_ACTION ||
    "shunyagrid-gate";

  const signingKeyHex =
    process.env.WORLD_ID_SIGNING_KEY ||
    process.env.RP_SIGNING_KEY ||
    crypto.createHash("sha256").update("shunyagrid-worldid-secret-key").digest("hex");

  const sig = signRequest({
    signingKeyHex,
    action,
  });

  // Query developer portal for the app's real rp_id & staging/production environment
  let rpId = process.env.WORLD_RP_ID || process.env.WORLD_ID_RP_ID || "rp_00119a6fba87b026";
  let isStaging = false;
  try {
    const precheckRes = await fetch(`https://developer.worldcoin.org/api/v1/precheck/${appId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (precheckRes.ok) {
      const precheck = await precheckRes.json();
      if (precheck.rp_id) {
        rpId = precheck.rp_id;
      }
      if (typeof precheck.is_staging === "boolean") {
        isStaging = precheck.is_staging;
      }
    }
  } catch (err) {
    // Fall back cleanly
  }

  const rp_context = {
    rp_id: rpId,
    nonce: sig.nonce,
    created_at: sig.createdAt,
    expires_at: sig.expiresAt,
    signature: sig.sig,
  };

  const builder = IDKit.request({
    app_id: appId as any,
    action,
    rp_context,
    allow_legacy_proofs: true,
    environment: "staging",
  });

  const req = await builder.preset(orbLegacy({ signal: walletAddress }));
  const connectorURI = req.connectorURI;
  const simulatorUrl = `https://simulator.worldcoin.org/?connect_url=${encodeURIComponent(connectorURI)}`;
  const qrDataUrl = await qrcode.toDataURL(connectorURI);
  const reqAny = req as any;
  const signalHash =
    reqAny.bridgeRequest?.compiled?.legacy_signal_hash ||
    reqAny.bridgeRequest?.compiled?.signal_hashes?.["orb"];

  const session: ActiveWorldIdSession = {
    sessionId,
    connectorURI,
    simulatorUrl,
    qrDataUrl,
    walletAddress,
    createdAt: Date.now(),
    req,
    rpId,
    action,
    nonce: sig.nonce,
    signalHash,
    isStaging: true,
    environment: "staging",
  };

  worldIdSessions.set(sessionId, session);

  // Clean up sessions older than 15 minutes
  const now = Date.now();
  for (const [id, s] of worldIdSessions.entries()) {
    if (now - s.createdAt > 15 * 60 * 1000) {
      worldIdSessions.delete(id);
    }
  }

  return session;
}
