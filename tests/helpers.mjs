import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const cliPath = resolve(packageRoot, "bin/cli.mjs");

export function createTemporaryDirectory(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function removeTemporaryDirectory(path) {
  rmSync(path, { recursive: true, force: true });
}

export function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function runCli(arguments_, cwd, environment = {}) {
  return spawnSync(process.execPath, [cliPath, ...arguments_], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...environment },
  });
}

