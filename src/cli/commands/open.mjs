import { spawn } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".zip": "application/zip",
};

function openBrowser(url) {
  const command =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  const child = spawn(command[0], command[1], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

export function openReport(cwd, config, shouldOpenBrowser = true) {
  const outputRoot = resolve(cwd, config.outputDir);
  if (!existsSync(resolve(outputRoot, "index.html"))) {
    throw new Error("Relatório não encontrado. Execute npm run pw:report:build.");
  }

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const requestedPath = decodeURIComponent(requestUrl.pathname);
    const filePath = resolve(
      outputRoot,
      requestedPath === "/" ? "index.html" : `.${requestedPath}`,
    );
    if (
      filePath !== outputRoot &&
      !filePath.startsWith(`${outputRoot}${sep}`)
    ) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.setHeader(
      "Content-Type",
      mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    );
    createReadStream(filePath).pipe(response);
  });

  server.listen(config.port, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${config.port}`;
    console.log(`Relatório disponível em ${url}`);
    console.log("Pressione Ctrl+C para encerrar.");
    if (shouldOpenBrowser) openBrowser(url);
  });
  return server;
}

