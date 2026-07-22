export const defaultConfig = {
  productName: "Prognum Quality",
  reportTitle: "Relatório Playwright",
  accentColor: "oklch(0.56 0.205 257.3)",
  domains: {},
  evidence: "failure",
  dataDir: ".playwright/prognum-report-data",
  outputDir: "prognum-report",
  port: 9324,
  pdf: {
    outputPath: "output/pdf/playwright-report.pdf",
    includeInReport: true,
    downloadLabel: "Baixar PDF",
    author: "",
    footerText: "",
    metadataFields: {},
  },
};
