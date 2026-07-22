#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

import { findPdfPython } from "../src/pdf/python.mjs";

const python = findPdfPython(process.env);
if (!python) {
  throw new Error(
    "A homologação requer Python com ReportLab e Pillow. " +
      "Configure PROGNUM_REPORT_PYTHON antes de executar pnpm verify.",
  );
}
if (python.arguments_.length) {
  throw new Error(
    "Configure PROGNUM_REPORT_PYTHON com o executável Python antes de executar pnpm verify.",
  );
}

const environment = {
  ...process.env,
  CI: "1",
  PROGNUM_REPORT_PYTHON:
    process.env.PROGNUM_REPORT_PYTHON ?? python.command,
};
const checks = [
  ["Contratos da CLI e runtime", "test"],
  ["Paridade da interface", "test:ui"],
  ["Geração de PDF", "test:pdf"],
  ["Projeto Playwright de exemplo", "test:example"],
  ["Tarball instalado", "test:pack"],
];

console.log(
  `Homologando com ${process.version} e Python ${environment.PROGNUM_REPORT_PYTHON}.`,
);
for (const [label, script] of checks) {
  console.log(`\n[verificação] ${label}`);
  const result = spawnSync("pnpm", [script], {
    encoding: "utf8",
    env: environment,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const whitespace = spawnSync("git", ["diff", "--check"], {
  encoding: "utf8",
  stdio: "inherit",
});
if (whitespace.error) throw whitespace.error;
if (whitespace.status !== 0) process.exit(whitespace.status ?? 1);

console.log("\nHomologação completa concluída com sucesso.");
