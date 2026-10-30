import fs from "fs";
import path from "path";
import { ethers } from "ethers";

async function deployOrderbook() {
  const rpcUrl = process.env.HASHKEY_TESTNET_RPC || "https://testnet.hsk.xyz";
  const privateKey =
    process.env.HASHKEY_DEPLOYER_PRIVATE_KEY ||
    process.env.SHUNYA_TREASURY_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  console.log("Connecting to HashKey Chain Testnet:", rpcUrl);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Deployer Address:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Deployer Balance:", ethers.formatEther(balance), "HSK");

  const artifactPath = path.resolve(process.cwd(), "contracts", "artifacts", "ShunyaGridOrderbook.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  console.log("Deploying ShunyaGridOrderbook contract...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("🎉 ShunyaGridOrderbook DEPLOYED TO HASHKEY CHAIN TESTNET!");
  console.log("Contract Address:", address);
  console.log("Explorer URL:", `https://testnet-explorer.hskchain.net/address/${address}`);

  // Save to deployments file
  const deploymentsPath = path.resolve(process.cwd(), "contracts", "hashkey-testnet-deployments.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  deployments.contracts.ShunyaGridOrderbook = {
    address,
    explorerUrl: `https://testnet-explorer.hskchain.net/address/${address}`,
  };
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2), "utf8");
  console.log("Updated contracts/hashkey-testnet-deployments.json");

  return address;
}

deployOrderbook().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
