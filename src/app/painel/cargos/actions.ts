"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertOrgPermission } from "@/lib/auth/require-company-admin";
import { jobPositionSchema } from "@/lib/validations/org-structure";

export async function createJobPosition(formData: { name: string; parent_id?: string }) {
  const profile = await assertOrgPermission("org_structure:manage");
  const values = jobPositionSchema.parse({ name: formData.name, department_id: formData.parent_id || null });
  const supabase = await createClient();

  const { error } = await supabase.from("job_positions").insert({
    organization_id: profile.organization_id,
    name: values.name,
    department_id: values.department_id || null,
  });

  if (error) throw new Error("Não foi possível criar o cargo.");
  revalidatePath("/painel/cargos");
}

export async function updateJobPosition(id: string, formData: { name: string; parent_id?: string }) {
  await assertOrgPermission("org_structure:manage");
  const values = jobPositionSchema.parse({ name: formData.name, department_id: formData.parent_id || null });
  const supabase = await createClient();

  const { error } = await supabase
    .from("job_positions")
    .update({ name: values.name, department_id: values.department_id || null })
    .eq("id", id);

  if (error) throw new Error("Não foi possível atualizar o cargo.");
  revalidatePath("/painel/cargos");
}

export async function deleteJobPosition(id: string) {
  await assertOrgPermission("org_structure:manage");
  const supabase = await createClient();

  const { error } = await supabase
    .from("job_positions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error("Não foi possível remover o cargo.");
  revalidatePath("/painel/cargos");
}
