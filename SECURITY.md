# Política de segurança — Valor Academy

## Princípios

- **Isolamento multiempresa** é garantido no banco de dados via Row Level Security
  (Postgres/Supabase), não apenas por filtros de aplicação. Toda tabela de negócio
  tem `organization_id` e políticas RLS (`supabase/migrations/0002_rls.sql`).
- **Autorização é decidida no servidor.** O frontend nunca é a fonte de verdade sobre
  o que um usuário pode fazer — toda ação sensível passa por `src/lib/permissions`
  e pelas políticas RLS do banco.
- **Segredos nunca chegam ao cliente.** `SUPABASE_SERVICE_ROLE_KEY` só é usada em
  código de servidor (`src/lib/supabase/admin.ts`, marcado com `import "server-only"`).
- **Senhas e credenciais** são geridas inteiramente pelo Supabase Auth — a aplicação
  nunca armazena senhas em texto plano nem em suas próprias tabelas.

## Reportando uma vulnerabilidade

Caso encontre uma vulnerabilidade de segurança neste projeto, não abra uma issue
pública. Descreva o problema em detalhe (passos para reproduzir, impacto potencial)
e envie diretamente aos mantenedores do repositório.

## Limitações conhecidas (MVP)

- Conclusão de aulas em vídeo é validada por percentual assistido reportado pelo
  cliente ao servidor; não há DRM. Um usuário determinado a manipular requisições de
  rede ainda pode falsificar o progresso — mitigado por validação server-side de
  consistência, mas não é uma garantia absoluta. Ver `PLANO_IMPLEMENTACAO.md`, seção 6.
- Autenticação social (Google/Microsoft/SSO) ainda não está habilitada no MVP.
