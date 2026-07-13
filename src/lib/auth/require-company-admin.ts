import "server-only";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/current-profile";
import { can, assertCan, ForbiddenError, type Action } from "@/lib/permissions";
import type { Profile } from "@/types/domain";

/**
 * Garante perfil autenticado, organização definida e permissão da ação. Usado por
 * Server Components de página — em caso de falta de permissão, redireciona para
 * /acesso-negado em vez de estourar um erro 500. A autorização real é reforçada
 * pelas políticas RLS no banco em toda consulta subsequente.
 */
export async function requireOrgPermission(action: Action): Promise<Profile & { organization_id: string }> {
  const profile = await requireProfile();
  if (!can(profile.role, action)) redirect("/acesso-negado");
  if (!profile.organization_id) redirect("/acesso-negado");
  return profile as Profile & { organization_id: string };
}

/**
 * Mesma checagem, mas para uso em server actions (mutações) — lança
 * ForbiddenError em vez de redirecionar, já que uma action não pode navegar.
 */
export async function assertOrgPermission(action: Action): Promise<Profile & { organization_id: string }> {
  const profile = await requireProfile();
  assertCan(profile.role, action);
  if (!profile.organization_id) {
    throw new ForbiddenError("Usuário sem organização associada.");
  }
  return profile as Profile & { organization_id: string };
}
