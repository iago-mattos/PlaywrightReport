# Manutenção do pacote

## Estrutura

```text
bin/                 entrada executável
src/cli/             comandos e carregamento de configuração
src/pdf/             descoberta do Python e execução do renderer
runtime/             integração com Playwright e reporter
ui/src/              código-fonte da interface
ui/vite.config.mjs   build da interface
dist/ui/             interface compilada incluída no pacote
pdf/                 renderer PDF reutilizável
examples/            consumidor Playwright mínimo
tests/               contratos, fixtures e golden master
reference/           tarball original e checksums
```

O projeto é um único pacote, não um monorepo. `examples/minimal-playwright` é uma
fixture executável e não participa de um workspace pnpm.

## Golden master da interface

`tests/fixtures/golden-ui` preserva o conteúdo compilado de `dist/ui` da versão
0.1.0. O código-fonte reconstruído é compilado em `.tmp/ui-candidate` e
comparado no Chromium com o golden master.

```bash
pnpm test:ui
```

O teste cobre desktop, tablet, mobile, temas claro e escuro, busca, filtros,
detalhes, steps, screenshots, vídeos, traces, attachments e navegação. Não
substitua o golden master por um build novo para fazer uma divergência passar.

Por compatibilidade, o fallback legado de domínio `portal-aejs` ainda exibe o
rótulo `Portal → SCCI/AEJS`, exatamente como no golden master 0.1.0. Ele não
contém dados operacionais nem regras de PDF/CLI. Removê-lo exige uma decisão de
produto e a atualização explícita do contrato visual e funcional.

## Build da interface

```bash
pnpm build:ui
```

O comando recompila `dist/ui`. `prepack` executa esse build automaticamente. O
builder só aceita diretórios de saída dentro deste repositório.

## Reporter e schema

O reporter grava o schema `version: 2` em
`.playwright/prognum-report-data/report.json`. Alterações incompatíveis no schema
exigem uma decisão de versionamento e testes de migração ou compatibilidade.

## PDF

O renderer Python recebe caminhos e configuração pelo executor Node. Não inclua
nomes de clientes, caminhos locais ou listas de campos de negócio no renderer.
Campos de attachments JSON devem continuar opt-in por `pdf.metadataFields`.

Depois de alterar paginação, estilos ou imagens, execute `pnpm test:pdf`,
renderize o PDF com Poppler e inspecione todas as páginas visualmente.

## Contratos de segurança

- o build HTML só limpa uma subpasta do projeto consumidor;
- o PDF só pode ser escrito dentro do projeto consumidor;
- attachments usados pelo PDF precisam resolver dentro do relatório;
- tokens e credenciais nunca entram no pacote ou em `.npmrc` versionado;
- a publicação exige `repository` real e `PROGNUM_ALLOW_PUBLISH=1`;
- `tests/fixtures` e `examples` usam apenas dados sintéticos.

## Checklist de manutenção

```bash
pnpm test
pnpm test:ui
pnpm test:pdf
pnpm test:example
pnpm test:pack
git diff --check
```

Antes de publicar, siga também `docs/github-packages.md`.
