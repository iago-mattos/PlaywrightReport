# Publicação privada no GitHub Packages

Este documento descreve a preparação e a publicação manual de
`@prognum/playwright-report`. Publicar exige autorização explícita do responsável
pelo pacote.

## Estado atual

- nome: `@prognum/playwright-report`;
- versão preparada: `0.2.0`;
- registry: `https://npm.pkg.github.com`;
- acesso: `restricted`;
- licença: `UNLICENSED`;
- remoto e campo `repository`: `iago-mattos/PlaywrightReport`.

O namespace `@prognum` precisa pertencer a uma conta ou organização GitHub sobre
a qual a conta publicadora tenha permissão. O repositório autorizado está
registrado no `package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/iago-mattos/PlaywrightReport.git"
  }
}
```

Esse campo associa o pacote ao repositório e permite que ele herde as permissões
do repositório quando a organização estiver configurada dessa forma.

## Autenticação local

O GitHub Packages exige um personal access token classic para operações locais.
Use os menores escopos necessários:

- `read:packages` para instalar;
- `write:packages` para publicar;
- `delete:packages` apenas para excluir ou restaurar versões.

O `.npmrc` versionado contém somente o mapeamento público do escopo:

```ini
@prognum:registry=https://npm.pkg.github.com
```

Mantenha o token no `.npmrc` do usuário:

```ini
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Então exporte o token somente na sessão necessária:

```bash
export NODE_AUTH_TOKEN="<TOKEN_CLASSIC>"
```

Outra opção é o login interativo recomendado para npm 9 ou superior:

```bash
npm login \
  --scope=@prognum \
  --auth-type=legacy \
  --registry=https://npm.pkg.github.com
```

Nunca grave tokens no repositório, no `package.json`, em scripts ou em exemplos.

## Versionamento semântico

A linha atual ainda é pré-1.0:

- `0.1.0`: baseline preservado do pacote original;
- `0.2.0`: reconstrução sustentável, testes, interface-fonte e PDF reutilizável;
- `0.2.x`: correções compatíveis;
- `0.3.0`: próxima evolução pública ou mudança incompatível enquanto pré-1.0;
- `1.0.0`: primeiro contrato público estável;
- após `1.0.0`, use major para incompatibilidades, minor para funcionalidades
  compatíveis e patch para correções compatíveis.

Para preparar uma versão sem criar commit ou tag automaticamente:

```bash
pnpm version patch --no-git-tag-version
pnpm install --lockfile-only
```

Também são aceitos `minor`, `major` e versões explícitas. Para uma pré-release:

```bash
pnpm version prerelease --preid=rc --no-git-tag-version
```

Revise `package.json`, lockfile e changelog antes de criar o commit e a tag. Uma
versão já publicada não deve ser reutilizada; prepare uma nova versão SemVer.

## Gerar e inspecionar o pacote

Execute todas as verificações aplicáveis:

```bash
pnpm test
pnpm test:ui
pnpm test:pdf
pnpm test:example
pnpm test:pack
```

Gere o tarball:

```bash
pnpm pack --pack-destination .artifacts
```

Confira o conteúdo antes de publicar:

```bash
tar -tzf .artifacts/prognum-playwright-report-0.2.0.tgz
```

O tarball deve conter apenas CLI, runtime, interface compilada, renderer PDF e
documentação. `reference/`, `tests/`, `examples/`, fixtures e artefatos locais
não fazem parte do pacote publicado.

## Publicação manual

Primeiro faça uma simulação. O script `prepublishOnly` exige o campo
`repository`, a configuração restrita e a autorização explícita; depois executa
os contratos e o smoke test do pacote:

```bash
PROGNUM_ALLOW_PUBLISH=1 pnpm publish --dry-run
```

Depois de revisar o remoto, o campo `repository`, a versão, a autenticação e a
aprovação do responsável, publique com:

```bash
PROGNUM_ALLOW_PUBLISH=1 pnpm publish --access restricted
```

O `publishConfig` fixa o registry do GitHub Packages, reduzindo o risco de envio
acidental ao npmjs.org. Este repositório não contém automação que publique por
tag ou push. Sem `PROGNUM_ALLOW_PUBLISH=1`, qualquer tentativa é interrompida
antes do envio.

## Instalação em outro projeto

No consumidor, crie um `.npmrc` sem token:

```ini
@prognum:registry=https://npm.pkg.github.com
```

Disponibilize um token com `read:packages` pelo ambiente e instale:

```bash
export NODE_AUTH_TOKEN="<TOKEN_CLASSIC>"
pnpm add -D @prognum/playwright-report@0.2.0 @playwright/test@^1.50.0
pnpm exec prognum-playwright-report init
```

Para atualizar uma instalação existente:

```bash
pnpm up -D @prognum/playwright-report@0.2.0
```

Commite a alteração do `package.json` e do `pnpm-lock.yaml` do consumidor.

## GitHub Actions no futuro

Quando houver um remoto autorizado, um workflow do próprio repositório poderá
publicar usando `GITHUB_TOKEN` com `contents: read` e `packages: write`. Para
instalar pacotes pertencentes a outro repositório privado, conceda acesso do
pacote ao repositório consumidor ou use um token classic com `read:packages`.

Referências oficiais:

- [Working with the npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [About permissions for GitHub Packages](https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages)
- [Publishing Node.js packages](https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages)
- [pnpm publish](https://pnpm.io/11.x/cli/publish)
