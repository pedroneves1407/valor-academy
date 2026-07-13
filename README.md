# Valor Academy

Plataforma corporativa de treinamentos, trilhas de aprendizagem, avaliações,
certificados, metas e PDI (Plano de Desenvolvimento Individual) — multiempresa,
100% em português do Brasil.

> **Status atual:** Etapa 1 (Fundação) concluída. Autenticação, isolamento
> multiempresa, permissões por perfil e navegação estão funcionais. Os módulos de
> cursos, avaliações, certificados, metas, PDI, relatórios e comunicados estão
> planejados e documentados em [`PLANO_IMPLEMENTACAO.md`](./PLANO_IMPLEMENTACAO.md),
> mas ainda não implementados.

## Visão geral

- `superadministrador` — opera a plataforma (empresas, planos, uso, logs).
- `administrador da empresa` — gerencia colaboradores, cursos, trilhas, avaliações,
  certificados, metas, PDI e relatórios da própria empresa.
- `gestor` — acompanha sua equipe, metas e PDI.
- `colaborador` — consome cursos/trilhas, faz avaliações, acompanha certificados,
  metas e PDI.

Cada empresa (organização) enxerga apenas seus próprios dados — isolamento garantido
por `organization_id` e Row Level Security no Postgres (Supabase).

## Tecnologias

- Next.js 16 (App Router) + TypeScript (modo estrito) + React 19
- Tailwind CSS v4 + shadcn/ui (Radix) + Lucide Icons
- React Hook Form + Zod
- TanStack Table, Recharts, date-fns (`pt-BR`)
- Supabase (Postgres + Auth + Storage) com Row Level Security
- pdfkit (certificados em PDF) + qrcode (QR Code de validação)
- Vitest + Testing Library

## Pré-requisitos

- Node.js 20+ (gerenciado via `nvm` neste projeto)
- Uma conta gratuita em [supabase.com](https://supabase.com) — **não é necessário
  Docker**; o projeto usa uma instância hospedada do Supabase, não o Supabase local.

## Instalação

```bash
npm install
cp .env.example .env.local
# preencha .env.local com as credenciais do seu projeto Supabase (ver abaixo)
```

## Variáveis de ambiente

Preencha `.env.local` (nunca commitado — veja `.gitignore`) com valores de
**Project Settings → API** e **Project Settings → Database** no painel do Supabase:

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role key (secreta) |
| `DATABASE_URL` | Project Settings → Database → Connection string (URI) |

## Configuração do banco (migrations)

As migrations em `supabase/migrations/` criam o schema completo e as políticas de
RLS. Aplique-as no seu projeto Supabase:

**Opção A — SQL Editor do Supabase (sem Docker):**
Copie o conteúdo de cada arquivo, na ordem (`0001_init.sql`, `0002_rls.sql`,
`0003_auth_sync.sql`), e execute no SQL Editor do painel do Supabase.

**Opção B — Supabase CLI (requer Docker):**
```bash
npx supabase login
npx supabase link --project-ref <seu-project-ref>
npx supabase db push
```

Depois de aplicar as migrations, gere os tipos TypeScript do banco:
```bash
npx supabase gen types typescript --project-id <seu-project-ref> > src/types/database.ts
```

## Executando o seed de demonstração

O seed de demonstração (empresa, usuários por perfil, cursos, trilhas, avaliação,
certificados, metas, PDI) está planejado para a Etapa 9 e ainda não foi
implementado. Veja `PLANO_IMPLEMENTACAO.md` para o status atualizado.

## Como iniciar

```bash
npm run dev
```
Acesse http://localhost:3000.

## Como testar

```bash
npm run test        # (a configurar — testes ainda serão adicionados por etapa)
```

## Build de produção

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

## Estrutura do projeto

Veja a seção "Estrutura de pastas" em [`PLANO_IMPLEMENTACAO.md`](./PLANO_IMPLEMENTACAO.md).

## Perfis de acesso

Veja `src/lib/permissions/index.ts` para a matriz de permissões implementada no
servidor (superadministrador, administrador da empresa, gestor, colaborador).

## Credenciais locais

Ainda não há seed de demonstração — não existem credenciais de teste até a Etapa 9.
Para testar localmente hoje, crie um usuário manualmente no painel de Authentication
do Supabase e um registro correspondente na tabela `profiles` (o trigger
`handle_new_auth_user` cria automaticamente um profile básico ao criar o usuário via
Auth Admin API/painel).

## Limitações atuais

Veja a seção 6 de [`PLANO_IMPLEMENTACAO.md`](./PLANO_IMPLEMENTACAO.md).

## Próximos passos

Etapas 2 a 9 descritas em [`PLANO_IMPLEMENTACAO.md`](./PLANO_IMPLEMENTACAO.md).

## Deploy

O projeto é compatível com Vercel (recomendado para Next.js) ou qualquer host Node.js.
Configure as mesmas variáveis de ambiente de `.env.example` no provedor de deploy.
Não é necessário nenhum passo de build adicional além de `npm run build`.
