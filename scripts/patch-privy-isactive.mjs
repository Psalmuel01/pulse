import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const privyEsmDir = join(root, "node_modules", "@privy-io", "react-auth", "dist", "esm");
const patches = [
  {
    name: "isActive DOM prop warning",
    target: 'isActive:l?"true":"false"',
    replacement: 'isactive:l?"true":"false"'
  },
  {
    name: "missing key warning in CustomLandingScreenView",
    target:
      '/*#__PURE__*/return e(O,{recent:!0,index:i,data:{wallets:X,walletChainType:l,handleWalletClick(e){c((t=>({...t,externalConnectWallet:{walletList:f,walletChainType:l,preSelectedWalletId:e.id}}))),h(a?"ConnectOnlyLandingScreen":"AuthenticateWithWalletScreen")}}})',
    replacement:
      '/*#__PURE__*/return e(O,{recent:!0,index:i,data:{wallets:X,walletChainType:l,handleWalletClick(e){c((t=>({...t,externalConnectWallet:{walletList:f,walletChainType:l,preSelectedWalletId:e.id}}))),h(a?"ConnectOnlyLandingScreen":"AuthenticateWithWalletScreen")}}},j.normalize(t))'
  }
];

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (stats.isFile() && fullPath.endsWith(".mjs")) {
      files.push(fullPath);
    }
  }

  return files;
}

function patchPrivyWarnings() {
  if (!existsSync(privyEsmDir)) {
    return;
  }

  const files = walk(privyEsmDir);
  let totalReplacements = 0;
  const changedWarnings = new Set();

  for (const filePath of files) {
    let source = readFileSync(filePath, "utf8");
    let next = source;

    for (const patch of patches) {
      if (!next.includes(patch.target)) {
        continue;
      }

      const updated = next.replaceAll(patch.target, patch.replacement);
      if (updated !== next) {
        const replacements = (next.match(new RegExp(escapeRegExp(patch.target), "g")) ?? []).length;
        totalReplacements += replacements;
        changedWarnings.add(patch.name);
      }

      next = updated;
    }

    if (next !== source) {
      writeFileSync(filePath, next, "utf8");
    }
  }

  if (totalReplacements > 0) {
    console.log(
      `[postinstall] patched Privy warnings (${[...changedWarnings].join(", ")}) with ${totalReplacements} replacement(s).`
    );
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

patchPrivyWarnings();
