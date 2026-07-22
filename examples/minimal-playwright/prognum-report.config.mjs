export default {
  productName: "Projeto de exemplo",
  reportTitle: "Relatório Playwright mínimo",
  accentColor: "oklch(0.56 0.205 257.3)",
  domains: {
    tests: "Fluxo mínimo",
  },
  evidence: "failure",
  dataDir: ".playwright/prognum-report-data",
  outputDir: "prognum-report",
  port: 9324,
  pdf: {
    outputPath: "output/pdf/playwright-report.pdf",
    includeInReport: true,
    downloadLabel: "Baixar PDF",
    author: "Equipe de qualidade",
    footerText: "Projeto de exemplo - Evidências da automação",
    metadataFields: {
      scenario: "Cenário",
    },
  },
};
