import process from "node:process";

import { loadConfig } from "./config.mjs";
import { buildReport } from "./commands/build.mjs";
import { initialize } from "./commands/init.mjs";
import { openReport } from "./commands/open.mjs";
import { runTests } from "./commands/test.mjs";

function printHelp() {
  console.log(`
Prognum Playwright Report

Comandos:
  init             configura o projeto atual
  test [args]      executa Playwright e constrói o relatório
  build            constrói o relatório a partir da última execução
  open             abre o relatório em um servidor local

Exemplos:
  prognum-playwright-report init
  prognum-playwright-report test -- --project=smoke
  prognum-playwright-report open
`);
}

export async function runCli({
  cwd = process.cwd(),
  arguments_ = process.argv.slice(2),
} = {}) {
  const [command = "help", ...argumentsAfterCommand] = arguments_;

  try {
    if (command === "init") {
      initialize(cwd);
    } else if (command === "build") {
      buildReport(cwd, await loadConfig(cwd));
    } else if (command === "test") {
      process.exitCode = runTests(
        cwd,
        await loadConfig(cwd),
        argumentsAfterCommand,
      );
    } else if (command === "open") {
      openReport(
        cwd,
        await loadConfig(cwd),
        !argumentsAfterCommand.includes("--no-open"),
      );
    } else {
      printHelp();
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

