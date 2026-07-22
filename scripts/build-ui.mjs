#!/usr/bin/env node

import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build, mergeConfig } from "vite";

import baseConfig from "../ui/vite.config.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requestedOutput = process.argv[2] ?? "dist/ui";
const outputDirectory = resolve(packageRoot, requestedOutput);
const relativeOutput = relative(packageRoot, outputDirectory);

if (
  !relativeOutput ||
  relativeOutput === ".." ||
  relativeOutput.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
  isAbsolute(relativeOutput)
) {
  throw new Error("O diretório de saída da interface deve ficar dentro do pacote.");
}

mkdirSync(dirname(outputDirectory), { recursive: true });
await build(
  mergeConfig(baseConfig, {
    root: resolve(packageRoot, "ui"),
    build: {
      emptyOutDir: true,
      outDir: outputDirectory,
    },
  }),
);

console.log(`Interface gerada em ${outputDirectory}`);
