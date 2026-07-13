"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertOrgPermission } from "@/lib/auth/require-company-admin";
import { unitSchema } from "@/lib/validations/org-structure";

export async function createUnit(formData: { name: string; address?: string }) {
  const profile = await assertOrgPermission("org_structure:manage");
  const values = unitSchema.parse(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("units").insert({
    organization_id: profile.organization_id,
    name: values.name,
    address: values.address || null,
  });

  if (error) throw new Error("Não foi possível criar a unidade.");
  revalidatePath("/painel/unidades");
}

export async function updateUnit(id: string, formData: { name: string; address?: string }) {
  await assertOrgPermission("org_structure:manage");
  const values = unitSchema.parse(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("units")
    .update({ name: values.name, address: values.address || null })
    .eq("id", id);

  if (error) throw new Error("Não foi possível atualizar a unidade.");
  revalidatePath("/painel/unidades");
}

export async function deleteUnit(id: string) {
  await assertOrgPermission("org_structure:manage");
  const supabase = await createClient();

  const { error } = await supabase.from("units").update({ deleted_at: new Date().toISOString() }).eq("id", id);

  if (error) throw new Error("Não foi possível remover a unidade.");
  revalidatePath("/painel/unidades");
}
