# @prognum/playwright-report

Relatório Playwright reutilizável com interface adaptativa para desktop, tablet
e mobile.

## Instalação local

```bash
npm install -D ./prognum-playwright-report-0.1.0.tgz
npx prognum-playwright-report init
```

## Uso

```bash
npm run pw:test:report
npm run pw:report:pdf
npm run pw:report:open
```

Para iniciar o servidor sem abrir automaticamente o navegador:

```bash
npx prognum-playwright-report open --no-open
```

O comando de teste preserva o resultado original do Playwright, mas sempre tenta
construir o relatório, inclusive quando algum teste falha.

O PDF requer Python 3 com ReportLab e Pillow. Se o Python correto não estiver no
`PATH`, defina `PROGNUM_REPORT_PYTHON=/caminho/para/python3`.

```bash
python3 -m pip install reportlab Pillow
```

Por padrão, o comando gera `output/pdf/playwright-report.pdf`, copia o arquivo
para o relatório HTML e adiciona um botão de download. As opções são
configuradas em `prognum-report.config.mjs`:

```js
export default {
  pdf: {
    outputPath: "output/pdf/playwright-report.pdf",
    includeInReport: true,
    downloadLabel: "Baixar PDF",
    author: "Equipe de qualidade",
    footerText: "Relatório Playwright - Evidências da automação",
    metadataFields: {
      workflow: "Workflow",
      ticket: "Chamado",
    },
  },
};
```

`metadataFields` funciona como uma lista explícita de campos permitidos. O PDF
nunca inclui automaticamente todo o conteúdo de attachments JSON.

## Personalização

Edite `prognum-report.config.mjs` para alterar título, produto, cor, domínios,
evidências e diretório de saída.
