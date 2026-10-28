import {
  getOrCreateEnclaveKeyPair,
  unwrapSellerApiKey,
  cleanApiKey,
  isRecognizedApiKey,
  verifyApiKeyWithProvider,
  getModelMetadata,
  arkivDb,
  DEFAULT_ENCLAVE_KEYPAIR,
} from "../packages/shunya-core/src/index";
import crypto from "crypto";

async function runEndToEndVerification() {
  console.log("=======================================================================");
  console.log("  VERIFYING SELLER LISTING & ENCLAVE CRYPTO END-TO-END FLOW");
  console.log("=======================================================================\n");

  // 1. Verify deterministic master enclave keypair
  const { publicKey, privateKey } = getOrCreateEnclaveKeyPair();
  if (publicKey !== DEFAULT_ENCLAVE_KEYPAIR.publicKey || privateKey !== DEFAULT_ENCLAVE_KEYPAIR.privateKey) {
    throw new Error("FAIL: getOrCreateEnclaveKeyPair() does not match DEFAULT_ENCLAVE_KEYPAIR!");
  }
  console.log("✔ [1/6] Master enclave keypair is deterministic and matches DEFAULT_ENCLAVE_KEYPAIR.");

  // 2. Test cleanApiKey edge cases
  const dirtyKeys = [
    { input: '"AIzaSy1234567890abcdef"', expected: "AIzaSy1234567890abcdef" },
    { input: "'sk-proj-9876543210zyxw'", expected: "sk-proj-9876543210zyxw" },
    { input: 'Bearer AIzaSy1234567890abcdef', expected: "AIzaSy1234567890abcdef" },
    { input: '  "Bearer gsk_123456789"  ', expected: "gsk_123456789" },
    { input: 'AQ.Ab81234567890', expected: "AQ.Ab81234567890" },
  ];
  for (const item of dirtyKeys) {
    const cleaned = cleanApiKey(item.input);
    if (cleaned !== item.expected) {
      throw new Error(`FAIL: cleanApiKey(${item.input}) = ${cleaned}, expected ${item.expected}`);
    }
  }
  console.log("✔ [2/6] cleanApiKey handles quotes, Bearer prefixes, and trimming.");

  // 3. Test RSA-OAEP direct sealing (<= 180 bytes)
  const testApiKey = "AIzaSyTest_Google_Gemini_Key_9876543210_valid";
  const rsaEncrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(testApiKey, "utf8")
  ).toString("base64");

  const unwrappedRsa = unwrapSellerApiKey(rsaEncrypted, privateKey);
  if (unwrappedRsa !== testApiKey) {
    throw new Error(`FAIL: unwrapSellerApiKey RSA direct mismatch: got ${unwrappedRsa}, expected ${testApiKey}`);
  }
  console.log("✔ [3/6] Direct RSA-OAEP unwrap works with 100% fidelity.");

  // 4. Test Hybrid AES-256-GCM + RSA-OAEP sealing (> 180 bytes, e.g. long OpenAI project keys)
  const longKey = "sk-proj-" + "X".repeat(220) + "_test_seller_key";
  const aesKey = crypto.randomBytes(32);
  const wrappedAesKey = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    aesKey
  );
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
  const ciphertext = Buffer.concat([cipher.update(longKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const fullCipher = Buffer.concat([ciphertext, tag]);

  const hybridEnvelope = "ENCLAVE_HYBRID:" + JSON.stringify({
    w: wrappedAesKey.toString("base64"),
    iv: iv.toString("hex"),
    c: fullCipher.toString("base64"),
  });

  const unwrappedHybrid = unwrapSellerApiKey(hybridEnvelope, privateKey);
  if (unwrappedHybrid !== longKey) {
    throw new Error(`FAIL: unwrapSellerApiKey hybrid mismatch: got ${unwrappedHybrid}, expected ${longKey}`);
  }
  console.log("✔ [4/6] Hybrid AES-256-GCM + RSA-OAEP unwrap successfully decodes keys > 180 bytes.");

  // 5. Test ENCLAVE_SEALED: fallback envelope
  const fallbackKey = "AIzaSy_Fallback_Test_Key_1234567890";
  const fallbackEnvelope = `ENCLAVE_SEALED:${fallbackKey}`;
  const unwrappedFallback = unwrapSellerApiKey(fallbackEnvelope, privateKey);
  if (unwrappedFallback !== fallbackKey) {
    throw new Error(`FAIL: unwrapSellerApiKey fallback mismatch: got ${unwrappedFallback}, expected ${fallbackKey}`);
  }
  console.log("✔ [5/6] ENCLAVE_SEALED envelope gracefully unwraps fallback keys.");

  // 6. Test Model Provider Resolution & Mock Verification with Test Key
  const modelToTest = "gemini-2.0-flash-thinking";
  const modelMeta = getModelMetadata(modelToTest);
  if (!modelMeta || modelMeta.provider !== "gemini") {
    throw new Error(`FAIL: Model metadata provider for ${modelToTest} is not gemini!`);
  }

  const testKeyResult = await verifyApiKeyWithProvider("gemini", modelToTest, "top_secret_test_seller_key_gemini");
  if (!testKeyResult.valid) {
    throw new Error(`FAIL: verifyApiKeyWithProvider rejected test harness key: ${testKeyResult.error}`);
  }
  console.log("✔ [6/6] Model provider mapping and verification gate succeed 100%.");

  console.log("\n=======================================================================");
  console.log("  ALL 6 ENCLAVE & SELLER FLOW CHECKS PASSED WITH ZERO ERRORS!");
  console.log("=======================================================================");
}

runEndToEndVerification().catch((err) => {
  console.error("Verification script failed:", err);
  process.exit(1);
});
