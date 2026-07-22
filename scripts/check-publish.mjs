#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  readFileSync(resolve(packageRoot, "package.json"), "utf8"),
);
const repositoryUrl =
  typeof packageJson.repository === "string"
    ? packageJson.repository
    : packageJson.repository?.url;

if (process.env.PROGNUM_ALLOW_PUBLISH !== "1") {
  throw new Error(
    "Publicação bloqueada. Defina PROGNUM_ALLOW_PUBLISH=1 somente após autorização explícita.",
  );
}
if (
  !repositoryUrl ||
  /NOME-DO-REPOSITORIO|OWNER|REPOSITORY/iu.test(repositoryUrl)
) {
  throw new Error(
    "Publicação bloqueada. Configure package.json.repository com o remoto GitHub autorizado.",
  );
}
if (
  packageJson.publishConfig?.registry !== "https://npm.pkg.github.com" ||
  packageJson.publishConfig?.access !== "restricted"
) {
  throw new Error(
    "Publicação bloqueada. publishConfig deve usar GitHub Packages com acesso restricted.",
  );
}

console.log(
  `Publicação autorizada para ${packageJson.name}@${packageJson.version}.`,
);
