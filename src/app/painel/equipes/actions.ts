"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertOrgPermission } from "@/lib/auth/require-company-admin";
import { teamSchema } from "@/lib/validations/org-structure";

export async function createTeam(formData: { name: string; parent_id?: string }) {
  const profile = await assertOrgPermission("org_structure:manage");
  const values = teamSchema.parse({ name: formData.name, manager_id: formData.parent_id || null });
  const supabase = await createClient();

  const { error } = await supabase.from("teams").insert({
    organization_id: profile.organization_id,
    name: values.name,
    manager_id: values.manager_id || null,
  });

  if (error) throw new Error("Não foi possível criar a equipe.");
  revalidatePath("/painel/equipes");
}

export async function updateTeam(id: string, formData: { name: string; parent_id?: string }) {
  await assertOrgPermission("org_structure:manage");
  const values = teamSchema.parse({ name: formData.name, manager_id: formData.parent_id || null });
  const supabase = await createClient();

  const { error } = await supabase
    .from("teams")
    .update({ name: values.name, manager_id: values.manager_id || null })
    .eq("id", id);

  if (error) throw new Error("Não foi possível atualizar a equipe.");
  revalidatePath("/painel/equipes");
}

export async function deleteTeam(id: string) {
  await assertOrgPermission("org_structure:manage");
  const supabase = await createClient();

  const { error } = await supabase.from("teams").update({ deleted_at: new Date().toISOString() }).eq("id", id);

  if (error) throw new Error("Não foi possível remover a equipe.");
  revalidatePath("/painel/equipes");
}

export async function setTeamMembers(teamId: string, profileIds: string[]) {
  const profile = await assertOrgPermission("org_structure:manage");
  const supabase = await createClient();

  await supabase.from("team_members").delete().eq("team_id", teamId);

  if (profileIds.length > 0) {
    const { error } = await supabase
      .from("team_members")
      .insert(profileIds.map((profileId) => ({ team_id: teamId, profile_id: profileId })));
    if (error) throw new Error("Não foi possível salvar os membros da equipe.");
  }

  revalidatePath("/painel/equipes");
  return profile.organization_id;
}
