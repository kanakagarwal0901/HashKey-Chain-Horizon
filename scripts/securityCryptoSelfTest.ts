import {
  getOrCreateEnclaveKeyPair,
  sealSellerApiKeyToEnclave,
  unwrapSellerApiKey,
  sealBuyerPromptAndFiles,
  zeroGService,
} from "../packages/shunya-core/src/index";
import {
  unwrapBuyerEnvelopeInEnclave,
  unwrapSellerApiKeyInEnclave,
  getEnclaveAttestationReport,
} from "../src/lib/enclaveKeyVault";

async function main() {
  console.log("=== ShunyaGrid Security Crypto Self-Test ===");
  let passed = 0;
  let failed = 0;

  // 1. Round-trip test: Seal prompt with public key and unwrap with server function
  try {
    const { publicKey } = getOrCreateEnclaveKeyPair();
    const testPrompt = "Confidential test prompt for enclave execution verification";
    const sealedPrompt = sealBuyerPromptAndFiles(testPrompt, [], publicKey);

    const unwrappedEnvelope = unwrapBuyerEnvelopeInEnclave(sealedPrompt.encryptedEnvelope);
    if (unwrappedEnvelope.promptText !== testPrompt) {
      throw new Error(`Prompt mismatch: expected '${testPrompt}', got '${unwrappedEnvelope.promptText}'`);
    }

    // Also verify seller API key sealing round-trip
    const testApiKey = "sk-ant-api03-samplekey123456789abcdefghijklmnopqrstuvwxyz";
    const sealedApiKey = sealSellerApiKeyToEnclave(testApiKey, publicKey);
    const unwrappedApiKey = unwrapSellerApiKeyInEnclave(sealedApiKey);
    if (unwrappedApiKey !== testApiKey) {
      throw new Error("API key round-trip mismatch");
    }

    console.log("✔ [1/6] Round-trip test (prompt + seller key sealing/unwrapping): OK");
    passed++;
  } catch (err: any) {
    console.error("✘ [1/6] Round-trip test FAILED:", err.message);
    failed++;
  }

  // 2. Plaintext sealing rejection: ENCLAVE_SEALED:xyz -> throws
  try {
    let threw = false;
    try {
      unwrapSellerApiKeyInEnclave("ENCLAVE_SEALED:xyz");
    } catch {
      threw = true;
    }

    if (!threw) {
      throw new Error("unwrapSellerApiKeyInEnclave did NOT throw on ENCLAVE_SEALED:xyz");
    }

    // Also test direct unwrapSellerApiKey
    const { privateKey } = getOrCreateEnclaveKeyPair();
    threw = false;
    try {
      unwrapSellerApiKey("ENCLAVE_SEALED:sk-test-key", privateKey);
    } catch {
      threw = true;
    }

    if (!threw) {
      throw new Error("unwrapSellerApiKey did NOT throw on ENCLAVE_SEALED");
    }

    console.log("✔ [2/6] ENCLAVE_SEALED:xyz rejection test: throws OK");
    passed++;
  } catch (err: any) {
    console.error("✘ [2/6] ENCLAVE_SEALED rejection test FAILED:", err.message);
    failed++;
  }

  // 3. Base64-JSON wrappedKeys -> throws
  try {
    const fakeWrappedKeys = Buffer.from(
      JSON.stringify({
        kInputHex: "11".repeat(32),
        kReturnHex: "22".repeat(32),
      })
    ).toString("base64");

    let threw = false;
    try {
      unwrapBuyerEnvelopeInEnclave({
        wrappedKeysBase64: fakeWrappedKeys,
        promptIvHex: "00".repeat(12),
        promptAuthTagHex: "00".repeat(16),
        encryptedPromptBase64: Buffer.from("hello").toString("base64"),
      });
    } catch {
      threw = true;
    }

    if (!threw) {
      throw new Error("unwrapBuyerEnvelopeInEnclave did NOT throw on unencrypted base64-JSON wrappedKeys");
    }

    console.log("✔ [3/6] Base64-JSON wrappedKeys rejection test: throws OK");
    passed++;
  } catch (err: any) {
    console.error("✘ [3/6] Base64-JSON wrappedKeys rejection test FAILED:", err.message);
    failed++;
  }

  // 4. Missing SHUNYA_ENCLAVE_PRIVATE_KEY -> throws
  try {
    const savedPrivKey = process.env.SHUNYA_ENCLAVE_PRIVATE_KEY;
    delete process.env.SHUNYA_ENCLAVE_PRIVATE_KEY;

    // Clear singleton cache
    const globalObj = globalThis as any;
    const savedCache = globalObj.enclaveKeyPair;
    delete globalObj.enclaveKeyPair;

    let threw = false;
    try {
      getOrCreateEnclaveKeyPair();
    } catch {
      threw = true;
    }

    // Restore environment & cache
    process.env.SHUNYA_ENCLAVE_PRIVATE_KEY = savedPrivKey;
    globalObj.enclaveKeyPair = savedCache;

    if (!threw) {
      throw new Error("getOrCreateEnclaveKeyPair did NOT throw when SHUNYA_ENCLAVE_PRIVATE_KEY is unset");
    }

    console.log("✔ [4/6] With SHUNYA_ENCLAVE_PRIVATE_KEY unset: throws OK");
    passed++;
  } catch (err: any) {
    console.error("✘ [4/6] Missing env var test FAILED:", err.message);
    failed++;
  }

  // 5. Bare plaintext API key rejection -> throws
  try {
    const { privateKey } = getOrCreateEnclaveKeyPair();
    let threw = false;
    try {
      unwrapSellerApiKey("sk-ant-api03-not-sealed-at-all", privateKey);
    } catch {
      threw = true;
    }

    if (!threw) {
      throw new Error("unwrapSellerApiKey did NOT throw on bare plaintext API key");
    }

    console.log("✔ [5/6] Bare plaintext API key rejection test: throws OK");
    passed++;
  } catch (err: any) {
    console.error("✘ [5/6] Bare plaintext API key rejection test FAILED:", err.message);
    failed++;
  }

  // 6. Attestation honesty check: status = simulated, teeType = none (software), timestamps match
  try {
    const report = getEnclaveAttestationReport();
    if (report.status !== "simulated" || report.teeType !== "none (software)") {
      throw new Error(
        `Attestation report honesty mismatch: status=${report.status}, teeType=${report.teeType}`
      );
    }

    const receipt = zeroGService.signExecutionReceipt({
      model: "test-model",
      thinkingLevel: "none",
      maxTokens: 1000,
      tokensUsed: 200,
      promptHash: "0x" + "aa".repeat(32),
    });

    if (receipt.status !== "simulated" || receipt.teeType !== "none (software)") {
      throw new Error(
        `Receipt honesty mismatch: status=${receipt.status}, teeType=${receipt.teeType}`
      );
    }

    console.log("✔ [6/6] Attestation honesty check: status=simulated, teeType=none (software): OK");
    passed++;
  } catch (err: any) {
    console.error("✘ [6/6] Attestation honesty check FAILED:", err.message);
    failed++;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
