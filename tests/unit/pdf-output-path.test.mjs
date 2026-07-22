import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import { assertSafePdfPath } from "../../src/cli/commands/pdf.mjs";

test("aceita somente PDFs localizados dentro do projeto", () => {
  const projectRoot = resolve("/tmp/prognum-project");

  assert.doesNotThrow(() =>
    assertSafePdfPath(
      projectRoot,
      resolve(projectRoot, "output/pdf/playwright-report.pdf"),
    ),
  );
  assert.throws(
    () => assertSafePdfPath(projectRoot, projectRoot),
    /Caminho de PDF inseguro/u,
  );
  assert.throws(
    () =>
      assertSafePdfPath(
        projectRoot,
        resolve(projectRoot, "..", "playwright-report.pdf"),
      ),
    /Caminho de PDF inseguro/u,
  );
  assert.throws(
    () => assertSafePdfPath(projectRoot, resolve(projectRoot, "output/report.txt")),
    /deve terminar com a extensão \.pdf/u,
  );
});
