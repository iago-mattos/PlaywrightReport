import { spawnSync } from "node:child_process";
import process from "node:process";

function pythonCandidates(environment) {
  const configured = [
    environment.PROGNUM_REPORT_PYTHON,
    environment.PYTHON,
  ]
    .filter(Boolean)
    .map((command) => ({ command, arguments_: [] }));
  const discovered =
    process.platform === "win32"
      ? [
          { command: "py", arguments_: ["-3"] },
          { command: "python", arguments_: [] },
          { command: "python3", arguments_: [] },
        ]
      : [
          { command: "python3", arguments_: [] },
          { command: "python", arguments_: [] },
        ];

  const seen = new Set();
  return [...configured, ...discovered].filter(({ command, arguments_ }) => {
    const key = JSON.stringify([command, ...arguments_]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function findPdfPython(environment = process.env) {
  for (const candidate of pythonCandidates(environment)) {
    const result = spawnSync(
      candidate.command,
      [
        ...candidate.arguments_,
        "-c",
        "import reportlab, PIL; print('ok')",
      ],
      {
        encoding: "utf8",
        env: environment,
        stdio: ["ignore", "ignore", "ignore"],
      },
    );
    if (result.status === 0) return candidate;
  }
  return undefined;
}

export function runPdfRenderer({ rendererPath, payload, cwd, environment }) {
  const python = findPdfPython(environment);
  if (!python) {
    throw new Error(
      "Python com ReportLab e Pillow não encontrado. Configure " +
        "PROGNUM_REPORT_PYTHON ou instale as dependências no Python disponível.",
    );
  }

  const result = spawnSync(
    python.command,
    [...python.arguments_, rendererPath],
    {
      cwd,
      encoding: "utf8",
      env: {
        ...environment,
        PYTHONDONTWRITEBYTECODE: "1",
      },
      input: JSON.stringify(payload),
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      result.stderr.trim() || `O renderer de PDF encerrou com código ${result.status}.`,
    );
  }
  if (result.stdout) process.stdout.write(result.stdout);
}
