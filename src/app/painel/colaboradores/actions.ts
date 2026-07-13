"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertOrgPermission } from "@/lib/auth/require-company-admin";
import { inviteCollaboratorSchema, type InviteCollaboratorInput } from "@/lib/validations/org-structure";
import type { AppRole } from "@/types/database";

export async function inviteCollaborator(formData: InviteCollaboratorInput) {
  const profile = await assertOrgPermission("user:manage");
  const values = inviteCollaboratorSchema.parse(formData);
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("email", values.email)
    .maybeSingle();

  if (existing) throw new Error("Já existe um colaborador com este e-mail nesta empresa.");

  const { error } = await admin.auth.admin.inviteUserByEmail(values.email, {
    data: { first_name: values.first_name, last_name: values.last_name },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha`,
  });

  if (error) throw new Error("Não foi possível convidar o colaborador.");

  // handle_new_auth_user já criou o profile básico; complementamos com os dados do formulário.
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      organization_id: profile.organization_id,
      first_name: values.first_name,
      last_name: values.last_name,
      role: values.role,
      registration_number: values.registration_number || null,
      job_position_id: values.job_position_id || null,
      department_id: values.department_id || null,
      unit_id: values.unit_id || null,
      manager_id: values.manager_id || null,
    })
    .eq("email", values.email);

  if (updateError) throw new Error("Convite enviado, mas houve erro ao salvar os dados do colaborador.");

  revalidatePath("/painel/colaboradores");
}

export async function updateCollaborator(
  id: string,
  formData: Omit<InviteCollaboratorInput, "email">,
) {
  const profile = await assertOrgPermission("user:manage");
  const values = inviteCollaboratorSchema.omit({ email: true }).parse(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: values.first_name,
      last_name: values.last_name,
      role: values.role,
      registration_number: values.registration_number || null,
      job_position_id: values.job_position_id || null,
      department_id: values.department_id || null,
      unit_id: values.unit_id || null,
      manager_id: values.manager_id || null,
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) throw new Error("Não foi possível atualizar o colaborador.");
  revalidatePath("/painel/colaboradores");
}

export async function setCollaboratorStatus(id: string, status: "active" | "inactive") {
  const profile = await assertOrgPermission("user:manage");
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) throw new Error("Não foi possível atualizar o status do colaborador.");
  revalidatePath("/painel/colaboradores");
}

export async function bulkSetCollaboratorStatus(ids: string[], status: "active" | "inactive") {
  const profile = await assertOrgPermission("user:manage");
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .in("id", ids)
    .eq("organization_id", profile.organization_id);

  if (error) throw new Error("Não foi possível atualizar os colaboradores selecionados.");
  revalidatePath("/painel/colaboradores");
}

export async function resendInvite(email: string) {
  await assertOrgPermission("user:manage");
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha`,
  });

  if (error) throw new Error("Não foi possível reenviar o convite.");
}

type ImportRow = {
  first_name: string;
  last_name: string;
  email: string;
  role: AppRole;
  registration_number?: string;
};

export async function importCollaborators(rows: ImportRow[]) {
  const profile = await assertOrgPermission("user:manage");
  const admin = createAdminClient();

  const results: { row: number; email: string; success: boolean; message?: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const parsed = inviteCollaboratorSchema
        .pick({ first_name: true, last_name: true, email: true, role: true })
        .parse({ ...row, role: row.role || "collaborator" });

      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("organization_id", profile.organization_id)
        .eq("email", parsed.email)
        .maybeSingle();

      if (existing) {
        results.push({ row: i + 1, email: row.email, success: false, message: "E-mail já cadastrado." });
        continue;
      }

      const { error } = await admin.auth.admin.inviteUserByEmail(parsed.email, {
        data: { first_name: parsed.first_name, last_name: parsed.last_name },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha`,
      });

      if (error) {
        results.push({ row: i + 1, email: row.email, success: false, message: "Falha ao enviar convite." });
        continue;
      }

      await admin
        .from("profiles")
        .update({
          organization_id: profile.organization_id,
          first_name: parsed.first_name,
          last_name: parsed.last_name,
          role: parsed.role,
          registration_number: row.registration_number || null,
        })
        .eq("email", parsed.email);

      results.push({ row: i + 1, email: row.email, success: true });
    } catch {
      results.push({ row: i + 1, email: row.email, success: false, message: "Dados inválidos na linha." });
    }
  }

  revalidatePath("/painel/colaboradores");
  return results;
}
