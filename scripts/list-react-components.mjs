#!/usr/bin/env node
// Ensure Babel (used by react-docgen) can run when project uses babel-preset-react-app
if (!process.env.NODE_ENV) process.env.NODE_ENV = "development";

/**
 * List all React components in the project by parsing .jsx/.tsx files with react-docgen.
 * Uses FindAllDefinitionsResolver so we get every component per file (not just the export).
 * Files with no component definitions (e.g. pure JS/TS) are skipped or listed with 0 components.
 *
 * Usage: node scripts/list-react-components.mjs [dir] [options]
 *   dir       Optional. Default: src. Scans dir recursively for *.jsx and *.tsx.
 *   --all     Include files with zero components.
 *   --json    Output JSON instead of table (one line per component, file path padded).
 */

import { readdir, readFile } from "fs/promises";
import { join, resolve, extname } from "path";
import { parse, builtinResolvers, ERROR_CODES } from "react-docgen";
import { createConfig } from "react-docgen/dist/config.js";

const EXTENSIONS = new Set([".jsx", ".tsx"]);
const ROOT = resolve(process.cwd());
const DEFAULT_DIR = "src";

async function* walk(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      yield* walk(full, base);
    } else if (e.isFile() && EXTENSIONS.has(extname(e.name))) {
      yield full;
    }
  }
}

function getComponentsInFile(absPath, code) {
  const config = createConfig({
    resolver: new builtinResolvers.FindAllDefinitionsResolver(),
    filename: absPath,
  });
  try {
    const docs = parse(code, config);
    return (docs || []).map((d) => d.displayName || "(anonymous)");
  } catch (err) {
    if (err?.code === ERROR_CODES.MISSING_DEFINITION) return [];
    throw err;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const showAll = args.includes("--all");
  const asJson = args.includes("--json");
  const dirArg = args.filter((a) => a !== "--all" && a !== "--json")[0];
  const dir = resolve(ROOT, dirArg || DEFAULT_DIR);

  const results = [];
  for await (const file of walk(dir)) {
    const code = await readFile(file, "utf-8");
    const components = getComponentsInFile(file, code);
    const relative = file.replace(ROOT, "").replace(/^[/\\]/, "");
    if (components.length > 0 || showAll) {
      results.push({ file: relative, components });
    }
  }

  results.sort((a, b) => a.file.localeCompare(b.file));

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Flatten to one row per component; sort by file then component
  const rows = [];
  for (const { file, components } of results) {
    for (const comp of components.sort()) {
      rows.push([file, comp]);
    }
  }
  const pathWidth = rows.length ? Math.max(40, ...rows.map(([f]) => f.length)) : 40;
  for (const [file, component] of rows) {
    // Python-style: f"{file:<pathWidth} {component}"
    console.log(`${file.padEnd(pathWidth)} ${component}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
