# Contribuindo com o Valor Academy

## Fluxo de trabalho

1. Crie uma branch a partir de `main` descrevendo a etapa/funcionalidade
   (ex.: `etapa-2-estrutura-organizacional`).
2. Siga a ordem de etapas definida em [`PLANO_IMPLEMENTACAO.md`](./PLANO_IMPLEMENTACAO.md).
3. Antes de abrir um PR, rode localmente:
   ```bash
   npm run lint
   npx tsc --noEmit
   npm run build
   ```
4. Atualize `PLANO_IMPLEMENTACAO.md` marcando o que foi concluído/pendente.

## Padrões de código

- TypeScript em modo estrito — evite `any`; prefira tipos explícitos ou inferência.
- Toda rota/ação que altera dados sensíveis deve validar permissão no servidor
  (`src/lib/permissions`), nunca confiar apenas em uma checagem no cliente.
- Textos visíveis ao usuário devem estar em português do Brasil.
- Datas no formato `dd/MM/yyyy`, moeda em `R$`, fuso horário padrão `America/Belem`.
- Toda tabela de negócio nova deve ter `organization_id` e política de RLS
  correspondente em `supabase/migrations/`.
- Prefira editar componentes existentes em `src/components/ui` (shadcn/ui) a criar
  componentes visuais do zero.

## Migrations

Migrations são arquivos SQL numerados sequencialmente em `supabase/migrations/`.
Nunca edite uma migration já aplicada em produção — crie uma nova.
