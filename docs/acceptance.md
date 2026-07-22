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
| Remoto Git autorizado | `origin` em `iago-mattos/PlaywrightReport` | concluído |
| Sem publicação do pacote | trava exige autorização explícita adicional | preservado |

## Comando de homologação

Com Python, ReportLab, Pillow, Playwright e Chromium disponíveis:

```bash
pnpm verify
```

O comando executa contratos, paridade visual, PDF, exemplo, instalação do
tarball e auditoria de whitespace.

## Limitações deliberadas

- Publicação exige `PROGNUM_ALLOW_PUBLISH=1`, além do remoto autorizado.
- O remoto pertence a `iago-mattos`; publicar como `@prognum` ainda exige que
  a conta autenticada tenha permissão sobre esse namespace no GitHub Packages.
- O renderer PDF depende de Python com ReportLab e Pillow.
- O fallback textual `Portal → SCCI/AEJS` permanece por compatibilidade com o
  golden master 0.1.0; ele não contém dados operacionais.
- A execução local atual não publica, cria releases, tags ou repositórios.

## Próxima ação externa

Após o primeiro push, validar o workflow de CI. A publicação continua sendo uma
etapa separada e deve seguir `docs/github-packages.md` somente após nova
autorização explícita.
