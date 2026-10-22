import fs from "fs";
import path from "path";

export function copyAnonRpcAssets() {
  const sourceBase = path.join(
    process.cwd(),
    "node_modules",
    "@anon-rpc",
    "browser-extension-harness",
    "dist",
    "static",
    "anon-rpc"
  );

  const targetDir = path.join(process.cwd(), "public", "anon-rpc");

  if (!fs.existsSync(sourceBase)) {
    console.warn("[Anon-RPC] Source directory not found:", sourceBase);
    return;
  }

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const entries = fs.readdirSync(sourceBase);
  for (const entry of entries) {
    const entryPath = path.join(sourceBase, entry);
    const stat = fs.statSync(entryPath);
    if (stat.isDirectory()) {
      // Subdirectory like 0.3.3-55cc6be0
      const subTargetDir = path.join(targetDir, entry);
      if (!fs.existsSync(subTargetDir)) {
        fs.mkdirSync(subTargetDir, { recursive: true });
      }
      const files = fs.readdirSync(entryPath);
      for (const file of files) {
        const srcFile = path.join(entryPath, file);
        // Copy to both the versioned subdirectory and directly to public/anon-rpc/
        fs.copyFileSync(srcFile, path.join(subTargetDir, file));
        fs.copyFileSync(srcFile, path.join(targetDir, file));
      }
      console.log(`[Anon-RPC] Copied ${files.length} static assets from version ${entry}`);
    } else {
      fs.copyFileSync(entryPath, path.join(targetDir, entry));
    }
  }
  console.log(`[Anon-RPC] Assets successfully synchronized to public/anon-rpc`);
}

if (require.main === module) {
  copyAnonRpcAssets();
}
