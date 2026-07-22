import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { PNG } from "pngjs";

import { findPdfPython } from "../../src/pdf/python.mjs";
import {
  createTemporaryDirectory,
  packageRoot,
  removeTemporaryDirectory,
  runCli,
} from "../helpers.mjs";

function createScreenshot(path) {
  const png = new PNG({ width: 800, height: 1400 });
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const offset = (y * png.width + x) * 4;
      const panel = y > 160 && y < 1240 && x > 70 && x < 730;
      png.data[offset] = panel ? 241 : 11;
      png.data[offset + 1] = panel ? 245 : 47;
      png.data[offset + 2] = panel ? 249 : 91;
      png.data[offset + 3] = 255;
    }
  }
  writeFileSync(path, PNG.sync.write(png));
}

test("gera PDF executivo reutilizável e o anexa ao relatório HTML", (context) => {
  const python = findPdfPython(process.env);
  if (!python) {
    context.skip("ReportLab e Pillow não estão disponíveis no Python configurado.");
    return;
  }

  const rootDir = createTemporaryDirectory("prognum-pdf-");
  try {
    const reportDir = resolve(rootDir, "custom-report");
    cpSync(resolve(packageRoot, "dist/ui"), reportDir, { recursive: true });
    cpSync(resolve(packageRoot, "tests/fixtures/report-v2"), reportDir, {
      recursive: true,
    });

    const reportDataPath = resolve(reportDir, "report-data.json");
    const reportData = JSON.parse(readFileSync(reportDataPath, "utf8"));
    reportData.tests[0].attachments[0] = {
      ...reportData.tests[0].attachments[0],
      contentType: "image/png",
      path: "evidence/screenshot.png",
    };
    writeFileSync(reportDataPath, `${JSON.stringify(reportData, null, 2)}\n`);
    createScreenshot(resolve(reportDir, "evidence/screenshot.png"));

    writeFileSync(
      resolve(rootDir, "prognum-report.config.mjs"),
      [
        "export default {",
        "  productName: 'Produto reutilizável',",
        "  reportTitle: 'Relatório de contrato PDF',",
        "  outputDir: 'custom-report',",
        "  pdf: {",
        "    outputPath: 'output/pdf/contrato-playwright.pdf',",
        "    includeInReport: true,",
        "    downloadLabel: 'Baixar relatório executivo',",
        "    author: 'Equipe de qualidade',",
        "    footerText: 'Contrato de geração reutilizável',",
        "    metadataFields: { flow: 'Fluxo reutilizável' },",
        "  },",
        "};",
        "",
      ].join("\n"),
    );

    const result = runCli(["pdf"], rootDir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Relatório PDF gerado:/u);
    const repeatedResult = runCli(["pdf"], rootDir);
    assert.equal(repeatedResult.status, 0, repeatedResult.stderr);

    const outputPath = resolve(rootDir, "output/pdf/contrato-playwright.pdf");
    const webPath = resolve(reportDir, "contrato-playwright.pdf");
    assert.equal(existsSync(outputPath), true);
    assert.equal(existsSync(webPath), true);
    assert.ok(statSync(outputPath).size > 10_000);

    const index = readFileSync(resolve(reportDir, "index.html"), "utf8");
    assert.equal(index.match(/id="prognum-pdf-download"/gu)?.length, 1);
    assert.match(index, /Baixar relatório executivo/u);
    assert.match(index, /\.\/contrato-playwright\.pdf/u);

    const pypdfCheck = spawnSync(
      python.command,
      [...python.arguments_, "-c", "import pypdf"],
      { encoding: "utf8", env: process.env },
    );
    if (pypdfCheck.status !== 0) return;

    const extraction = spawnSync(
      python.command,
      [
        ...python.arguments_,
        "-c",
        [
          "from pypdf import PdfReader",
          "import sys",
          "reader = PdfReader(sys.argv[1])",
          "print(len(reader.pages))",
          "print('\\n'.join((page.extract_text() or '') for page in reader.pages))",
        ].join(";"),
        outputPath,
      ],
      { encoding: "utf8", env: process.env },
    );
    assert.equal(extraction.status, 0, extraction.stderr);
    assert.ok(Number(extraction.stdout.split("\n", 1)[0]) >= 4);
    assert.match(extraction.stdout, /Relatório de contrato PDF/u);
    assert.match(extraction.stdout, /Contrato de geração reutilizável/u);
    assert.match(extraction.stdout, /Fluxo reutilizável/u);
    assert.match(extraction.stdout, /fixture/u);
    assert.doesNotMatch(extraction.stdout, /CDHU|SCCI|AEJS/u);
  } finally {
    removeTemporaryDirectory(rootDir);
  }
});
