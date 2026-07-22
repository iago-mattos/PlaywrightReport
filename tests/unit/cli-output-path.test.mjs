import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import { assertSafeOutputPath } from "../../src/cli/commands/build.mjs";

test("aceita somente diretórios de saída dentro do projeto", () => {
  const projectRoot = resolve("/tmp/prognum-project");

  assert.doesNotThrow(() =>
    assertSafeOutputPath(projectRoot, resolve(projectRoot, "prognum-report")),
  );
  assert.throws(
    () => assertSafeOutputPath(projectRoot, projectRoot),
    /Diretório de saída inseguro/u,
  );
  assert.throws(
    () => assertSafeOutputPath(projectRoot, resolve(projectRoot, "..", "report")),
    /Diretório de saída inseguro/u,
  );
});

