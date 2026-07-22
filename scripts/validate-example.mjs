#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { findPdfPython } from "../src/pdf/python.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exampleSource = resolve(packageRoot, "examples/minimal-playwright");

function run(command, arguments_, cwd) {
  const result = spawnSync(command, arguments_, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "1",
      PNPM_CONFIG_AUTO_INSTALL_PEERS: "false",
    },
  });
  if (result.status !== 0) {
    throw new Error(
      [
        `Falha ao executar: ${command} ${arguments_.join(" ")}`,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  return result;
}

const validationRoot = mkdtempSync(join(tmpdir(), "prognum-example-"));
const exampleRoot = resolve(validationRoot, "example");

try {
  run(
    "pnpm",
    ["pack", "--pack-destination", validationRoot],
    packageRoot,
  );
  const tarballs = readdirSync(validationRoot).filter((name) =>
    name.endsWith(".tgz"),
  );
  if (tarballs.length !== 1) {
    throw new Error(`Era esperado um tarball, encontrados: ${tarballs.length}`);
  }

  cpSync(exampleSource, exampleRoot, { recursive: true });
  const packagePath = resolve(exampleRoot, "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  packageJson.devDependencies["@prognum/playwright-report"] =
    `file:${resolve(validationRoot, tarballs[0])}`;
  writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

  run("pnpm", ["install", "--ignore-scripts"], exampleRoot);
  run("pnpm", ["exec", "playwright", "install", "chromium"], exampleRoot);
  run("pnpm", ["test:report"], exampleRoot);

  const reportRoot = resolve(exampleRoot, "prognum-report");
  const reportPath = resolve(reportRoot, "report-data.json");
  if (
    !existsSync(resolve(reportRoot, "index.html")) ||
    !existsSync(reportPath)
  ) {
    throw new Error("O exemplo não gerou o relatório HTML esperado.");
  }

  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const exampleTest = report.tests?.[0];
  if (report.version !== 2 || report.summary?.passed !== 1 || !exampleTest) {
    throw new Error("O relatório do exemplo não preservou o contrato v2.");
  }
  if (!exampleTest.steps?.length || exampleTest.attachments?.length !== 2) {
    throw new Error("Steps ou attachments do exemplo não foram serializados.");
  }

  if (findPdfPython(process.env)) {
    run("pnpm", ["report:pdf"], exampleRoot);
    if (!existsSync(resolve(exampleRoot, "output/pdf/playwright-report.pdf"))) {
      throw new Error("O exemplo não gerou o PDF esperado.");
    }
  }

  console.log(`Exemplo validado com ${tarballs[0]}.`);
} finally {
  rmSync(validationRoot, { recursive: true, force: true });
}
