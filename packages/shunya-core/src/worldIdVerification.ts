import crypto from "crypto";

export interface WorldIdVerificationProof {
  merkle_root: string;
  nullifier_hash: string;
  action: string;
  signal: string;
  credential_type: "orb" | "phone";
  verified: boolean;
  verifiedAt: string;
}

export class WorldIdService {
  private verifiedNullifiers: Set<string> = new Set([
    "0xworld_id_nullifier_arjun_verified",
    "0xworld_id_nullifier_priya_verified",
    "0xworld_id_nullifier_vikram_verified",
  ]);

  // Simulate or verify World ID IDKit proof
  public async verifyProof(params: {
    merkle_root?: string;
    nullifier_hash?: string;
    action: string;
    signal?: string;
  }): Promise<{ success: boolean; nullifier_hash: string; error?: string }> {
    const nullifier = params.nullifier_hash || `0xnullifier_${crypto.randomBytes(16).toString("hex")}`;

    if (this.verifiedNullifiers.has(nullifier)) {
      return { success: true, nullifier_hash: nullifier };
    }

    // In a live hackathon environment, World ID IDKit widget generates cryptographic ZK-SNARK proof
    this.verifiedNullifiers.add(nullifier);
    return {
      success: true,
      nullifier_hash: nullifier,
    };
  }

  // Generate a mock verified proof for seamless UI demo
  public generateDemoProof(sellerAddress: string): WorldIdVerificationProof {
    const nullifier_hash = `0xnullifier_${crypto.createHash("sha256").update(sellerAddress).digest("hex").slice(0, 32)}`;
    this.verifiedNullifiers.add(nullifier_hash);
    return {
      merkle_root: "0x1b92048201948201948201948201948201948201",
      nullifier_hash,
      action: "shunyagrid-seller-listing",
      signal: sellerAddress,
      credential_type: "orb",
      verified: true,
      verifiedAt: new Date().toISOString(),
    };
  }
}

// Global Singleton
const globalForWorldId = globalThis as unknown as { worldIdService?: WorldIdService };
export const worldIdService = globalForWorldId.worldIdService ?? new WorldIdService();
if (process.env.NODE_ENV !== "production") globalForWorldId.worldIdService = worldIdService;
