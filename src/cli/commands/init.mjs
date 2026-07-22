import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";

import { defaultConfig } from "../defaults.mjs";

function findPlaywrightConfig(cwd) {
  const candidates = [
    "playwright.config.ts",
    "playwright.config.mts",
    "playwright.config.js",
    "playwright.config.mjs",
    "playwright.config.cts",
    "playwright.config.cjs",
  ];
  return candidates.find((candidate) => existsSync(resolve(cwd, candidate)));
}

function updatePackageScripts(cwd) {
  const packagePath = resolve(cwd, "package.json");
  if (!existsSync(packagePath)) {
    throw new Error("package.json não encontrado no diretório atual.");
  }

  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  packageJson.scripts = {
    ...(packageJson.scripts ?? {}),
    "pw:test:report": "prognum-playwright-report test",
    "pw:report:build": "prognum-playwright-report build",
    "pw:report:open": "prognum-playwright-report open",
  };
  writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

function updateGitignore(cwd) {
  const gitignorePath = resolve(cwd, ".gitignore");
  const current = existsSync(gitignorePath)
    ? readFileSync(gitignorePath, "utf8")
    : "";
  const entries = [".playwright/prognum-report-data/", "prognum-report/"];
  const missing = entries.filter(
    (entry) => !current.split(/\r?\n/u).includes(entry),
  );
  if (!missing.length) return;

  const prefix = current.length && !current.endsWith("\n") ? "\n" : "";
  appendFileSync(
    gitignorePath,
    `${prefix}\n# Relatório Playwright Prognum\n${missing.join("\n")}\n`,
    "utf8",
  );
}

export function initialize(cwd) {
  const playwrightConfig = findPlaywrightConfig(cwd);
  if (!playwrightConfig) {
    throw new Error("Nenhum playwright.config.* foi encontrado.");
  }

  const reportConfigPath = resolve(cwd, "playwright.report.config.ts");
  if (!existsSync(reportConfigPath)) {
    const importPath = `./${playwrightConfig.replace(/\.(?:[cm]?[jt]s)$/u, "")}`;
    writeFileSync(
      reportConfigPath,
      [
        `import baseConfig from ${JSON.stringify(importPath)};`,
        'import { withPrognumReport } from "@prognum/playwright-report/config";',
        "",
        "export default withPrognumReport(baseConfig);",
        "",
      ].join("\n"),
      "utf8",
    );
  }

  const appearancePath = resolve(cwd, "prognum-report.config.mjs");
  if (!existsSync(appearancePath)) {
    writeFileSync(
      appearancePath,
      `export default ${JSON.stringify(defaultConfig, null, 2)};\n`,
      "utf8",
    );
  }

  updatePackageScripts(cwd);
  updateGitignore(cwd);

  console.log("Relatório configurado com sucesso.");
  console.log(`  Config Playwright: ${relative(cwd, reportConfigPath)}`);
  console.log(`  Identidade visual: ${relative(cwd, appearancePath)}`);
  console.log("  Executar: npm run pw:test:report");
}

