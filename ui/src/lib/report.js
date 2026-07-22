export const outcomeLabels = {
  expected: "Aprovado",
  unexpected: "Falhou",
  flaky: "Instável",
  skipped: "Ignorado",
};

export const defaultDomains = {
  auth: "Autenticação",
  login: "Login",
  proposals: "Propostas",
  timeline: "Linha do tempo",
  "proposal-form": "Cadastro da proposta",
  documents: "Documentos",
  fields: "Campos e contratos",
  persistence: "Persistência",
  concurrency: "Concorrência",
  isolation: "Isolamento",
  navigation: "Navegação",
  session: "Sessão e autorização",
  mobile: "Mobile e acessibilidade",
  "portal-aejs": "Portal → SCCI/AEJS",
  setup: "Preparação",
};

export const defaultReportConfig = {
  productName: "Portal Quality",
  reportTitle: "Relatório Playwright",
  domains: {},
};

export function formatDuration(milliseconds) {
  if (milliseconds < 1000) return `${milliseconds} ms`;
  const seconds = milliseconds / 1000;
  return seconds < 60
    ? `${seconds.toFixed(+(seconds < 10))} s`
    : `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function outcomeVariant(outcome) {
  if (outcome === "expected") return "success";
  if (outcome === "unexpected") return "destructive";
  if (outcome === "flaky") return "warning";
  return "secondary";
}

export function testDomain(test, configuredDomains = {}) {
  const segments = test.file.split("/");
  const key = segments.length > 2 ? segments[1] : segments[0];
  return configuredDomains[key] ?? defaultDomains[key] ?? key.replaceAll("-", " ");
}

export function summarize(tests) {
  return tests.reduce(
    (summary, test) => {
      summary[test.outcome] += 1;
      return summary;
    },
    { expected: 0, unexpected: 0, flaky: 0, skipped: 0 },
  );
}

export function parseExpectedReceived(error) {
  const lines = error.message.split("\n").map((line) => line.trim());
  const find = (label) =>
    lines
      .find((line) => new RegExp(`^${label}(?: [^:]*)?:`, "iu").test(line))
      ?.replace(new RegExp(`^${label}(?: [^:]*)?:\\s*`, "iu"), "");
  return { expected: find("Expected"), received: find("Received") };
}

export async function copyText(value) {
  await navigator.clipboard.writeText(value);
}
