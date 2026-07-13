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

### Etapa 2 — Estrutura organizacional ✅ CONCLUÍDA
- CRUD de unidades, departamentos, cargos e equipes (`src/app/painel/{unidades,
  departamentos,cargos,equipes}`), com componente compartilhado
  `SimpleEntityManager` (formulário + tabela + exclusão lógica).
- Colaboradores (`src/app/painel/colaboradores`): tabela com busca, filtros
  (status/perfil), paginação, seleção em lote (ativar/desativar em massa), edição,
  ativação/desativação individual.
- Convite por e-mail via `supabase.auth.admin.inviteUserByEmail` (Supabase Auth cria
  o usuário e envia o e-mail; o trigger `handle_new_auth_user` cria o profile básico,
  complementado pelos dados do formulário).
- Reenvio de convite para usuários com status "convite pendente".
- Importação por CSV (papaparse): prévia da planilha, validação linha a linha,
  erro por linha exibido na prévia, modelo de planilha para download, prevenção de
  duplicidade por e-mail dentro da mesma empresa.
- Exportação CSV da lista filtrada.
- Toda mutação passa por `assertOrgPermission`/`requireOrgPermission`
  (`src/lib/auth/require-company-admin.ts`) — nunca decidida só no cliente — e por
  RLS no banco (isolamento por `organization_id`).
- Build, lint e typecheck limpos. Verificado no navegador que `/painel/colaboradores`
  redireciona para `/login` sem sessão (proteção de rota funcionando); fluxos de
  dados reais (criar/convidar/importar) ainda não testados ponta a ponta por falta
  das credenciais do Supabase.

**Nota técnica:** o tipo `Database` (`src/types/database.ts`) ainda é um placeholder
genérico com `Row/Insert/Update: any` — suficiente para compilar, mas sem
autocomplete/checagem de campos reais. Deve ser substituído por
`npx supabase gen types typescript` assim que houver um projeto Supabase real
conectado (ver pendência da Etapa 1).

### Etapa 3 — Cursos ✅ CONCLUÍDA
- CRUD de cursos (`src/app/painel/cursos`): criação rápida (título + nível) seguida
  de edição completa (descrições, instrutor, carga horária, nível, prazo, nota
  mínima, tentativas máximas, certificado habilitado, obrigatoriedade, público-alvo,
  tags), publicar/despublicar/arquivar/duplicar (com módulos e aulas)/remover
  (exclusão lógica). Visualização em cards e em tabela, com busca e filtro de status.
- Módulos e aulas (`src/app/painel/cursos/[id]`): CRUD completo, 8 tipos de aula
  (vídeo, texto, PDF, arquivo, link externo, atividade, questionário rápido, aula ao
  vivo), reordenação por botões subir/descer (drag-and-drop avaliado e descartado
  para o MVP — ver nota abaixo), duração, obrigatoriedade e percentual mínimo
  assistido configuráveis por aula.
- Atribuição de curso a colaboradores individuais (`enrollments`), com lista de
  matrículas e progresso por colaborador.
- Player do aluno (`src/app/painel/meus-cursos/[courseId]`): sidebar com módulos e
  aulas (bloqueada/disponível/concluída), vídeo com relato periódico de progresso a
  cada 5s, texto, download de PDF/arquivo, link externo, atividades/questionário/aula
  ao vivo com conclusão manual, anotações pessoais (salvas no `localStorage` do
  navegador — ver limitação), navegação anterior/próxima, retomar do ponto assistido.
- **Sequência obrigatória validada no servidor** (`src/lib/courses/sequence.ts` +
  `src/app/painel/meus-cursos/[courseId]/actions.ts`): uma aula só é considerada
  disponível se todas as aulas obrigatórias anteriores (no módulo atual e em módulos
  anteriores) estiverem concluídas. O cálculo é refeito no servidor a cada ação
  (`markLessonComplete`) e ao carregar a página — uma tentativa de acessar
  `?aula=<id>` de uma aula bloqueada é redirecionada no servidor para a primeira aula
  disponível, não apenas escondida na UI.
- Vídeo só é marcado como concluído quando o percentual assistido reportado
  (`updateVideoProgress`) atinge o mínimo configurado por aula — abrir o vídeo sem
  assisti-lo não conclui a aula.
- Progresso do curso (`course_progress`) recalculado a cada aula concluída;
  `enrollments.status` atualizado para `completed` quando 100% das aulas concluídas.
- Build, lint e typecheck limpos; verificado no navegador que as rotas do player e
  de gestão de cursos redirecionam para `/login` sem sessão, sem erro de servidor.

