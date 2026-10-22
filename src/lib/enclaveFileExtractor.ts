import crypto from "crypto";
// @ts-ignore
import pdfParse from "pdf-parse";
import AdmZip from "adm-zip";
import Papa from "papaparse";
import { fetchEncryptedFileBytes } from "./zeroGStorageClient";

export interface EncryptedFilePointer {
  storageBackend: "arkiv" | "0g-storage";
  storageRef: string;
  ivHex: string;
  authTagHex: string;
  filename?: string;
  mimeType?: string;
  byteLength?: number;
}

export interface ParsedAttachment {
  filename: string;
  mimeType: string;
  textContent?: string;
  visionPart?: {
    openAiVisionPart?: any;
    anthropicVisionPart?: any;
  };
  sha256Hex: string;
}

export async function decryptAndParseFileInEnclaveRam(
  pointer: EncryptedFilePointer,
  kInputBuffer: Buffer
): Promise<ParsedAttachment> {
  // 1. Fetch encrypted bytes from Arkiv (<=120 KiB) or 0G Storage (>120 KiB)
  const fullEncryptedBytes = await fetchEncryptedFileBytes(
    pointer.storageBackend,
    pointer.storageRef
  );

  const iv = Buffer.from(pointer.ivHex, "hex");
  const authTag = Buffer.from(pointer.authTagHex, "hex");

  // In WebCrypto subtle.encrypt, the auth tag might be at the end of the buffer or separate
  let ciphertext = fullEncryptedBytes;
  if (fullEncryptedBytes.length > 16 && fullEncryptedBytes.subarray(-16).equals(authTag)) {
    ciphertext = fullEncryptedBytes.subarray(0, -16);
  }

  // 2. Decrypt in isolated RAM using AES-256-GCM
  const decipher = crypto.createDecipheriv("aes-256-gcm", kInputBuffer, iv);
  decipher.setAuthTag(authTag);

  const decryptedBytes = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  const filename = pointer.filename || "attachment.bin";
  const mimeType = (pointer.mimeType || "application/octet-stream").toLowerCase();
  const sha256Hex = crypto.createHash("sha256").update(decryptedBytes).digest("hex");

  let textContent = "";
  let visionPart: ParsedAttachment["visionPart"] = undefined;

  try {
    // A. PDF parsing
    if (mimeType.includes("pdf") || filename.endsWith(".pdf")) {
      const pdfData = await pdfParse(decryptedBytes);
      textContent = `=== [ATTACHED PDF: ${filename} (${pdfData.numpages} pages)] ===\n${pdfData.text.trim()}`;
    }
    // B. ZIP archive parsing
    else if (mimeType.includes("zip") || filename.endsWith(".zip")) {
      const zip = new AdmZip(decryptedBytes);
      const zipEntries = zip.getEntries();
      const fileContents: string[] = [];

      for (const entry of zipEntries) {
        if (!entry.isDirectory) {
          const entryName = entry.entryName;
          // Only read text/code entries
          const isText = /\.(ts|tsx|js|jsx|json|py|sol|md|txt|csv|sql|html|css|yaml|yml|rs|go|c|cpp|h)$/i.test(entryName);
          if (isText) {
            const data = entry.getData().toString("utf8");
            fileContents.push(`--- File: ${entryName} ---\n${data.slice(0, 50_000)}`);
          }
        }
      }
      textContent = `=== [ATTACHED ZIP CODEBASE: ${filename} (${zipEntries.length} files)] ===\n` + fileContents.join("\n\n");
    }
    // C. CSV or TSV parsing
    else if (mimeType.includes("csv") || mimeType.includes("tsv") || filename.endsWith(".csv") || filename.endsWith(".tsv")) {
      const csvStr = decryptedBytes.toString("utf8");
      const parsed = Papa.parse(csvStr, { header: true, preview: 100 });
      textContent = `=== [ATTACHED CSV DATA: ${filename} (${parsed.data.length} preview rows)] ===\n` + JSON.stringify(parsed.data, null, 2);
    }
    // D. Vision images (PNG, JPEG, WebP, GIF)
    else if (
      mimeType.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif)$/i.test(filename)
    ) {
      const base64Data = decryptedBytes.toString("base64");
      const dataUri = `data:${mimeType};base64,${base64Data}`;
      visionPart = {
        openAiVisionPart: {
          type: "image_url",
          image_url: { url: dataUri },
        },
        anthropicVisionPart: {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: base64Data,
          },
        },
      };
      textContent = `=== [ATTACHED IMAGE: ${filename} (${mimeType}, ${decryptedBytes.byteLength} bytes)] ===`;
    }
    // E. Code or plain text files
    else if (
      mimeType.startsWith("text/") ||
      /\.(ts|tsx|js|jsx|json|py|sol|md|txt|sql|html|css|yaml|yml|rs|go|c|cpp|h|xml)$/i.test(filename)
    ) {
      textContent = `=== [ATTACHED CODE/DOCUMENT: ${filename}] ===\n` + decryptedBytes.toString("utf8");
    }
    // F. Unknown binary fallback
    else {
      // Extract printable ASCII strings
      const asciiStrings = decryptedBytes
        .toString("binary")
        .replace(/[^\x20-\x7E\r\n\t]/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 1000);
      textContent = `=== [ATTACHED BINARY METADATA: ${filename} (${mimeType}, ${decryptedBytes.byteLength} bytes, SHA-256: ${sha256Hex})] ===\nHeader Strings: ${asciiStrings}`;
    }
  } finally {
    // Secure memory zeroing of temporary decrypted buffer (CROPS Security)
    decryptedBytes.fill(0);
  }

  return {
    filename,
    mimeType,
    textContent,
    visionPart,
    sha256Hex,
  };
}
