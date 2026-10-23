import os from "os";

function getLanIps(): { interfaceName: string; ip: string }[] {
  const interfaces = os.networkInterfaces();
  const results: { interfaceName: string; ip: string }[] = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        results.push({ interfaceName: name, ip: addr.address });
      }
    }
  }

  return results;
}

const lanIps = getLanIps();
console.log("\n=======================================================");
console.log("  ShunyaGrid Local Network Access Information");
console.log("=======================================================\n");

if (lanIps.length === 0) {
  console.log("  No external network interface detected. Running on localhost only.");
} else {
  console.log("  Anyone on your local network (Wi-Fi/LAN) can access ShunyaGrid at:\n");
  for (const item of lanIps) {
    console.log(`  🌐 Interface: ${item.interfaceName}`);
    console.log(`     Frontend Landing:   http://${item.ip}:3000`);
    console.log(`     Buyer Studio:       http://${item.ip}:3000/buyer`);
    console.log(`     Seller Dashboard:   http://${item.ip}:3000/seller`);
    console.log(`     Audit Explorer:     http://${item.ip}:3000/audit`);
    console.log(`     Marketplace:        http://${item.ip}:3000/marketplace`);
    console.log(`     Arc Discovery API:  http://${item.ip}:3000/api/arc-discovery\n`);
  }
}
console.log("=======================================================\n");
