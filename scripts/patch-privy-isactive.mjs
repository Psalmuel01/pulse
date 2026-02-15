import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const privyEsmDir = join(root, "node_modules", "@privy-io", "react-auth", "dist", "esm");
const targetSnippet = 'isActive:l?"true":"false"';
const replacementSnippet = 'isactive:l?"true":"false"';

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

function patchPrivyIsActiveWarning() {
  if (!existsSync(privyEsmDir)) {
    return;
  }

  const files = walk(privyEsmDir);
  let patchedFiles = 0;

  for (const filePath of files) {
    const source = readFileSync(filePath, "utf8");
    if (!source.includes(targetSnippet)) {
      continue;
    }

    const next = source.replaceAll(targetSnippet, replacementSnippet);
    if (next !== source) {
      writeFileSync(filePath, next, "utf8");
      patchedFiles += 1;
    }
  }

  if (patchedFiles > 0) {
    console.log(`[postinstall] patched Privy isActive warning in ${patchedFiles} file(s).`);
  }
}

patchPrivyIsActiveWarning();
