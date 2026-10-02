// Test-only ESM loader: resolves `@/...` and extensionless relative imports
// against the real TypeScript sources so node --test exercises actual code
// (Node 24 strips types natively; only module *resolution* needs help).
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";

const SRC = path.resolve(process.cwd(), "src");

function probeAsFile(base) {
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.js`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile()) return pathToFileURL(c).href;
    } catch {
      // try next
    }
  }
  return null;
}

function hasExtension(spec) {
  const last = spec.split("/").pop();
  return last.includes(".");
}

export function resolve(specifier, context, nextResolve) {
  if (
    specifier.startsWith("node:") ||
    specifier.startsWith("data:") ||
    specifier.startsWith("file:")
  ) {
    return nextResolve(specifier);
  }
  if (specifier.startsWith("@/")) {
    const hit = probeAsFile(path.join(SRC, specifier.slice(2)));
    if (hit) return { url: hit, shortCircuit: true };
    return nextResolve(specifier);
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    if (!hasExtension(specifier) && context.parentURL?.startsWith("file:")) {
      const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
      const hit = probeAsFile(base);
      if (hit) return { url: hit, shortCircuit: true };
    }
    return nextResolve(specifier);
  }
  return nextResolve(specifier);
}