**Limitações desta etapa (documentadas conforme item 12 do escopo original):**
- Conclusão de vídeo depende do percentual de reprodução relatado pelo próprio
  navegador ao servidor a cada 5 segundos; não há DRM. Um usuário determinado a
  manipular requisições de rede ainda pode falsificar esse relato. Mitigado por
  validar no servidor (nunca no cliente) se o percentual mínimo foi atingido antes
  de permitir `markLessonComplete`, mas a proteção não é absoluta — consistente com
  a orientação de documentar limitações quando a proteção total não é possível no
  navegador.
- Reordenação de módulos/aulas usa botões subir/descer em vez de arrastar-e-soltar;
  funcionalmente equivalente, mais simples e mais acessível por teclado.
- Anotações pessoais são salvas apenas no `localStorage` do navegador (não há tabela
  de anotações no schema atual) — não sincronizam entre dispositivos.
- Upload de vídeo/arquivo ainda não está implementado (aulas armazenam uma URL
  informada manualmente); a arquitetura permanece aberta para trocar por upload real
  ao Supabase Storage ou um provedor de streaming (Mux/Cloudflare Stream) sem
  mudança de schema.

### Etapa 4 — Avaliações ✅ CONCLUÍDA
- CRUD de avaliações vinculadas a um curso (`src/app/painel/avaliacoes`): tempo
  limite, nota mínima, tentativas máximas, embaralhar perguntas/alternativas, exibir
  feedback/gabarito, período de disponibilidade.
- Banco de questões (`src/app/painel/avaliacoes/[id]`): 5 tipos (múltipla escolha
  única, verdadeiro/falso, múltiplas respostas, resposta curta, discursiva), pontos
  por questão, alternativas com marcação de correta.
- Rota `/painel/avaliacoes` bifurca por perfil no mesmo caminho: administrador vê
  gestão (criar avaliação/questões/corrigir); colaborador vê as avaliações dos seus
  cursos atribuídos com tentativas usadas e último resultado.
- Fluxo de tentativa (`src/app/painel/avaliacoes/[id]/responder`): tela de início
  mostra tempo limite e tentativas restantes; `startAttempt` valida no servidor (não
  apenas na UI) que todas as aulas obrigatórias do curso foram concluídas, que a
  avaliação está dentro do período de disponibilidade e que não excedeu o limite de
  tentativas, antes de criar a tentativa. Perguntas/alternativas embaralhadas de
  forma determinística (semente = id da tentativa) para manter a mesma ordem em
  recarregamentos da página. Cronômetro no cliente envia automaticamente ao zerar.
- Correção automática de questões objetivas (`submitAttempt`, comparação de
  alternativas selecionadas vs. corretas); resposta curta e discursiva ficam com
  status "aguardando correção" até um administrador avaliar
  (`gradeEssayAnswer`), recalculando a nota final da tentativa quando todas as
  questões pendentes forem corrigidas.
- Página de resultado (`resultado/[attemptId]`, aceita `attemptId=latest`) mostra
  aprovação/reprovação, nota, feedback por questão e gabarito conforme configurado
  na avaliação.
- Toda regra de negócio (liberação da prova, limite de tentativas, cálculo de nota,
  status aguardando correção) é decidida em server actions, nunca confiada ao
  cliente; RLS reforça o isolamento por empresa.
- Build, lint e typecheck limpos; verificado no navegador que `/painel/avaliacoes`
  redireciona para `/login` sem sessão, sem erro de servidor.

### Etapa 5 — Certificados ✅ CONCLUÍDA
- Emissão automática (`src/lib/certificates/issue.ts`, `issueCertificateIfEligible`):
  chamada no servidor sempre que progresso de curso muda (conclusão de aula) ou uma
  tentativa de avaliação é aprovada (automática ou por correção manual). Só emite se
  progresso = 100%, todas as avaliações do curso aprovadas (quando existirem),
  `certificate_enabled` do curso e ainda não existir certificado para aquele
  colaborador+curso — nunca confia em uma chamada vinda do cliente.
- Código de validação único (`VA-<ano>-<hash>`).
- Geração de PDF sob demanda (`src/app/api/certificados/[id]/pdf/route.ts`, pdfkit):
  nome do colaborador, curso, carga horária, data de emissão (`dd/MM/yyyy`), nome da
  empresa, QR Code (gerado com `qrcode`) apontando para a validação pública, código
  de validação, linha de assinatura do responsável. Acesso restrito ao próprio
  colaborador ou a administradores da mesma empresa.
- Página pública de validação (`/certificados/validar`, criada na Etapa 1) consome o
  mesmo `validation_code`; verificado no navegador que um código inexistente exibe
  "Certificado não encontrado ou inválido" sem expor dados de outros certificados.
- Lista de certificados (`src/app/painel/certificados`): colaborador vê os próprios;
  administrador vê todos os certificados da empresa, com download do PDF e link para
  a validação pública.
- Build, lint e typecheck limpos; verificado no navegador (rota protegida redireciona
  sem sessão; validação pública responde corretamente sem autenticação).

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
