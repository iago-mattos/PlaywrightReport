import assert from "node:assert/strict";
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import test from "node:test";

import { chromium } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

import { packageRoot } from "../helpers.mjs";

const roots = {
  golden: resolve(packageRoot, "tests/fixtures/golden-ui"),
  candidate: resolve(packageRoot, ".tmp/ui-candidate"),
};
const reportFixture = resolve(packageRoot, "tests/fixtures/report-v2");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".zip": "application/zip",
};

function resolveRequest(pathname) {
  const [, variant, ...segments] = pathname.split("/");
  if (!(variant in roots)) return undefined;
  const relativePath = segments.join("/") || "index.html";
  const fixturePath = resolve(reportFixture, relativePath);
  if (
    ["report-data.json", "report-config.json"].includes(relativePath) ||
    relativePath.startsWith("evidence/")
  ) {
    return fixturePath;
  }
  const uiPath = resolve(roots[variant], relativePath);
  if (!uiPath.startsWith(`${roots[variant]}${sep}`) && uiPath !== roots[variant]) {
    return undefined;
  }
  return uiPath;
}

async function startServer() {
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url ?? "/", "http://127.0.0.1").pathname,
    );
    const filePath = resolveRequest(pathname);
    if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.setHeader(
      "Content-Type",
      mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    );
    createReadStream(filePath).pipe(response);
  });
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  return {
    server,
    origin: `http://127.0.0.1:${address.port}`,
  };
}

async function capture(browser, origin, variant, viewport, dark) {
  const context = await browser.newContext({
    viewport,
    colorScheme: dark ? "dark" : "light",
    reducedMotion: "reduce",
  });
  await context.addInitScript((darkMode) => {
    localStorage.setItem("portal-report-theme", darkMode ? "dark" : "light");
  }, dark);
  const page = await context.newPage();
  await page.goto(`${origin}/${variant}/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 2 }).waitFor();
  const screenshot = await page.screenshot({ fullPage: true, animations: "disabled" });
  await context.close();
  return screenshot;
}

function compareScreenshots(name, goldenBuffer, candidateBuffer) {
  const golden = PNG.sync.read(goldenBuffer);
  const candidate = PNG.sync.read(candidateBuffer);
  assert.equal(candidate.width, golden.width, `${name}: largura divergente`);
  assert.equal(candidate.height, golden.height, `${name}: altura divergente`);
  const diff = new PNG({ width: golden.width, height: golden.height });
  const changed = pixelmatch(
    golden.data,
    candidate.data,
    diff.data,
    golden.width,
    golden.height,
    { threshold: 0.12, includeAA: false },
  );
  const ratio = changed / (golden.width * golden.height);
  if (ratio > 0.01) {
    writeFileSync(resolve(packageRoot, `.tmp/ui-diff-${name}.png`), PNG.sync.write(diff));
  }
  assert.ok(ratio <= 0.01, `${name}: ${(ratio * 100).toFixed(3)}% de pixels divergentes`);
}

test("a UI reconstruída preserva o visual do golden master", async () => {
  const { server, origin } = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const scenarios = [
      ["desktop-light", { width: 1440, height: 1000 }, false],
      ["desktop-dark", { width: 1440, height: 1000 }, true],
      ["tablet-light", { width: 820, height: 1000 }, false],
      ["mobile-light", { width: 390, height: 844 }, false],
    ];
    for (const [name, viewport, dark] of scenarios) {
      const golden = await capture(browser, origin, "golden", viewport, dark);
      const candidate = await capture(browser, origin, "candidate", viewport, dark);
      compareScreenshots(name, golden, candidate);
    }
  } finally {
    await browser.close();
    await new Promise((resolvePromise, reject) =>
      server.close((error) => (error ? reject(error) : resolvePromise())),
    );
  }
});

test("golden e candidata oferecem os mesmos fluxos principais", async () => {
  const { server, origin } = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const variant of ["golden", "candidate"]) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${origin}/${variant}/`, { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "Falhas claras. Decisões rápidas." }).waitFor();
      await assert.doesNotReject(() =>
        page.getByText("Exibindo 4 de 4 execuções.").waitFor(),
      );

      const search = page.getByPlaceholder("Buscar teste, arquivo ou tag");
      await search.fill("falha determinística");
      await page.getByText("Exibindo 1 de 4 execuções.").waitFor();
      await search.fill("");

      await page.getByLabel("Filtrar por resultado").selectOption("unexpected");
      await page.getByText("Exibindo 1 de 4 execuções.").waitFor();
      await page.getByLabel("Filtrar por resultado").selectOption("all");

      await page.getByRole("button", { name: /falha determinística/u }).click();
      await page.getByText("Diagnóstico da falha").waitFor();
      await page.getByRole("tab", { name: "Evidências (4)" }).click();
      await page.getByText("Screenshots").waitFor();
      await page.getByText("Vídeos").waitFor();
      await page.getByText("Traces").waitFor();
      await page.getByText("Outros arquivos").waitFor();
      await page.getByRole("button", { name: "screenshot da falha" }).click();
      await page.getByText(/clique fora ou pressione Esc/u).waitFor();
      await page
        .getByRole("dialog")
        .filter({ hasText: /clique fora ou pressione Esc/u })
        .getByRole("button", { name: "Fechar" })
        .click();
      await page.getByRole("tab", { name: "Etapas" }).click();
      await page.getByText("abrir cadastro de proposta").waitFor();

      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Alternar tema" }).click();
      await assert.doesNotReject(async () => {
        await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
      });
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolvePromise, reject) =>
      server.close((error) => (error ? reject(error) : resolvePromise())),
    );
  }
});
