import "server-only";
import type { AppRole } from "@/types/database";

/**
 * Ações reconhecidas pelo sistema. Toda rota/server action sensível deve
 * chamar `can()` com o perfil autenticado antes de executar — nunca confiar
 * em uma verificação equivalente feita apenas no cliente.
 */
export type Action =
  | "organization:manage" // superadmin: CRUD de empresas, planos
  | "org_settings:manage" // company_admin: configurações da própria empresa
  | "user:manage" // criar/editar/desativar colaboradores e gestores
  | "org_structure:manage" // unidades, departamentos, cargos, equipes
  | "course:manage" // criar/editar/publicar cursos, módulos, aulas
  | "assessment:manage" // criar provas, corrigir discursivas
  | "assessment:take" // realizar prova
  | "certificate:issue" // emissão de certificado (sempre validada no servidor)
  | "goal:manage_own_team" // gestor cria/acompanha metas da equipe
  | "goal:manage_all" // admin gerencia metas da empresa
  | "goal:update_own" // colaborador atualiza o progresso das próprias metas
  | "dev_plan:manage" // gestor cria/edita PDI da equipe
  | "dev_plan:respond_own" // colaborador aceita/solicita ajuste no próprio PDI
  | "announcement:manage" // criar comunicados
  | "report:view_team" // gestor vê relatórios da equipe
  | "report:view_organization"; // admin vê relatórios da empresa inteira

const ROLE_ACTIONS: Record<AppRole, Action[]> = {
  superadmin: ["organization:manage"],
  company_admin: [
    "org_settings:manage",
    "user:manage",
    "org_structure:manage",
    "course:manage",
    "assessment:manage",
    "assessment:take",
    "certificate:issue",
    "goal:manage_all",
    "dev_plan:manage",
    "dev_plan:respond_own",
    "announcement:manage",
    "report:view_organization",
  ],
  manager: [
    "assessment:take",
    "goal:manage_own_team",
    "goal:update_own",
    "dev_plan:manage",
    "dev_plan:respond_own",
    "report:view_team",
  ],
  collaborator: ["assessment:take", "goal:update_own", "dev_plan:respond_own"],
};

export function can(role: AppRole, action: Action): boolean {
  return ROLE_ACTIONS[role]?.includes(action) ?? false;
}

export class ForbiddenError extends Error {
  constructor(message = "Acesso negado.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertCan(role: AppRole, action: Action): void {
  if (!can(role, action)) {
    throw new ForbiddenError(`Perfil "${role}" não tem permissão para "${action}".`);
  }
}
