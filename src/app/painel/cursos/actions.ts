"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertOrgPermission } from "@/lib/auth/require-company-admin";
import { courseSchema, type CourseInput } from "@/lib/validations/courses";

function toTagsArray(tags?: string) {
  return (tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createCourse(formData: CourseInput) {
  const profile = await assertOrgPermission("course:manage");
  const values = courseSchema.parse(formData);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .insert({
      organization_id: profile.organization_id,
      title: values.title,
      short_description: values.short_description || null,
      full_description: values.full_description || null,
      cover_image_url: values.cover_image_url || null,
      category_id: values.category_id || null,
      instructor_name: values.instructor_name || null,
      workload_hours: values.workload_hours ?? 0,
      level: values.level,
      due_date: values.due_date || null,
      passing_score: values.passing_score,
      max_attempts: values.max_attempts,
      certificate_enabled: values.certificate_enabled,
      is_mandatory: values.is_mandatory,
      target_audience: values.target_audience || null,
      tags: toTagsArray(values.tags),
      status: "draft",
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error("Não foi possível criar o curso.");
  revalidatePath("/painel/cursos");
  redirect(`/painel/cursos/${data.id}`);
}

export async function updateCourse(id: string, formData: CourseInput) {
  const profile = await assertOrgPermission("course:manage");
  const values = courseSchema.parse(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("courses")
    .update({
      title: values.title,
      short_description: values.short_description || null,
      full_description: values.full_description || null,
      cover_image_url: values.cover_image_url || null,
      category_id: values.category_id || null,
      instructor_name: values.instructor_name || null,
      workload_hours: values.workload_hours ?? 0,
      level: values.level,
      due_date: values.due_date || null,
      passing_score: values.passing_score,
      max_attempts: values.max_attempts,
      certificate_enabled: values.certificate_enabled,
      is_mandatory: values.is_mandatory,
      target_audience: values.target_audience || null,
      tags: toTagsArray(values.tags),
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) throw new Error("Não foi possível atualizar o curso.");
  revalidatePath(`/painel/cursos/${id}`);
  revalidatePath("/painel/cursos");
}

export async function setCourseStatus(id: string, status: "draft" | "published" | "archived") {
  const profile = await assertOrgPermission("course:manage");
  const supabase = await createClient();

  const { error } = await supabase
    .from("courses")
    .update({ status })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) throw new Error("Não foi possível alterar o status do curso.");
  revalidatePath("/painel/cursos");
  revalidatePath(`/painel/cursos/${id}`);
}

export async function duplicateCourse(id: string) {
  const profile = await assertOrgPermission("course:manage");
  const supabase = await createClient();

  const { data: original } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single();

  if (!original) throw new Error("Curso não encontrado.");

  const clone = { ...original };
  delete clone.id;
  clone.title = `${original.title} (cópia)`;
  clone.status = "draft";
  clone.created_by = profile.id;

  const { data: created, error } = await supabase.from("courses").insert(clone).select("id").single();
  if (error || !created) throw new Error("Não foi possível duplicar o curso.");

  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, title, description, order_index")
    .eq("course_id", id)
    .order("order_index");

  for (const mod of modules ?? []) {
    const { data: newModule } = await supabase
      .from("course_modules")
      .insert({ course_id: created.id, title: mod.title, description: mod.description, order_index: mod.order_index })
      .select("id")
      .single();

    if (!newModule) continue;

    const { data: lessons } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", mod.id)
      .order("order_index");

    for (const lesson of lessons ?? []) {
      const lessonClone = { ...lesson };
      delete lessonClone.id;
      lessonClone.module_id = newModule.id;
      await supabase.from("lessons").insert(lessonClone);
    }
  }

  revalidatePath("/painel/cursos");
  return created.id as string;
}

export async function deleteCourse(id: string) {
  const profile = await assertOrgPermission("course:manage");
  const supabase = await createClient();

  const { error } = await supabase
    .from("courses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) throw new Error("Não foi possível remover o curso.");
  revalidatePath("/painel/cursos");
}
