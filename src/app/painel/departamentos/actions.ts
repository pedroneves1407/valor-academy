"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertOrgPermission } from "@/lib/auth/require-company-admin";
import { departmentSchema } from "@/lib/validations/org-structure";

export async function createDepartment(formData: { name: string; parent_id?: string }) {
  const profile = await assertOrgPermission("org_structure:manage");
  const values = departmentSchema.parse({ name: formData.name, unit_id: formData.parent_id || null });
  const supabase = await createClient();

  const { error } = await supabase.from("departments").insert({
    organization_id: profile.organization_id,
    name: values.name,
    unit_id: values.unit_id || null,
  });

  if (error) throw new Error("Não foi possível criar o departamento.");
  revalidatePath("/painel/departamentos");
}

export async function updateDepartment(id: string, formData: { name: string; parent_id?: string }) {
  await assertOrgPermission("org_structure:manage");
  const values = departmentSchema.parse({ name: formData.name, unit_id: formData.parent_id || null });
  const supabase = await createClient();

  const { error } = await supabase
    .from("departments")
    .update({ name: values.name, unit_id: values.unit_id || null })
    .eq("id", id);

  if (error) throw new Error("Não foi possível atualizar o departamento.");
  revalidatePath("/painel/departamentos");
}

export async function deleteDepartment(id: string) {
  await assertOrgPermission("org_structure:manage");
  const supabase = await createClient();

  const { error } = await supabase
    .from("departments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error("Não foi possível remover o departamento.");
  revalidatePath("/painel/departamentos");
}
