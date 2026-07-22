# @prognum/playwright-report

Reporter reutilizável para Playwright com interface responsiva, evidências,
traces, steps, diagnóstico de falhas e PDF executivo opcional.

## Requisitos

- Node.js 20 ou superior;
- pnpm;
- `@playwright/test` 1.50 ou superior;
- Python 3 com ReportLab e Pillow apenas para a geração de PDF.

## Instalação pelo GitHub Packages

Configure o escopo em um `.npmrc` do projeto consumidor:

```ini
@prognum:registry=https://npm.pkg.github.com
```

Disponibilize um token com `read:packages` pelo `.npmrc` do usuário ou pela
variável usada no ambiente, nunca em um arquivo versionado:

```ini
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Instale o reporter e o Playwright:

```bash
pnpm add -D @prognum/playwright-report@0.2.0 @playwright/test@^1.50.0
pnpm exec prognum-playwright-report init
```

Para validar um tarball antes da publicação:

```bash
pnpm pack
pnpm add -D ./prognum-playwright-report-0.2.0.tgz
```

## Início rápido

O comando `init` cria `playwright.report.config.ts`,
`prognum-report.config.mjs`, scripts no `package.json` e entradas no
`.gitignore`. Ele é idempotente e não substitui configurações existentes.

```bash
pnpm pw:test:report
pnpm pw:report:open
```

O teste usa a configuração Playwright original como base. O resultado do
Playwright é preservado, inclusive o exit code, e a construção do relatório é
tentada mesmo quando há falhas.

## Comandos

| Comando | Descrição |
| --- | --- |
| `prognum-playwright-report init` | Configura o projeto consumidor. |
| `prognum-playwright-report test [-- args]` | Executa os testes e constrói o HTML. |
| `prognum-playwright-report build` | Reconstrói o HTML com os últimos dados. |
| `prognum-playwright-report pdf` | Gera o PDF executivo e o anexa ao HTML. |
| `prognum-playwright-report open` | Serve o relatório e abre o navegador. |
| `prognum-playwright-report open --no-open` | Serve sem abrir o navegador. |

Argumentos após `test` são encaminhados ao Playwright:

```bash
pnpm exec prognum-playwright-report test -- --project=chromium --grep @smoke
```

## Configuração manual do Playwright

Se não quiser usar `init`, crie `playwright.report.config.ts`:

```ts
import baseConfig from "./playwright.config";
import { withPrognumReport } from "@prognum/playwright-report/config";

export default withPrognumReport(baseConfig);
```

O helper preserva reporters e opções `use` existentes. Por padrão, screenshots
são capturadas em falhas e traces e vídeos são retidos em falhas. Para capturar
todas as evidências em uma execução:

```bash
PW_EVIDENCE=all pnpm pw:test:report
```

## Configuração do relatório

Exemplo de `prognum-report.config.mjs`:

```js
export default {
  productName: "Produto",
  reportTitle: "Relatório Playwright",
  accentColor: "oklch(0.56 0.205 257.3)",
  domains: {
    tests: "Testes funcionais",
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
    footerText: "Relatório Playwright - Evidências da automação",
    metadataFields: {
      workflow: "Workflow",
      ticket: "Chamado",
    },
  },
};
```

`dataDir` e `outputDir` devem permanecer dentro do projeto. O build recusa a
raiz e caminhos externos antes de limpar o diretório de saída.

`metadataFields` é uma lista explícita dos campos de attachments JSON que podem
aparecer no PDF. O renderer nunca inclui automaticamente o JSON inteiro.

## PDF

Instale as dependências no Python usado pelo projeto:

```bash
python3 -m pip install reportlab Pillow
```

Se esse Python não estiver no `PATH`, configure seu executável:

```bash
export PROGNUM_REPORT_PYTHON=/caminho/para/python3
pnpm pw:report:pdf
```

O PDF é gerado em `pdf.outputPath`. Com `includeInReport: true`, uma cópia é
colocada no diretório HTML e um botão de download é adicionado à página.

## Exemplo mínimo

O projeto em [`examples/minimal-playwright`](examples/minimal-playwright)
executa um teste sintético com steps, screenshot e attachment JSON. A validação
automatizada instala o tarball real em um diretório temporário:

```bash
pnpm test:example
```

## Desenvolvimento e validação

```bash
pnpm install
pnpm test
pnpm test:ui
pnpm test:pdf
pnpm test:example
pnpm test:pack
pnpm verify
```

- `test`: contratos do reporter, runtime e CLI;
- `test:ui`: comparação visual e funcional com o golden master compilado;
- `test:pdf`: geração real, paginação, conteúdo e download;
- `test:example`: consumidor Playwright mínimo instalado pelo tarball;
- `test:pack`: instalação e smoke test do pacote empacotado.
- `verify`: executa a homologação completa e exige as dependências do PDF.

Detalhes da arquitetura e dos limites de manutenção estão em
[`docs/maintenance.md`](docs/maintenance.md). O processo de versionamento,
autenticação e publicação privada está em
[`docs/github-packages.md`](docs/github-packages.md). A matriz final de aceite
está em [`docs/acceptance.md`](docs/acceptance.md).

## Licença e publicação

O pacote está marcado como `UNLICENSED` e configurado para publicação restrita
no GitHub Packages. Nenhuma versão é publicada automaticamente.
