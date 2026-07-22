import { existsSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import process from "node:process";

import { runPdfRenderer } from "../../pdf/python.mjs";
import { packageRoot } from "../paths.mjs";
import { assertSafeOutputPath } from "./build.mjs";

export function assertSafePdfPath(cwd, outputPath) {
  const projectRoot = resolve(cwd);
  const relativePath = relative(projectRoot, outputPath);
  const outsideProject =
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath);

  if (!relativePath || outsideProject) {
    throw new Error(
      "Caminho de PDF inseguro: pdf.outputPath deve ficar dentro do projeto.",
    );
  }
  if (!outputPath.toLowerCase().endsWith(".pdf")) {
    throw new Error("pdf.outputPath deve terminar com a extensão .pdf.");
  }
}

export function buildPdfReport(cwd, config, environment = process.env) {
  const reportDir = resolve(cwd, config.outputDir);
  const dataPath = resolve(reportDir, "report-data.json");
  const indexPath = resolve(reportDir, "index.html");
  const outputPath = resolve(cwd, config.pdf.outputPath);

  assertSafeOutputPath(cwd, reportDir);
  assertSafePdfPath(cwd, outputPath);
  if (!existsSync(dataPath) || !existsSync(indexPath)) {
    throw new Error(
      "Relatório HTML não encontrado. Execute prognum-playwright-report build primeiro.",
    );
  }

  runPdfRenderer({
    rendererPath: resolve(packageRoot, "pdf/build_report.py"),
    payload: {
      reportDir,
      dataPath,
      outputPath,
      config: {
        productName: config.productName,
        reportTitle: config.reportTitle,
      },
      pdf: config.pdf,
      includeInReport: config.pdf.includeInReport,
      downloadLabel: config.pdf.downloadLabel,
    },
    cwd,
    environment,
  });
}
