import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

import { packageRoot } from "../paths.mjs";

export function assertSafeOutputPath(cwd, outputRoot) {
  const projectRoot = resolve(cwd);
  const outputRelative = relative(projectRoot, outputRoot);
  const outsideProject =
    outputRelative === ".." ||
    outputRelative.startsWith(`..${sep}`) ||
    isAbsolute(outputRelative);

  if (!outputRelative || outputRelative === "." || outsideProject) {
    throw new Error(
      "Diretório de saída inseguro: outputDir deve ser uma subpasta do projeto.",
    );
  }
}

export function buildReport(cwd, config) {
  const sourceRoot = resolve(cwd, config.dataDir);
  const sourceReport = resolve(sourceRoot, "report.json");
  const sourceAssets = resolve(sourceRoot, "assets");
  const uiRoot = resolve(packageRoot, "dist/ui");
  const outputRoot = resolve(cwd, config.outputDir);
  const outputEvidence = resolve(outputRoot, "evidence");

  if (!existsSync(sourceReport)) {
    throw new Error(
      "Dados do relatório não encontrados. Execute npm run pw:test:report primeiro.",
    );
  }
  if (!existsSync(resolve(uiRoot, "index.html"))) {
    throw new Error("A interface compilada não foi encontrada no pacote.");
  }
  assertSafeOutputPath(cwd, outputRoot);

  rmSync(outputRoot, { recursive: true, force: true });
  cpSync(uiRoot, outputRoot, { recursive: true });
  cpSync(sourceReport, resolve(outputRoot, "report-data.json"));
  rmSync(outputEvidence, { recursive: true, force: true });
  if (existsSync(sourceAssets)) {
    cpSync(sourceAssets, outputEvidence, { recursive: true });
  } else {
    mkdirSync(outputEvidence, { recursive: true });
  }
  writeFileSync(
    resolve(outputRoot, "report-config.json"),
    `${JSON.stringify(
      {
        productName: config.productName,
        reportTitle: config.reportTitle,
        accentColor: config.accentColor,
        domains: config.domains,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Relatório gerado: ${resolve(outputRoot, "index.html")}`);
}

