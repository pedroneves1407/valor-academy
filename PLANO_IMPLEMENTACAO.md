# Plano de implementação — Valor Academy

## 1. Visão geral

Plataforma SaaS B2B multiempresa para treinamentos corporativos: cursos, trilhas,
avaliações, certificados, metas, PDI, relatórios, comunicados e gamificação. Todo o
sistema é em português do Brasil (pt-BR), com fuso horário padrão `America/Belem`,
datas `dd/MM/yyyy` e moeda `R$`.

Este arquivo é atualizado a cada etapa concluída. Não é um documento estático.

## 2. Arquitetura escolhida

- **Next.js 16 (App Router) + TypeScript (modo estrito) + React 19**
- **Tailwind CSS v4** (CSS-first, `@theme` em `src/app/globals.css`)
- **shadcn/ui** com base **Radix** (não "Base UI" — ver nota abaixo) + Lucide Icons
- **React Hook Form + Zod** para formulários e validação
- **TanStack Table** para tabelas de dados
- **Recharts** para gráficos
- **date-fns** com localização `pt-BR`
- **Supabase** (Postgres + Auth + Storage) como banco, autenticação e armazenamento,
  com **Row Level Security (RLS)** garantindo isolamento multiempresa
- **pdfkit** para geração de certificados em PDF
- **qrcode** para QR Code de validação de certificado
- **Vitest** + **Testing Library** para testes

**Nota técnica:** o CLI do shadcn/ui inicializou por padrão com a biblioteca "Base UI"
(`@base-ui/react`), que usa a prop `render` em vez de `asChild`. Como todo o restante
do ecossistema (documentação, exemplos, convenções do time) usa `asChild` (API Radix),
o projeto foi reinicializado explicitamente com `-b radix`. Todos os componentes em
`src/components/ui/` são Radix.

**Nota de ambiente:** o ambiente de desenvolvimento usado para gerar este projeto não
tem Docker nem Homebrew disponíveis, portanto não é possível rodar o Supabase local via
CLI. O projeto usa uma instância hospedada gratuita do Supabase (supabase.com). As
migrations em `supabase/migrations/` são aplicadas manualmente via SQL Editor do
Supabase (ou `supabase db push` caso o desenvolvedor tenha Docker disponível).

## 3. Estrutura de pastas

```
valor-academy/
├── src/
│   ├── app/                     # rotas (App Router)
│   │   ├── page.tsx              # home institucional pública
│   │   ├── login/
│   │   ├── esqueci-senha/
│   │   ├── redefinir-senha/
│   │   ├── acesso-negado/
│   │   ├── termos/
│   │   ├── privacidade/
│   │   ├── certificados/validar/ # validação pública de certificado
│   │   ├── not-found.tsx
│   │   └── painel/               # área autenticada (layout com sidebar/navbar)
│   │       ├── layout.tsx
│   │       └── page.tsx          # dashboard (por enquanto genérico, ver etapa 7)
│   ├── components/
│   │   ├── ui/                   # componentes shadcn/ui (Radix)
│   │   ├── layout/                # Sidebar, Navbar, MobileNav
│   │   └── theme-provider.tsx
│   ├── lib/
│   │   ├── supabase/              # client.ts, server.ts, admin.ts, middleware.ts
│   │   ├── auth/                  # current-profile.ts, actions.ts
│   │   ├── permissions/           # RBAC server-side (can/assertCan)
│   │   ├── validations/           # schemas Zod
│   │   └── navigation.ts          # mapa de navegação por perfil
│   ├── types/
│   │   ├── database.ts            # tipos do Supabase (placeholder até gerar via CLI)
│   │   └── domain.ts              # Profile, Organization
│   └── proxy.ts                   # middleware de sessão/autenticação (Next.js 16)
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql          # schema completo
│   │   ├── 0002_rls.sql           # políticas RLS multiempresa
│   │   └── 0003_auth_sync.sql     # sincronização profiles → JWT claims
│   └── seed/                      # seed de demonstração (etapa 9)
├── tests/
│   ├── unit/
│   └── e2e/
└── docs/
```

## 4. Entidades do banco (implementadas em `supabase/migrations/0001_init.sql`)

Multiempresa: `organizations`, `organization_settings`, `subscriptions`, `plans`.
Pessoas: `profiles` (espelha `auth.users`), `units`, `departments`, `job_positions`,
`teams`, `team_members`.
Cursos: `course_categories`, `courses`, `course_prerequisites`, `course_modules`,
`lessons`, `lesson_materials`, `learning_paths`, `learning_path_courses`.
Progresso: `enrollments`, `course_progress`, `lesson_progress`, `video_progress`.
Avaliações: `assessments`, `questions`, `question_options`, `assessment_attempts`,
`attempt_answers`.
Certificados: `certificates`.
Metas: `goals`, `goal_updates`.
PDI: `development_plans`, `development_plan_actions`, `development_plan_meetings`.
Comunicação: `announcements`, `announcement_reads`, `notifications`.
Gamificação: `achievements`, `user_achievements`, `points_transactions`.
Auditoria/arquivos: `audit_logs`, `files`.

