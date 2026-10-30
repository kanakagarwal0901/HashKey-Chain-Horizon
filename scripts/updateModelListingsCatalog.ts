import fs from "fs";
import path from "path";
import { ArkivSellerListingEntity } from "../packages/shunya-core/src/arkivQuotaManager";
import { SUPPORTED_MODELS, getModelTokenBounds } from "../packages/shunya-core/src/tokenBoundsCatalog";

const dataFilePath = path.join(process.cwd(), ".data", "arkiv_listings.json");

// Define seed node wallets
const SELLER_WALLETS = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x873873c173E4aD264c93Ab7F41366fcD3b9303b7",
  "0xE17fe685764Bc9Bf749B7a72a9fC1452a7235d21",
];

const newModelListings: ArkivSellerListingEntity[] = SUPPORTED_MODELS.map((model, idx) => {
  const bounds = getModelTokenBounds(model.id, model.supportsThinking ? "medium" : "none");
  const wallet = SELLER_WALLETS[idx % SELLER_WALLETS.length];
  const cleanId = model.id.replace(/[^a-z0-9]/gi, "_");

  return {
    id: `arkiv_entity_${cleanId}`,
    ownerAddress: wallet,
    ensName: `node-${cleanId.slice(0, 10)}.shunyagrid.eth`,
    model: model.id,
    provider: model.provider,
    availableTokens: 500_000,
    lockedTokens: 0,
    pricePer1kMicroUsdc: bounds.defaultPricePer1kMicroUsdc || 10_000,
    humanVerified: true,
    worldIdNullifier: `0xnullifier_worldid_${cleanId}_${idx + 1}`,
    sealedApiKey: `ENCLAVE_SEALED:mumbai-live-demo-${model.provider}-token`,
    payoutAddress: wallet,
    hedaraPayoutAccount: wallet,
    createdAtBlock: 35100370,
    expiresAtBlock: 0, // 0 = permanent active state on HashKey orderbook
    status: "active",
  };
});

// Preserve any user-created listings (those with custom IDs not matching default pattern)
let existingListings: ArkivSellerListingEntity[] = [];
if (fs.existsSync(dataFilePath)) {
  try {
    const raw = fs.readFileSync(dataFilePath, "utf8");
    existingListings = JSON.parse(raw);
  } catch {}
}

const customListings = existingListings.filter(
  (l) =>
    !l.id.startsWith("arkiv_entity_") ||
    !SUPPORTED_MODELS.some((m) => l.id === `arkiv_entity_${m.id.replace(/[^a-z0-9]/gi, "_")}`)
);

const combined = [...newModelListings, ...customListings];

// Ensure directory exists and write
const dir = path.dirname(dataFilePath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(dataFilePath, JSON.stringify(combined, null, 2), "utf8");
console.log(`[updateModelListingsCatalog] Successfully generated ${combined.length} active listings across all ${SUPPORTED_MODELS.length} frontier models!`);
