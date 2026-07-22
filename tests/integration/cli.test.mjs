import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
  runCli,
  writeJson,
} from "../helpers.mjs";

function createProject(rootDir) {
  writeJson(resolve(rootDir, "package.json"), {
    name: "cli-contract-consumer",
    version: "1.0.0",
    private: true,
    type: "module",
  });
  writeFileSync(
    resolve(rootDir, "playwright.config.mjs"),
    "export default {};\n",
    "utf8",
  );
}

function createReportData(rootDir, dataDir = ".playwright/prognum-report-data") {
  const absoluteDataDir = resolve(rootDir, dataDir);
  mkdirSync(resolve(absoluteDataDir, "assets"), { recursive: true });
  writeJson(resolve(absoluteDataDir, "report.json"), {
    version: 2,
    generatedAt: "2026-01-01T00:00:01.000Z",
    run: {
      status: "passed",
      startedAt: "2026-01-01T00:00:00.000Z",
      endedAt: "2026-01-01T00:00:01.000Z",
      duration: 1000,
      profile: "contract",
      node: process.version,
      platform: process.platform,
      total: 1,
    },
    summary: { passed: 1, failed: 0, skipped: 0, flaky: 0 },
    tests: [],
  });
  writeFileSync(resolve(absoluteDataDir, "assets/evidence.txt"), "evidence");
}

test("init é idempotente e preserva os scripts públicos", () => {
  const rootDir = createTemporaryDirectory("prognum-cli-init-");
  try {
    createProject(rootDir);

    const first = runCli(["init"], rootDir);
    const second = runCli(["init"], rootDir);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.match(first.stdout, /Relatório configurado com sucesso/u);

    const packageJson = JSON.parse(
      readFileSync(resolve(rootDir, "package.json"), "utf8"),
    );
    assert.deepEqual(packageJson.scripts, {
      "pw:test:report": "prognum-playwright-report test",
      "pw:report:build": "prognum-playwright-report build",
      "pw:report:pdf": "prognum-playwright-report pdf",
      "pw:report:open": "prognum-playwright-report open",
    });

    const gitignore = readFileSync(resolve(rootDir, ".gitignore"), "utf8");
    assert.equal(
      gitignore.match(/\.playwright\/prognum-report-data\//gu)?.length,
      1,
    );
    assert.equal(gitignore.match(/prognum-report\//gu)?.length, 1);
    assert.equal(gitignore.match(/output\/pdf\//gu)?.length, 1);
    assert.equal(existsSync(resolve(rootDir, "playwright.report.config.ts")), true);
    assert.equal(existsSync(resolve(rootDir, "prognum-report.config.mjs")), true);
  } finally {
    removeTemporaryDirectory(rootDir);
  }
});

test("build monta a interface, os dados, a configuração e as evidências", () => {
  const rootDir = createTemporaryDirectory("prognum-cli-build-");
  try {
    createProject(rootDir);
    createReportData(rootDir, "custom-data");
    writeFileSync(
      resolve(rootDir, "prognum-report.config.mjs"),
      [
        "export default {",
        "  productName: 'Produto de contrato',",
        "  reportTitle: 'Relatório de contrato',",
        "  dataDir: 'custom-data',",
        "  outputDir: 'custom-report',",
        "  domains: { tests: 'Testes' },",
        "};",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = runCli(["build"], rootDir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Relatório gerado:/u);
    assert.equal(existsSync(resolve(rootDir, "custom-report/index.html")), true);
    assert.equal(
      existsSync(resolve(rootDir, "custom-report/report-data.json")),
      true,
    );
    assert.equal(
      readFileSync(resolve(rootDir, "custom-report/evidence/evidence.txt"), "utf8"),
      "evidence",
    );
    const config = JSON.parse(
      readFileSync(resolve(rootDir, "custom-report/report-config.json"), "utf8"),
    );
    assert.equal(config.productName, "Produto de contrato");
    assert.equal(config.reportTitle, "Relatório de contrato");
    assert.deepEqual(config.domains, { tests: "Testes" });
  } finally {
    removeTemporaryDirectory(rootDir);
  }
});

test("test encaminha argumentos e preserva o exit code do Playwright", () => {
  const rootDir = createTemporaryDirectory("prognum-cli-test-");
  try {
    createProject(rootDir);
    const fakePackageDir = resolve(rootDir, "node_modules/@playwright/test");
    mkdirSync(fakePackageDir, { recursive: true });
    writeJson(resolve(fakePackageDir, "package.json"), {
      name: "@playwright/test",
      version: "1.50.0",
      type: "module",
      exports: { "./cli": "./cli.mjs" },
    });
    writeFileSync(
      resolve(fakePackageDir, "cli.mjs"),
      [
        "import { mkdirSync, writeFileSync } from 'node:fs';",
        "import { resolve } from 'node:path';",
        "const dataDir = process.env.PROGNUM_REPORT_DATA_DIR;",
        "mkdirSync(dataDir, { recursive: true });",
        "writeFileSync(resolve(dataDir, 'invocation.json'), JSON.stringify({ args: process.argv.slice(2), evidence: process.env.PW_EVIDENCE }));",
        "writeFileSync(resolve(dataDir, 'report.json'), JSON.stringify({ version: 2, generatedAt: new Date().toISOString(), run: { status: 'failed', total: 0, duration: 0, profile: 'fake', node: process.version, platform: process.platform }, summary: { passed: 0, failed: 0, skipped: 0, flaky: 0 }, tests: [] }));",
        "process.exitCode = Number(process.env.FAKE_PLAYWRIGHT_STATUS || 0);",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = runCli(
      ["test", "--", "--project=smoke", "--grep", "contrato"],
      rootDir,
      { FAKE_PLAYWRIGHT_STATUS: "7" },
    );
    assert.equal(result.status, 7, result.stderr);

    const invocation = JSON.parse(
      readFileSync(
        resolve(rootDir, ".playwright/prognum-report-data/invocation.json"),
        "utf8",
      ),
    );
    assert.deepEqual(invocation.args, [
      "test",
      "--config=playwright.report.config.ts",
      "--project=smoke",
      "--grep",
      "contrato",
    ]);
    assert.equal(invocation.evidence, "failure");
    assert.equal(existsSync(resolve(rootDir, "prognum-report/index.html")), true);
  } finally {
    removeTemporaryDirectory(rootDir);
  }
});

test("build falha com mensagem clara quando não há dados", () => {
  const rootDir = createTemporaryDirectory("prognum-cli-no-data-");
  try {
    createProject(rootDir);
    const result = runCli(["build"], rootDir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Dados do relatório não encontrados/u);
  } finally {
    removeTemporaryDirectory(rootDir);
  }
});

test("build recusa apagar a raiz do projeto configurada como outputDir", () => {
  const rootDir = createTemporaryDirectory("prognum-cli-safe-output-");
  try {
    createProject(rootDir);
    createReportData(rootDir, "data");
    writeFileSync(resolve(rootDir, "marker.txt"), "preservado", "utf8");
    writeFileSync(
      resolve(rootDir, "prognum-report.config.mjs"),
      "export default { dataDir: 'data', outputDir: '.' };\n",
      "utf8",
    );

    const result = runCli(["build"], rootDir);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Diretório de saída inseguro/u);
    assert.equal(readFileSync(resolve(rootDir, "marker.txt"), "utf8"), "preservado");
    assert.equal(existsSync(resolve(rootDir, "package.json")), true);
  } finally {
    removeTemporaryDirectory(rootDir);
  }
});