Isolamento multiempresa: toda tabela de negócio tem `organization_id` (direto ou via
join) e RLS habilitada (`supabase/migrations/0002_rls.sql`). Um superadmin
(`profiles.role = 'superadmin'`, `organization_id` nulo) tem acesso irrestrito para
suporte/operação; todos os demais perfis só enxergam a própria organização.

A sincronização de `organization_id`/`role` de `profiles` para os *custom claims* do
JWT (usados pelas políticas RLS via `request.jwt.claims`) é feita por trigger em
`supabase/migrations/0003_auth_sync.sql`.

## 5. Etapas de implementação

### Etapa 1 — Fundação ✅ CONCLUÍDA
- Next.js + TypeScript (estrito) + Tailwind v4 + shadcn/ui (Radix) + Lucide.
- Paleta de marca aplicada via `@theme` (verde `#0F9D58`, azul `#1E3A8A`, textos e
  bordas conforme especificação), modo escuro configurado (padrão claro).
- Cliente Supabase (browser/server/admin) e `proxy.ts` (middleware Next.js 16) para
  sessão e proteção de rotas.
- Schema SQL completo + RLS multiempresa + sincronização de claims.
- Sistema de permissões server-side (`src/lib/permissions`) — nunca decide acesso
  apenas no cliente.
- `getCurrentProfile`/`requireProfile`/`requireRole` para páginas protegidas.
- Layout do painel (sidebar recolhível, navbar, menu mobile) com navegação
  específica por perfil (superadmin, admin, gestor, colaborador).
- Autenticação: login, recuperação de senha, redefinição de senha, logout
  (server action), bloqueio de usuário inativo, redirecionamento por perfil.
- Páginas públicas mínimas: home institucional, termos, privacidade, validação
  pública de certificado (consulta real ao banco via service role), 404,
  acesso negado.
- Lint, typecheck e build de produção passando sem erros.
- Verificado visualmente no navegador (desktop e mobile): home, login com validação
  Zod funcionando, redirecionamento de rota protegida.

**Pendências desta etapa:** aplicar as migrations no projeto Supabase real (aguardando
credenciais do usuário) e gerar `src/types/database.ts` a partir do schema real
(`npx supabase gen types typescript`).

### Etapa 2 — Estrutura organizacional ⏳ PENDENTE
CRUD de colaboradores, gestores, departamentos, unidades, cargos, equipes, convite
por e-mail, importação CSV/Excel, ativação/desativação, exportação.

### Etapa 3 — Cursos ⏳ PENDENTE
Cursos, módulos, aulas, upload de materiais, atribuições, player, progresso,
sequência obrigatória validada no servidor, progresso de vídeo.

### Etapa 4 — Avaliações ⏳ PENDENTE
Banco de questões, provas, tentativas, correção manual de discursivas, aprovação.

### Etapa 5 — Certificados ⏳ PENDENTE
Emissão em PDF (pdfkit), QR Code, validação pública (estrutura de página já criada
na Etapa 1, lógica de emissão pendente).

### Etapa 6 — Gestão de pessoas ⏳ PENDENTE
Metas, PDI, feedback, acompanhamento.

### Etapa 7 — Dashboards e relatórios ⏳ PENDENTE
Dashboards reais por perfil (colaborador, gestor, admin, superadmin), filtros,
exportações CSV/Excel.

### Etapa 8 — Comunicação e gamificação ⏳ PENDENTE
Comunicados, notificações in-app, pontos, conquistas, ranking.

### Etapa 9 — Qualidade ⏳ PENDENTE
Testes dos fluxos críticos, seed de demonstração completo, revisão de segurança,
documentação final (README, CONTRIBUTING, SECURITY).

## 6. Limitações conhecidas

- Autenticação social (Google/Microsoft/SSO) não está ativada no MVP; a estrutura do
  Supabase Auth permite habilitar posteriormente sem mudança de arquitetura.
- Sem Docker no ambiente de desenvolvimento usado, o Supabase roda apenas em modo
  hospedado (não local). Um desenvolvedor com Docker pode rodar `supabase start`
  localmente usando as mesmas migrations.
- Streaming de vídeo usa upload direto ao Supabase Storage no MVP; a arquitetura
  do módulo de aulas (Etapa 3) será desenhada para permitir trocar por um provedor
  especializado (Mux, Cloudflare Stream) sem refatoração ampla.
- Conclusão de vídeo é validada no servidor por percentual assistido reportado
  periodicamente pelo cliente; um usuário determinado a manipular requisições de
  rede ainda pode falsificar o progresso reportado — não há DRM. Isso é registrado
  aqui como limitação aceita para o MVP, consistente com a orientação de "documentar
  as limitações" quando a proteção absoluta não é possível no navegador.
