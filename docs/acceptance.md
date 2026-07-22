# Homologação final

Estado em 22 de julho de 2026: versão `0.2.0` homologada localmente e ainda não
publicada.

## Matriz de aceite

| Objetivo | Evidência | Estado |
| --- | --- | --- |
| Repositório Git independente | raiz Git própria, fora do projeto de origem | concluído |
| Baseline 0.1.0 preservado | `reference/`, checksums e teste de integridade | concluído |
| CLI `init`, `test`, `build`, `open` | contratos unitários e de integração | concluído |
| Geração de PDF reutilizável | comando `pdf`, teste real e inspeção visual | concluído |
| Interface com código-fonte | `ui/src` e build Vite | concluído |
| Fidelidade ao golden master | comparação visual e funcional no Chromium | concluído |
| Pacote gerado com pnpm | `pnpm pack` e consumidor temporário | concluído |
| Exemplo Playwright mínimo | `examples/minimal-playwright` e `test:example` | concluído |
| Compatibilidade Playwright 1.50+ | peer dependency e consumidor real | concluído |
| Node.js 20+ | contratos e build em Node 20.20.2, `engines` e CI | concluído |
| GitHub Packages privado | registry e acesso restrito | preparado |
| Documentação operacional | README, manutenção e publicação | concluído |
| Ausência de dados sensíveis | auditoria do tarball instalado | concluído |
| Sem publicação ou remoto | trava de publicação e `git remote` vazio | preservado |

## Comando de homologação

Com Python, ReportLab, Pillow, Playwright e Chromium disponíveis:

```bash
pnpm verify
```

O comando executa contratos, paridade visual, PDF, exemplo, instalação do
tarball e auditoria de whitespace.

## Limitações deliberadas

- O campo `repository` permanece ausente até a definição e autorização do
  remoto GitHub.
- Publicação exige `PROGNUM_ALLOW_PUBLISH=1`, além do remoto autorizado.
- O renderer PDF depende de Python com ReportLab e Pillow.
- O fallback textual `Portal → SCCI/AEJS` permanece por compatibilidade com o
  golden master 0.1.0; ele não contém dados operacionais.
- A execução local atual não publica, cria releases, tags ou repositórios.

## Próxima ação externa

Quando houver autorização, definir o nome do repositório GitHub, adicionar o
campo `repository`, configurar o remoto e seguir `docs/github-packages.md`.
