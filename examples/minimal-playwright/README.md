# Exemplo Playwright mínimo

Este projeto demonstra a integração completa com `@prognum/playwright-report`
sem depender de uma aplicação externa.

No clone deste repositório, a dependência `file:../..` aponta para o pacote
local. Para executar:

```bash
pnpm install
pnpm exec playwright install chromium
pnpm test:report
pnpm report:open
```

O HTML será criado em `prognum-report/`. Para gerar também o PDF, instale
ReportLab e Pillow e execute:

```bash
python3 -m pip install reportlab Pillow
pnpm report:pdf
```

Em um projeto consumidor real, substitua a dependência local pela versão
publicada no GitHub Packages.
