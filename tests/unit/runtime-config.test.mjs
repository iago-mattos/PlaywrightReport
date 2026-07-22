import assert from "node:assert/strict";
import test from "node:test";

import { withPrognumReport } from "../../runtime/config.mjs";

function preserveEnvironment(names) {
  const original = new Map(names.map((name) => [name, process.env[name]]));
  return () => {
    for (const [name, value] of original) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };
}

test("adiciona o reporter sem remover reporters existentes", () => {
  const config = withPrognumReport({
    reporter: "line",
    use: { baseURL: "https://example.test", screenshot: "off" },
  });

  assert.equal(config.reporter.length, 2);
  assert.deepEqual(config.reporter[0], ["line"]);
  assert.match(config.reporter[1][0], /runtime\/reporter\.mjs$/u);
  assert.deepEqual(config.reporter[1][1], {
    outputDir: ".playwright/prognum-report-data",
  });
  assert.equal(config.use.baseURL, "https://example.test");
  assert.equal(config.use.screenshot, "off");
  assert.equal(config.use.trace, "retain-on-failure");
  assert.equal(config.use.video, "retain-on-failure");
});

test(
  "PW_EVIDENCE=all força a captura de todas as evidências",
  { concurrency: false },
  () => {
    const restore = preserveEnvironment([
      "PW_EVIDENCE",
      "PROGNUM_REPORT_DATA_DIR",
    ]);
    try {
      process.env.PW_EVIDENCE = "all";
      process.env.PROGNUM_REPORT_DATA_DIR = "/tmp/report-data-from-env";

      const config = withPrognumReport({ use: { screenshot: "off" } });

      assert.equal(config.use.screenshot, "on");
      assert.equal(config.use.trace, "on");
      assert.equal(config.use.video, "on");
      assert.equal(
        config.reporter.at(-1)[1].outputDir,
        "/tmp/report-data-from-env",
      );
    } finally {
      restore();
    }
  },
);

test(
  "a opção dataDir tem precedência sobre a variável de ambiente",
  { concurrency: false },
  () => {
    const restore = preserveEnvironment(["PROGNUM_REPORT_DATA_DIR"]);
    try {
      process.env.PROGNUM_REPORT_DATA_DIR = "/tmp/from-env";
      const config = withPrognumReport({}, { dataDir: "/tmp/from-option" });
      assert.equal(config.reporter.at(-1)[1].outputDir, "/tmp/from-option");
    } finally {
      restore();
    }
  },
);

