import fs from "fs";
import path from "path";
// @ts-ignore
import solc from "solc";

interface CompileResult {
  contractName: string;
  abi: any[];
  bytecode: string;
}

export function compileContracts(): Record<string, CompileResult> {
  const contractsDir = path.resolve(process.cwd(), "contracts");
  const artifactsDir = path.join(contractsDir, "artifacts");

  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const filesToCompile = [
    "VaultLending.sol",
    "SecureVault.sol",
    "ShunyaGridEscrow.sol",
  ];

  const sources: Record<string, { content: string }> = {};
  for (const file of filesToCompile) {
    const filePath = path.join(contractsDir, file);
    if (fs.existsSync(filePath)) {
      sources[file] = { content: fs.readFileSync(filePath, "utf8") };
    }
  }

  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  console.log("⚙ Compiling smart contracts with solc 0.8.20...");
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatalErrors = output.errors.filter((e: any) => e.severity === "error");
    if (fatalErrors.length > 0) {
      console.error("Compilation errors:", fatalErrors);
      throw new Error(`Solidity compilation failed: ${fatalErrors[0].formattedMessage}`);
    }
    const warnings = output.errors.filter((e: any) => e.severity === "warning");
    if (warnings.length > 0) {
      console.warn(`Generated ${warnings.length} compiler warning(s).`);
    }
  }

  const results: Record<string, CompileResult> = {};

  for (const [fileName, fileOutput] of Object.entries(output.contracts as Record<string, any>)) {
    for (const [contractName, contractData] of Object.entries(fileOutput as Record<string, any>)) {
      const artifact: CompileResult = {
        contractName,
        abi: contractData.abi,
        bytecode: contractData.evm.bytecode.object,
      };

      const artifactPath = path.join(artifactsDir, `${contractName}.json`);
      fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), "utf8");
      console.log(`✔ Artifact written: contracts/artifacts/${contractName}.json`);
      results[contractName] = artifact;
    }
  }

  return results;
}

if (require.main === module) {
  compileContracts();
}
