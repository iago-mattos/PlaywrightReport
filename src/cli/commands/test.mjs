import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import { buildReport } from "./build.mjs";

function resolvePlaywrightCli(cwd) {
  const projectRequire = createRequire(resolve(cwd, "package.json"));
  return projectRequire.resolve("@playwright/test/cli");
}

export function runTests(cwd, config, forwardedArguments) {
  const argumentsWithoutSeparator =
    forwardedArguments[0] === "--"
      ? forwardedArguments.slice(1)
      : forwardedArguments;
  const result = spawnSync(
    process.execPath,
    [
      resolvePlaywrightCli(cwd),
      "test",
      "--config=playwright.report.config.ts",
      ...argumentsWithoutSeparator,
    ],
    {
      cwd,
      env: {
        ...process.env,
        PW_EVIDENCE: config.evidence === "all" ? "all" : "failure",
        PROGNUM_REPORT_DATA_DIR: resolve(cwd, config.dataDir),
      },
      stdio: "inherit",
    },
  );

  if (result.error) throw result.error;
  try {
    buildReport(cwd, config);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    if (result.status === 0) return 1;
  }
  return result.status ?? 1;
}

