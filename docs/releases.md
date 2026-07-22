# Distribuição por GitHub Release

O método principal de distribuição é um tarball gerado por `pnpm pack` e
anexado a uma GitHub Release. Isso preserva o nome
`@prognum/playwright-report`, fixa cada versão e não exige autenticação para
consumir uma release pública.

## Instalação em um projeto Playwright

No projeto consumidor:

```bash
pnpm add -D \
  @playwright/test@^1.50.0 \
  "https://github.com/iago-mattos/PlaywrightReport/releases/download/v0.2.0/prognum-playwright-report-0.2.0.tgz"
pnpm exec prognum-playwright-report init
pnpm exec playwright install chromium
```

O `init` adiciona os scripts de uso ao `package.json`. Execute:

```bash
pnpm pw:test:report
pnpm pw:report:open
```

Para o PDF, instale ReportLab e Pillow no Python utilizado pelo projeto:

```bash
python3 -m pip install reportlab Pillow
pnpm pw:report:pdf
```

## Integridade do artefato

Cada release inclui:

- `prognum-playwright-report-<versão>.tgz`;
- `prognum-playwright-report-<versão>.tgz.sha256`.

Após baixar os dois arquivos, confira o tarball no macOS:

```bash
shasum -a 256 -c prognum-playwright-report-0.2.0.tgz.sha256
```

No Linux, use `sha256sum -c` com o mesmo arquivo.

## Atualização

Escolha a nova versão na página de releases e substitua a URL:

```bash
pnpm add -D \
  "https://github.com/iago-mattos/PlaywrightReport/releases/download/v0.2.1/prognum-playwright-report-0.2.1.tgz"
```

Versione o `pnpm-lock.yaml` do projeto consumidor. Não use URLs de branches
como `main`, pois elas não representam artefatos imutáveis.

## Processo do mantenedor

1. Atualizar a versão no `package.json` e o `CHANGELOG.md` conforme SemVer.
2. Executar `pnpm verify` com as dependências Python disponíveis.
3. Confirmar que a branch `main` está limpa e sincronizada.
4. Gerar o tarball com `pnpm pack`.
5. Gerar o checksum SHA-256 do tarball.
6. Criar uma tag anotada `v<versão>` no commit homologado.
7. Criar a GitHub Release da tag e anexar o tarball e o checksum.
8. Instalar o artefato pela URL da release em um projeto temporário e executar
   pelo menos o `--help` da CLI.

A release distribui o tarball, mas não publica o pacote no GitHub Packages. A
publicação no registry continua protegida por `PROGNUM_ALLOW_PUBLISH=1` e pelo
procedimento separado em `docs/github-packages.md`.
