import fs from "fs";
import path from "path";
import { arkivDb } from "../packages/shunya-core/src/index";

async function clearOrderbook() {
  console.log("==================================================================");
  console.log("             Clearing ShunyaGrid Arkiv Orderbook                  ");
  console.log("==================================================================");

  // 1. Clear in-memory singleton
  arkivDb.clearOrderbook();
  console.log("  ✔ In-memory orderbook cleared.");

  // 2. Clear .data/arkiv_listings.json
  const listingsPath = path.join(process.cwd(), ".data", "arkiv_listings.json");
  if (fs.existsSync(listingsPath)) {
    fs.writeFileSync(listingsPath, JSON.stringify([], null, 2), "utf8");
    console.log("  ✔ .data/arkiv_listings.json reset to empty array [].");
  }

  // 3. Clear .data/arkiv-entities-mirror.json
  const mirrorPath = path.join(process.cwd(), ".data", "arkiv-entities-mirror.json");
  if (fs.existsSync(mirrorPath)) {
    fs.writeFileSync(mirrorPath, JSON.stringify({}, null, 2), "utf8");
    console.log("  ✔ .data/arkiv-entities-mirror.json reset to empty object {}.");
  }

  // 4. Notify live server if running
  try {
    const res = await fetch("http://127.0.0.1:3000/api/listings", {
      method: "DELETE",
    });
    if (res.ok) {
      console.log("  ✔ Live Next.js dev server orderbook state reset successfully via DELETE /api/listings.");
    }
  } catch {
    console.log("  ℹ Live server not running or not responding (disk state already cleared).");
  }

  console.log("==================================================================");
  console.log("            ARKIV ORDERBOOK IS NOW COMPLETELY CLEAN!              ");
  console.log("==================================================================");
  process.exit(0);
}

clearOrderbook().catch((err) => {
  console.error("Failed to clear orderbook:", err);
  process.exit(1);
});
