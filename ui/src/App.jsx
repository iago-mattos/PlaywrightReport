import {
  Activity,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock3,
  FolderOpen,
  Layers,
  LayoutDashboard,
  Moon,
  Search,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

import { ResultRow } from "./components/ResultRow.jsx";
import { TestDetails } from "./components/TestDetails.jsx";
import { Badge } from "./components/ui/Badge.jsx";
import { Button } from "./components/ui/Button.jsx";
import { Card, CardContent } from "./components/ui/Card.jsx";
import { Input } from "./components/ui/Input.jsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "./components/ui/Sheet.jsx";
import {
  defaultReportConfig,
  formatDateTime,
  formatDuration,
  pluralize,
  summarize,
  testDomain,
} from "./lib/report.js";

export function App() {
  const [report, setReport] = useState();
  const [config, setConfig] = useState(defaultReportConfig);
  const [loadError, setLoadError] = useState();
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState("all");
  const [project, setProject] = useState("all");
  const [domain, setDomain] = useState("all");
  const [selectedTest, setSelectedTest] = useState();
  const [dark, setDark] = useState(
    () => localStorage.getItem("portal-report-theme") === "dark",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("portal-report-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    Promise.all([
      fetch("./report-data.json").then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      }),
      fetch("./report-config.json")
        .then((response) =>
          response.ok ? response.json() : defaultReportConfig,
        )
        .catch(() => defaultReportConfig),
    ])
      .then(([reportData, reportConfig]) => {
        setReport(reportData);
        setConfig({
          ...defaultReportConfig,
          ...reportConfig,
          domains: reportConfig.domains ?? {},
        });
      })
      .catch((error) =>
        setLoadError(
          error instanceof Error ? error.message : "Falha ao carregar o relatório",
        ),
      );
  }, []);

  useEffect(() => {
    document.title = `${config.reportTitle} · ${config.productName}`;
    if (config.accentColor) {
      document.documentElement.style.setProperty("--primary", config.accentColor);
      document.documentElement.style.setProperty("--ring", config.accentColor);
    } else {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
    }
  }, [config]);

  const projects = useMemo(
    () => [...new Set(report?.tests.map((test) => test.project) ?? [])].sort(),
    [report],
  );

  const domains = useMemo(() => {
    const projectTests =
      report?.tests.filter(
        (test) => project === "all" || test.project === project,
      ) ?? [];
    return [...new Set(projectTests.map((test) => testDomain(test, config.domains)))].sort(
      (left, right) => left.localeCompare(right, "pt-BR"),
    );
  }, [config.domains, project, report]);

  const filteredTests = useMemo(
    () =>
      report?.tests.filter(
        (test) =>
          `${test.title} ${test.file} ${test.project} ${test.tags.join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (outcome === "all" || test.outcome === outcome) &&
          (project === "all" || test.project === project) &&
          (domain === "all" || testDomain(test, config.domains) === domain),
      ) ?? [],
    [config.domains, domain, outcome, project, report, search],
  );

  function selectProject(value) {
    setProject(value);
    setDomain("all");
  }

  const groupedTests = useMemo(() => {
    const groups = new Map();
    for (const test of filteredTests) {
      const projectGroups = groups.get(test.project) ?? new Map();
      const testDomainName = testDomain(test, config.domains);
      projectGroups.set(testDomainName, [
        ...(projectGroups.get(testDomainName) ?? []),
        test,
      ]);
      groups.set(test.project, projectGroups);
    }
    return [...groups.entries()].map(([projectName, projectGroups]) => {
      const tests = [...projectGroups.values()].flat();
      return {
        name: projectName,
        tests,
        summary: summarize(tests),
        domains: [...projectGroups.entries()].map(([domainName, tests]) => ({
          name: domainName,
          tests: [...tests].sort(
            (left, right) =>
              Number(right.outcome === "unexpected") -
              Number(left.outcome === "unexpected"),
          ),
          summary: summarize(tests),
        })),
      };
    });
  }, [config.domains, filteredTests]);

  if (loadError) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <Card className="max-w-lg">
          <CardContent>
            <CircleAlert className="mb-3 size-6 text-red-600" />
            <h1 className="font-semibold">Não foi possível abrir o relatório</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {loadError}. Gere os dados e abra pelo servidor do projeto.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Carregando relatório…
      </main>
    );
  }

  const passed = report.run.status === "passed";
  const percentage = report.run.total
    ? Math.round((report.summary.passed / report.run.total) * 100)
    : 0;
  const metrics = [
    {
      label: "Execuções",
      value: report.run.total,
      detail: "testes coletados",
      icon: Activity,
      tone: "text-primary",
    },
    {
      label: "Aprovados",
      value: report.summary.passed,
      detail: `${percentage}% do total`,
      icon: CircleCheck,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Falhas",
      value: report.summary.failed,
      detail:
        report.summary.failed === 1 ? "requer atenção" : "requerem atenção",
      icon: CircleAlert,
      tone: "text-red-600 dark:text-red-400",
    },
    {
      label: "Duração",
      value: formatDuration(report.run.duration),
      detail: "tempo total",
      icon: Clock3,
      tone: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <main className="min-h-screen pb-16">
      <header className="floating-chrome sticky top-0 z-40">
        <div className="mx-auto flex max-w-[1536px] items-center justify-between px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[14px] bg-primary text-primary-foreground shadow-sm">
              <Activity className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                {config.productName}
              </p>
              <h1 className="mt-0.5 whitespace-nowrap text-sm font-bold tracking-[-0.01em] sm:text-base">
                {config.reportTitle}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={passed ? "success" : "destructive"}>
              <span className="sm:hidden">
                {passed ? "Aprovada" : "Com falhas"}
              </span>
              <span className="hidden sm:inline">
                {passed ? "Execução aprovada" : "Execução com falhas"}
              </span>
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDark((value) => !value)}
              aria-label="Alternar tema"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="mobile-project-strip border-b border-border/55 px-4 py-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <button
            type="button"
            aria-pressed={project === "all"}
            onClick={() => selectProject("all")}
            className={`pressable shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${
              project === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border bg-background/65 text-muted-foreground"
            }`}
          >
            Visão geral
          </button>
          {projects.map((projectName) => (
            <button
              key={projectName}
              type="button"
              aria-pressed={project === projectName}
              onClick={() => selectProject(projectName)}
              className={`pressable shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${
                project === projectName
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border bg-background/65 text-muted-foreground"
              }`}
            >
              {projectName}
            </button>
          ))}
        </div>
      </div>

      <div className="report-shell mx-auto max-w-[1536px] px-4 py-6 sm:px-5 sm:py-8">
        <aside className="report-sidebar" aria-label="Navegação do relatório">
          <div className="sidebar-material overflow-hidden rounded-[22px] p-3">
            <div className="px-3 pb-2 pt-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Relatório
              </p>
            </div>
            <button
              type="button"
              onClick={() => selectProject("all")}
              aria-current={project === "all" && domain === "all" ? "page" : undefined}
              className={`sidebar-item ${
                project === "all" && domain === "all" ? "is-active" : ""
              }`}
            >
              <LayoutDashboard className="size-4" />
              <span>Visão geral</span>
              <span className="ml-auto tabular-nums text-[11px] opacity-65">
                {report.tests.length}
              </span>
            </button>
            <div className="mt-5 px-3 pb-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Projetos
              </p>
            </div>
            <nav className="space-y-1">
              {projects.map((projectName) => {
                const count = report.tests.filter(
                  (test) => test.project === projectName,
                ).length;
                return (
                  <button
                    key={projectName}
                    type="button"
                    onClick={() => selectProject(projectName)}
                    aria-current={
                      project === projectName && domain === "all"
                        ? "page"
                        : undefined
                    }
                    className={`sidebar-item ${
                      project === projectName && domain === "all"
                        ? "is-active"
                        : ""
                    }`}
                  >
                    <Layers className="size-4" />
                    <span className="truncate">{projectName}</span>
                    <span className="ml-auto tabular-nums text-[11px] opacity-65">
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
            {domains.length ? (
              <Fragment>
                <div className="mt-5 px-3 pb-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Domínios
                  </p>
                </div>
                <nav className="space-y-1">
                  {domains.map((domainName) => {
                    const count = report.tests.filter(
                      (test) =>
                        (project === "all" || test.project === project) &&
                        testDomain(test, config.domains) === domainName,
                    ).length;
                    return (
                      <button
                        key={domainName}
                        type="button"
                        onClick={() => setDomain(domainName)}
                        aria-current={domain === domainName ? "page" : undefined}
                        className={`sidebar-item sidebar-item-domain ${
                          domain === domainName ? "is-active" : ""
                        }`}
                      >
                        <span className="size-1.5 shrink-0 rounded-full bg-current opacity-50" />
                        <span className="truncate">{domainName}</span>
                        <span className="ml-auto tabular-nums text-[11px] opacity-65">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </Fragment>
            ) : null}
          </div>
          <p className="px-4 pt-4 text-[11px] leading-5 text-muted-foreground">
            Node {report.run.node}
            <br />
            {report.run.platform}
          </p>
        </aside>

        <div className="report-main min-w-0 space-y-7">
          <section className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span
                  className={`size-2 rounded-full ${
                    passed ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                Perfil {report.run.profile} · {formatDateTime(report.generatedAt)}
              </div>
              <h2 className="display-title">
                {passed
                  ? "Qualidade comprovada, sem ruído."
                  : "Falhas claras. Decisões rápidas."}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Uma leitura direta da execução, com contexto suficiente para agir e
                evidências acessíveis quando cada detalhe importa.
              </p>
            </div>
            <div className="material-surface rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div
                  className={`status-orb flex size-12 shrink-0 items-center justify-center rounded-2xl ${
                    passed
                      ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/12 text-red-600 dark:text-red-400"
                  }`}
                >
                  {passed ? (
                    <ShieldCheck className="size-6" />
                  ) : (
                    <CircleAlert className="size-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-bold">
                      {passed
                        ? "Tudo aprovado"
                        : `${report.summary.failed} falhas encontradas`}
                    </p>
                    <span className="text-sm font-bold tabular-nums">
                      {percentage}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${
                        passed ? "bg-emerald-500" : "bg-primary"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="mt-2 truncate text-xs text-muted-foreground">
                    Node {report.run.node} · {report.run.platform}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="material-surface grid overflow-hidden rounded-2xl sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map(({ label, value, detail, icon: Icon, tone }, index) => (
              <div
                key={label}
                className={`flex items-center gap-4 p-5 sm:p-6 ${
                  index === 1
                    ? "border-t sm:border-l sm:border-t-0"
                    : index === 2
                      ? "border-t lg:border-l lg:border-t-0"
                      : index === 3
                        ? "border-t sm:border-l lg:border-t-0"
                        : ""
                }`}
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted/75">
                  <Icon className={`size-5 ${tone}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {label}
                  </p>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <p className="text-2xl font-bold tracking-[-0.03em] tabular-nums">
                      {value}
                    </p>
                    <span className="hidden truncate text-[11px] text-muted-foreground xl:inline">
                      {detail}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <Card className="overflow-hidden">
            <CardContent className="space-y-5">
              <div>
                <h3 className="section-title text-xl font-bold">Execuções</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Encontre um teste e abra seus detalhes sem perder o contexto da
                  execução.
                </p>
              </div>
              <div className="report-filters">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar teste, arquivo ou tag"
                    className="pl-9"
                  />
                </div>
                <select
                  aria-label="Filtrar por resultado"
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value)}
                  className="h-11 rounded-xl border bg-background/65 px-3 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">Todos os resultados</option>
                  <option value="expected">Aprovados</option>
                  <option value="unexpected">Falhas</option>
                  <option value="flaky">Instáveis</option>
                  <option value="skipped">Ignorados</option>
                </select>
                <select
                  aria-label="Filtrar por projeto"
                  value={project}
                  onChange={(event) => selectProject(event.target.value)}
                  className="h-11 rounded-xl border bg-background/65 px-3 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">Todos os projetos</option>
                  {projects.map((projectName) => (
                    <option key={projectName} value={projectName}>
                      {projectName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {groupedTests.length ? (
                  groupedTests.map((projectGroup) => (
                    <details
                      key={projectGroup.name}
                      open
                      className="group overflow-hidden rounded-2xl border bg-background/35"
                    >
                      <summary className="pressable flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 hover:bg-muted/45">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="rounded-xl bg-muted/80 p-2.5">
                            <FolderOpen className="size-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {projectGroup.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {pluralize(
                                projectGroup.tests.length,
                                "execução",
                                "execuções",
                              )}{" "}
                              ·{" "}
                              {pluralize(
                                projectGroup.domains.length,
                                "domínio",
                                "domínios",
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {projectGroup.summary.unexpected ? (
                            <Badge variant="destructive">
                              {pluralize(
                                projectGroup.summary.unexpected,
                                "falha",
                                "falhas",
                              )}
                            </Badge>
                          ) : (
                            <Badge variant="success">
                              {pluralize(
                                projectGroup.summary.expected,
                                "aprovado",
                                "aprovados",
                              )}
                            </Badge>
                          )}
                          <ChevronDown className="size-4 text-muted-foreground transition group-open:rotate-180" />
                        </div>
                      </summary>
                      <div className="space-y-3 border-t bg-muted/15 p-3">
                        {projectGroup.domains.map((domainGroup) => (
                          <section
                            key={domainGroup.name}
                            className="overflow-hidden rounded-xl border bg-card/75"
                          >
                            <div className="flex items-center justify-between gap-3 bg-muted/30 px-4 py-3">
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {domainGroup.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {pluralize(
                                    domainGroup.tests.length,
                                    "execução",
                                    "execuções",
                                  )}
                                </p>
                              </div>
                              {domainGroup.summary.unexpected ? (
                                <Badge variant="destructive">
                                  {pluralize(
                                    domainGroup.summary.unexpected,
                                    "falha",
                                    "falhas",
                                  )}
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  {pluralize(
                                    domainGroup.summary.expected,
                                    "aprovado",
                                    "aprovados",
                                  )}
                                </Badge>
                              )}
                            </div>
                            {domainGroup.tests.map((test) => (
                              <ResultRow
                                key={test.id}
                                test={test}
                                onSelect={() => setSelectedTest(test)}
                              />
                            ))}
                          </section>
                        ))}
                      </div>
                    </details>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                    Nenhum teste encontrado com esses filtros.
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Exibindo {filteredTests.length} de {report.tests.length} execuções.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet
        open={Boolean(selectedTest)}
        onOpenChange={(open) => {
          if (!open) setSelectedTest(undefined);
        }}
      >
        <SheetContent>
          {selectedTest ? (
            <Fragment>
              <SheetTitle>{selectedTest.title}</SheetTitle>
              <SheetDescription>
                {selectedTest.titlePath.slice(0, -1).join(" › ")}
              </SheetDescription>
              <div className="mt-5">
                <TestDetails test={selectedTest} domains={config.domains} />
              </div>
            </Fragment>
          ) : null}
        </SheetContent>
      </Sheet>
    </main>
  );
}
