import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import PrognumReporter from "../../runtime/reporter.mjs";
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from "../helpers.mjs";

function fakeTest(rootDir) {
  return {
    id: "test-id",
    title: "exibe o relatório",
    titlePath: () => ["arquivo", "grupo", "exibe o relatório"],
    parent: { project: () => ({ name: "chromium" }) },
    location: { file: resolve(rootDir, "tests/example.spec.ts"), line: 12 },
    tags: ["@smoke"],
    expectedStatus: "passed",
    outcome: () => "unexpected",
  };
}

function fakeResult() {
  return {
    retry: 1,
    status: "failed",
    duration: 1250,
    startTime: new Date("2026-01-01T10:00:00.000Z"),
    errors: [
      {
        message: "\u001b[31mExpected: ativo\u001b[0m\nReceived: inativo",
        stack: "\u001b[31mstack de falha\u001b[0m",
        snippet: "expect(status).toBe('ativo')",
        location: { file: "/workspace/tests/example.spec.ts", line: 12, column: 3 },
      },
    ],
    annotations: [{ type: "issue", description: "ABC-123" }],
    attachments: [
      {
        name: "screenshot final",
        contentType: "image/png",
        body: Buffer.from("fake-png"),
      },
      {
        name: "trace",
        contentType: "application/zip",
        body: Buffer.from("fake-trace"),
      },
    ],
    steps: [
      {
        title: "abrir página",
        category: "test.step",
        duration: 400,
        error: undefined,
        steps: [
          {
            title: "aguardar conteúdo",
            category: "pw:api",
            duration: 100,
            error: { message: "timeout" },
            steps: [],
          },
        ],
      },
    ],
  };
}

test("serializa execução, erros, steps e attachments no schema v2", () => {
  const rootDir = createTemporaryDirectory("prognum-reporter-");
  const outputDir = resolve(rootDir, "data");
  try {
    const reporter = new PrognumReporter({ outputDir });
    reporter.onBegin(
      { rootDir },
      { allTests: () => [fakeTest(rootDir)] },
    );
    reporter.onTestEnd(fakeTest(rootDir), fakeResult());
    reporter.onEnd({ status: "failed" });

    const report = JSON.parse(
      readFileSync(resolve(outputDir, "report.json"), "utf8"),
    );
    assert.equal(report.version, 2);
    assert.equal(report.run.status, "failed");
    assert.equal(report.run.total, 1);
    assert.deepEqual(report.summary, {
      passed: 0,
      failed: 1,
      skipped: 0,
      flaky: 0,
    });

    const [serialized] = report.tests;
    assert.equal(serialized.id, "test-id-1");
    assert.equal(serialized.project, "chromium");
    assert.equal(serialized.file, "tests/example.spec.ts");
    assert.equal(serialized.errors[0].message.includes("\u001b"), false);
    assert.equal(serialized.errors[0].stack, "stack de falha");
    assert.equal(serialized.annotations[0].type, "issue");
    assert.equal(serialized.steps[0].steps[0].error, "timeout");
    assert.deepEqual(
      serialized.attachments.map(({ kind }) => kind),
      ["image", "trace"],
    );
    for (const attachment of serialized.attachments) {
      assert.equal(attachment.path.startsWith("evidence/"), true);
      assert.equal(
        existsSync(resolve(outputDir, "assets", attachment.path.split("/").at(-1))),
        true,
      );
    }
  } finally {
    removeTemporaryDirectory(rootDir);
  }
});

test("não cria report.json quando nenhuma execução chegou a onTestEnd", () => {
  const rootDir = createTemporaryDirectory("prognum-reporter-empty-");
  const outputDir = resolve(rootDir, "data");
  try {
    const reporter = new PrognumReporter({ outputDir });
    reporter.onBegin({ rootDir }, { allTests: () => [] });
    reporter.onEnd({ status: "passed" });
    assert.equal(existsSync(resolve(outputDir, "report.json")), false);
  } finally {
    removeTemporaryDirectory(rootDir);
  }
});

