import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { storeSmallEncryptedFileOnArkiv } from "@/lib/arkivQuotaAndFileDb";
import { uploadLargeEncryptedBlobTo0G } from "@/lib/zeroGStorageClient";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ciphertextBase64,
      ivHex,
      authTagHex,
      originalSizeBytes,
      mimeType,
      filename,
    } = body;

    if (!ciphertextBase64 || !ivHex || !authTagHex) {
      return NextResponse.json(
        { error: "Missing required fields: ciphertextBase64, ivHex, authTagHex" },
        { status: 400 }
      );
    }

    const encryptedBuffer = Buffer.from(ciphertextBase64, "base64");
    const byteLength = encryptedBuffer.byteLength;
    const filenameHash = crypto.createHash("sha256").update(filename || "blob").digest("hex");

    // Ceiling: 120 KiB (120 * 1024 = 122,880 bytes)
    const ARKIV_THRESHOLD = 120 * 1024;

    if (byteLength <= ARKIV_THRESHOLD) {
      // Route to Arkiv DB-Chain with 10-min auto-expiration
      const arkivResult = await storeSmallEncryptedFileOnArkiv(
        new Uint8Array(encryptedBuffer),
        {
          filenameHash,
          ivHex,
          authTagHex,
          mimeType,
          filename,
        }
      );

      return NextResponse.json({
        storageBackend: "arkiv",
        storageRef: arkivResult.storageRef,
        ivHex,
        authTagHex,
        byteLength,
        filename: filename || "unknown",
        mimeType: mimeType || "application/octet-stream",
        expirationBlockOrTx: arkivResult.expirationBlock.toString(),
        txHash: arkivResult.txHash,
      });
    } else {
      // Route to 0G Storage Merkle Blob
      const zgResult = await uploadLargeEncryptedBlobTo0G(encryptedBuffer);

      return NextResponse.json({
        storageBackend: "0g-storage",
        storageRef: zgResult.storageRef,
        ivHex,
        authTagHex,
        byteLength,
        filename: filename || "unknown",
        mimeType: mimeType || "application/octet-stream",
        expirationBlockOrTx: zgResult.txHash,
        txHash: zgResult.txHash,
      });
    }
  } catch (err: any) {
    console.error("[UploadEncrypted] Storage failure:", err);
    return NextResponse.json(
      { error: err.message || "Failed to store encrypted file." },
      { status: 500 }
    );
  }
}
