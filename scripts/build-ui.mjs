#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const goldenFiles = new Map([
  ["dist/ui/index.html", "57a2e05d0ba0dcf181236b920004db5fafbcb8dedbc50044dec87abd23c6d17a"],
  [
    "dist/ui/assets/index-D_rET1xm.js",
    "7c9bf6f5e49926795899f72cd6dfaec605408df79dff6b97a9083e9ab3814747",
  ],
  [
    "dist/ui/assets/index-C1b-M-e0.css",
    "5686c009ae22ea6b0b832a96b6f3e8c96f70ccb47de3e3809ee86910ed52bfe2",
  ],
]);

for (const [relativePath, expectedHash] of goldenFiles) {
  const absolutePath = resolve(packageRoot, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Golden master ausente: ${relativePath}`);
  }

  const actualHash = createHash("sha256")
    .update(readFileSync(absolutePath))
    .digest("hex");
  if (actualHash !== expectedHash) {
    throw new Error(
      `Golden master alterado sem reconstrução aprovada: ${relativePath}`,
    );
  }
}

console.log("Golden master da interface validado; nenhum arquivo foi refeito.");

