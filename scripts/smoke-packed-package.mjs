#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactsDir = resolve(packageRoot, ".artifacts");

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

async function reserveFreePort() {
  const probe = createServer();
  await new Promise((resolvePromise, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = probe.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolvePromise, reject) => {
    probe.close((error) => (error ? reject(error) : resolvePromise()));
  });
  return port;
}

async function smokeOpen(consumerRoot) {
  const port = await reserveFreePort();
  writeFileSync(
    resolve(consumerRoot, "prognum-report.config.mjs"),
    `export default { port: ${port} };\n`,
  );

  const cliPath = resolve(
    consumerRoot,
    "node_modules/@prognum/playwright-report/bin/cli.mjs",
  );
  const child = spawn(process.execPath, [cliPath, "open", "--no-open"], {
    cwd: consumerRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });

  try {
    const url = `http://127.0.0.1:${port}/report-data.json`;
    let response;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (child.exitCode !== null) {
        throw new Error(`Servidor encerrou antes do smoke test.\n${output}`);
      }
      try {
        response = await fetch(url);
        if (response.ok) break;
      } catch {
        // O servidor ainda está iniciando.
      }
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
    }
    if (!response?.ok) {
      throw new Error(`Servidor não respondeu ao smoke test.\n${output}`);
    }
    const report = await response.json();
    if (report.version !== 2) {
      throw new Error("Servidor retornou dados de relatório inesperados.");
    }
    const pdfPath = resolve(
      consumerRoot,
      "prognum-report/playwright-report.pdf",
    );
    if (existsSync(pdfPath)) {
      const pdfResponse = await fetch(
        `http://127.0.0.1:${port}/playwright-report.pdf`,
      );
      if (
        !pdfResponse.ok ||
        pdfResponse.headers.get("content-type") !== "application/pdf"
      ) {
        throw new Error("Servidor não entregou o PDF com o tipo correto.");
      }
      const signature = Buffer.from(await pdfResponse.arrayBuffer()).subarray(0, 4);
      if (signature.toString("ascii") !== "%PDF") {
        throw new Error("Servidor retornou um arquivo que não é PDF.");
      }
    }
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolvePromise) => {
      if (child.exitCode !== null) resolvePromise();
      else child.once("exit", resolvePromise);
    });
  }
}

rmSync(artifactsDir, { recursive: true, force: true });
mkdirSync(artifactsDir, { recursive: true });
run("pnpm", ["pack", "--pack-destination", artifactsDir], packageRoot);

const tarballs = readdirSync(artifactsDir).filter((name) => name.endsWith(".tgz"));
if (tarballs.length !== 1) {
  throw new Error(`Era esperado um tarball, encontrados: ${tarballs.length}`);
}

const tarballPath = resolve(artifactsDir, tarballs[0]);
const consumerRoot = mkdtempSync(join(tmpdir(), "prognum-report-smoke-"));

try {
  writeFileSync(
    resolve(consumerRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "prognum-report-smoke-consumer",
        version: "1.0.0",
        private: true,
        type: "module",
        packageManager: "pnpm@11.11.0",
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    resolve(consumerRoot, "playwright.config.mjs"),
    "export default {};\n",
  );

  run(
    "pnpm",
    [
      "add",
      "--save-dev",
      "--ignore-scripts",
      "--config.auto-install-peers=false",
      tarballPath,
    ],
    consumerRoot,
  );
  run("pnpm", ["exec", "prognum-playwright-report", "init"], consumerRoot);

  const initializedPackage = JSON.parse(
    readFileSync(resolve(consumerRoot, "package.json"), "utf8"),
  );
  for (const scriptName of [
    "pw:test:report",
    "pw:report:build",
    "pw:report:pdf",
    "pw:report:open",
  ]) {
    if (!initializedPackage.scripts?.[scriptName]) {
      throw new Error(`Script não criado pelo init: ${scriptName}`);
    }
  }

  const dataDir = resolve(
    consumerRoot,
    ".playwright/prognum-report-data",
  );
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(
    resolve(dataDir, "report.json"),
    `${JSON.stringify(
      {
        version: 2,
        generatedAt: "2026-01-01T00:00:01.000Z",
        run: {
          status: "passed",
          startedAt: "2026-01-01T00:00:00.000Z",
          endedAt: "2026-01-01T00:00:01.000Z",
          duration: 1000,
          profile: "smoke",
          node: process.version,
          platform: process.platform,
          total: 1,
        },
        summary: { passed: 1, failed: 0, skipped: 0, flaky: 0 },
        tests: [],
      },
      null,
      2,
    )}\n`,
  );

  run("pnpm", ["exec", "prognum-playwright-report", "build"], consumerRoot);

  for (const relativePath of [
    "prognum-report/index.html",
    "prognum-report/report-data.json",
    "prognum-report/report-config.json",
  ]) {
    if (!existsSync(resolve(consumerRoot, relativePath))) {
      throw new Error(`Arquivo não gerado no consumidor: ${relativePath}`);
    }
  }

  if (
    !existsSync(
      resolve(
        consumerRoot,
        "node_modules/@prognum/playwright-report/pdf/build_report.py",
      ),
    )
  ) {
    throw new Error("Renderer de PDF ausente no pacote instalado.");
  }

  if (process.env.PROGNUM_REPORT_PYTHON) {
    run(
      "pnpm",
      ["exec", "prognum-playwright-report", "pdf"],
      consumerRoot,
    );
    if (!existsSync(resolve(consumerRoot, "output/pdf/playwright-report.pdf"))) {
      throw new Error("PDF não gerado pelo pacote instalado.");
    }
  }

  await smokeOpen(consumerRoot);

  console.log(`Smoke test concluído com ${tarballs[0]}.`);
} finally {
  rmSync(consumerRoot, { recursive: true, force: true });
}
