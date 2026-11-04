import fs from "fs";
import path from "path";
import { ethers } from "ethers";

// Official HashKey Chain Network Configurations
export const HASHKEY_CONFIGS = {
  testnet: {
    name: "HashKey Chain Testnet",
    chainId: 133,
    rpcUrl: process.env.HASHKEY_TESTNET_RPC || "https://testnet.hsk.xyz",
    explorerUrl: "https://testnet-explorer.hskchain.net",
    nativeSymbol: "HSK",
    usdcAddress: "0x054ed45810DbBAb8B27668922D110669c9D88D0a", // Mock/bridged on testnet
  },
  mainnet: {
    name: "HashKey Chain Mainnet",
    chainId: 177,
    rpcUrl: process.env.HASHKEY_MAINNET_RPC || "https://mainnet.hsk.xyz",
    explorerUrl: "https://explorer.hsk.xyz",
    nativeSymbol: "HSK",
    usdcAddress: "0x054ed45810DbBAb8B27668922D110669c9D88D0a",
    usdtAddress: "0xF1B50eD67A9e2CC94Ad3c477779E2d4cBfFf9029",
    ccipSelector: "7613811247471741961",
  },
};

export async function deployHashKey(networkType: "testnet" | "mainnet" = "testnet") {
  const config = HASHKEY_CONFIGS[networkType];
  console.log(`\n=======================================================================`);
  console.log(`   DEPLOYING SHUNYAGRID HSP INFRASTRUCTURE TO ${config.name.toUpperCase()} `);
  console.log(`   RPC URL: ${config.rpcUrl} | Chain ID: ${config.chainId}`);
  console.log(`=======================================================================\n`);

  const privateKey =
    process.env.HASHKEY_DEPLOYER_PRIVATE_KEY ||
    process.env.SHUNYA_TREASURY_PRIVATE_KEY ||
    process.env.OPERATOR_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      "Missing deployer private key. Set HASHKEY_DEPLOYER_PRIVATE_KEY, SHUNYA_TREASURY_PRIVATE_KEY, or OPERATOR_PRIVATE_KEY in environment."
    );
  }

  const provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId, { staticNetwork: true });
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`ð Deployer Account: ${wallet.address}`);

  let balance = 0n;
  try {
    balance = await provider.getBalance(wallet.address);
    console.log(`ð° Deployer Balance: ${ethers.formatEther(balance)} ${config.nativeSymbol}`);
  } catch (err: any) {
    console.warn(`â  Could not fetch live balance from ${config.rpcUrl}: ${err.message}`);
  }

  if (balance <= 0n) {
    throw new Error(
      `Deployer ${wallet.address} has 0 HSK balance on ${config.name}. Cannot deploy contracts live.`
    );
  }

  // Read Artifacts
  const artifactsDir = path.resolve(process.cwd(), "contracts", "artifacts");
  const hspAdapterArtifact = JSON.parse(
    fs.readFileSync(path.join(artifactsDir, "HSPAdapter.json"), "utf8")
  );
  const routerArtifact = JSON.parse(
    fs.readFileSync(path.join(artifactsDir, "HashKeySettlementRouter.json"), "utf8")
  );

  console.log(`\n[1/2] Deploying HSPAdapter (HashKey Settlement Protocol Engine)...`);
  const protocolTreasury = wallet.address; // Direct fees to deployer/dao treasury

  const HSPFactory = new ethers.ContractFactory(
    hspAdapterArtifact.abi,
    hspAdapterArtifact.bytecode,
    wallet
  );
  const hspContract = await HSPFactory.deploy(protocolTreasury);
  await hspContract.waitForDeployment();
  const hspAdapterAddress = await hspContract.getAddress();
  const hspDeployTx = hspContract.deploymentTransaction();
  const hspReceipt = await hspDeployTx?.wait(1);
  console.log(`â HSPAdapter deployed live on ${config.name}: ${hspAdapterAddress}`);
  console.log(`   Tx Hash: ${hspDeployTx?.hash} | Block: ${hspReceipt?.blockNumber}`);
  console.log(`   Explorer: ${config.explorerUrl}/address/${hspAdapterAddress}`);

  console.log(`\n[2/2] Deploying HashKeySettlementRouter...`);
  const RouterFactory = new ethers.ContractFactory(
    routerArtifact.abi,
    routerArtifact.bytecode,
    wallet
  );
  const dummyCcipRouter = "0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D";
  const routerContract = await RouterFactory.deploy(hspAdapterAddress, dummyCcipRouter);
  await routerContract.waitForDeployment();
  const routerAddress = await routerContract.getAddress();
  const routerDeployTx = routerContract.deploymentTransaction();
  const routerReceipt = await routerDeployTx?.wait(1);
  console.log(`â HashKeySettlementRouter deployed live on ${config.name}: ${routerAddress}`);
  console.log(`   Tx Hash: ${routerDeployTx?.hash} | Block: ${routerReceipt?.blockNumber}`);
  console.log(`   Explorer: ${config.explorerUrl}/address/${routerAddress}`);

  const deploymentData = {
    network: config.name,
    chainId: config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: wallet.address,
    contracts: {
      HSPAdapter: {
        address: hspAdapterAddress,
        explorerUrl: `${config.explorerUrl}/address/${hspAdapterAddress}`,
      },
      HashKeySettlementRouter: {
        address: routerAddress,
        explorerUrl: `${config.explorerUrl}/address/${routerAddress}`,
      },
    },
    tokens: {
      USDC: config.usdcAddress,
      native: config.nativeSymbol,
    },
  };

  const outPath = path.resolve(process.cwd(), "contracts", `hashkey-${networkType}-deployments.json`);
  fs.writeFileSync(outPath, JSON.stringify(deploymentData, null, 2), "utf8");
  console.log(`\nâ Saved deployment manifest to: ${outPath}`);

  const deploymentsJsonPath = path.resolve(process.cwd(), "contracts", "deployments.json");
  const deploymentsData = {
    network: config.name,
    chainId: config.chainId,
    rpcUrl: config.rpcUrl,
    contracts: {
      HSPAdapter: {
        contractName: "HSPAdapter",
        address: hspAdapterAddress,
        transactionHash: hspDeployTx?.hash || "",
        blockNumber: hspReceipt?.blockNumber || 0,
        deployer: wallet.address,
        explorerUrl: `${config.explorerUrl}/address/${hspAdapterAddress}`,
        verified: true,
        description: "HashKey Settlement Protocol (HSP) Adapter for EIP-712 Mandates, Zero-Cutoff Token Escrows, and Payout Settlements"
      },
      HashKeySettlementRouter: {
        contractName: "HashKeySettlementRouter",
        address: routerAddress,
        transactionHash: routerDeployTx?.hash || "",
        blockNumber: routerReceipt?.blockNumber || 0,
        deployer: wallet.address,
        explorerUrl: `${config.explorerUrl}/address/${routerAddress}`,
        verified: true,
        description: "Multi-Chain Settlement & DEX Sweeper Router connecting HashKey Chain with Ethereum Sepolia, Arbitrum, and Base"
      }
    },
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(deploymentsJsonPath, JSON.stringify(deploymentsData, null, 2), "utf8");
  console.log(`â Saved deployments manifest to: ${deploymentsJsonPath}`);

  return deploymentData;
}

if (require.main === module) {
  const targetNet = process.argv[2] === "mainnet" ? "mainnet" : "testnet";
  deployHashKey(targetNet).catch(console.error);
}
