import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { packageRoot } from "../helpers.mjs";

const checksums = new Map(
  readFileSync(resolve(packageRoot, "reference/SHA256SUMS"), "utf8")
    .trim()
    .split("\n")
    .map((line) => {
      const [hash, path] = line.trim().split(/\s+/u);
      return [path, hash];
    }),
);

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

test("preserva o tarball de referência e o golden master da interface", () => {
  const files = new Map([
    [
      "prognum-playwright-report-0.1.0.tgz",
      "reference/prognum-playwright-report-0.1.0.tgz",
    ],
    ["package/dist/ui/index.html", "tests/fixtures/golden-ui/index.html"],
    [
      "package/dist/ui/assets/index-D_rET1xm.js",
      "tests/fixtures/golden-ui/assets/index-D_rET1xm.js",
    ],
    [
      "package/dist/ui/assets/index-C1b-M-e0.css",
      "tests/fixtures/golden-ui/assets/index-C1b-M-e0.css",
    ],
  ]);

  for (const [checksumPath, localPath] of files) {
    assert.equal(
      sha256(resolve(packageRoot, localPath)),
      checksums.get(checksumPath),
      `${localPath} divergiu da referência oficial`,
    );
  }
});
