"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertOrgPermission } from "@/lib/auth/require-company-admin";
import { moduleSchema, lessonSchema, type ModuleInput, type LessonInput } from "@/lib/validations/courses";

async function assertCourseInOrg(courseId: string, organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("id").eq("id", courseId).eq("organization_id", organizationId).single();
  if (!data) throw new Error("Curso não encontrado.");
}

export async function createModule(courseId: string, formData: ModuleInput) {
  const profile = await assertOrgPermission("course:manage");
  await assertCourseInOrg(courseId, profile.organization_id);
  const values = moduleSchema.parse(formData);
  const supabase = await createClient();

  const { count } = await supabase
    .from("course_modules")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  const { error } = await supabase.from("course_modules").insert({
    course_id: courseId,
    title: values.title,
    description: values.description || null,
    order_index: count ?? 0,
  });

  if (error) throw new Error("Não foi possível criar o módulo.");
  revalidatePath(`/painel/cursos/${courseId}`);
}

export async function updateModule(courseId: string, moduleId: string, formData: ModuleInput) {
  await assertOrgPermission("course:manage");
  const values = moduleSchema.parse(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("course_modules")
    .update({ title: values.title, description: values.description || null })
    .eq("id", moduleId);

  if (error) throw new Error("Não foi possível atualizar o módulo.");
  revalidatePath(`/painel/cursos/${courseId}`);
}

export async function deleteModule(courseId: string, moduleId: string) {
  await assertOrgPermission("course:manage");
  const supabase = await createClient();

  const { error } = await supabase.from("course_modules").delete().eq("id", moduleId);
  if (error) throw new Error("Não foi possível remover o módulo.");
  revalidatePath(`/painel/cursos/${courseId}`);
}

export async function reorderModule(courseId: string, moduleId: string, direction: "up" | "down") {
  await assertOrgPermission("course:manage");
  const supabase = await createClient();

  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, order_index")
    .eq("course_id", courseId)
    .order("order_index");

  if (!modules) return;
  const index = modules.findIndex((m) => m.id === moduleId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= modules.length) return;

  const a = modules[index];
  const b = modules[swapWith];

  await supabase.from("course_modules").update({ order_index: b.order_index }).eq("id", a.id);
  await supabase.from("course_modules").update({ order_index: a.order_index }).eq("id", b.id);

  revalidatePath(`/painel/cursos/${courseId}`);
}

export async function createLesson(courseId: string, moduleId: string, formData: LessonInput) {
  await assertOrgPermission("course:manage");
  const values = lessonSchema.parse(formData);
  const supabase = await createClient();

  const { count } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);

  const { error } = await supabase.from("lessons").insert({
    module_id: moduleId,
    title: values.title,
    description: values.description || null,
    type: values.type,
    content: values.content || null,
    file_url: values.file_url || null,
    duration_minutes: values.duration_minutes,
    is_mandatory: values.is_mandatory,
    min_watch_percent: values.min_watch_percent,
    order_index: count ?? 0,
  });

  if (error) throw new Error("Não foi possível criar a aula.");
  revalidatePath(`/painel/cursos/${courseId}`);
}

export async function updateLesson(courseId: string, lessonId: string, formData: LessonInput) {
  await assertOrgPermission("course:manage");
  const values = lessonSchema.parse(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("lessons")
    .update({
      title: values.title,
      description: values.description || null,
      type: values.type,
      content: values.content || null,
      file_url: values.file_url || null,
      duration_minutes: values.duration_minutes,
      is_mandatory: values.is_mandatory,
      min_watch_percent: values.min_watch_percent,
    })
    .eq("id", lessonId);

  if (error) throw new Error("Não foi possível atualizar a aula.");
  revalidatePath(`/painel/cursos/${courseId}`);
}

export async function deleteLesson(courseId: string, lessonId: string) {
  await assertOrgPermission("course:manage");
  const supabase = await createClient();

  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw new Error("Não foi possível remover a aula.");
  revalidatePath(`/painel/cursos/${courseId}`);
}

export async function reorderLesson(courseId: string, moduleId: string, lessonId: string, direction: "up" | "down") {
  await assertOrgPermission("course:manage");
  const supabase = await createClient();

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, order_index")
    .eq("module_id", moduleId)
    .order("order_index");

  if (!lessons) return;
  const index = lessons.findIndex((l) => l.id === lessonId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= lessons.length) return;

  const a = lessons[index];
  const b = lessons[swapWith];

  await supabase.from("lessons").update({ order_index: b.order_index }).eq("id", a.id);
  await supabase.from("lessons").update({ order_index: a.order_index }).eq("id", b.id);

  revalidatePath(`/painel/cursos/${courseId}`);
}

export async function enrollProfiles(courseId: string, profileIds: string[]) {
  const profile = await assertOrgPermission("course:manage");
  const supabase = await createClient();

  const rows = profileIds.map((profileId) => ({
    organization_id: profile.organization_id,
    profile_id: profileId,
    course_id: courseId,
    assigned_by: profile.id,
    status: "not_started" as const,
  }));

  const { error } = await supabase.from("enrollments").upsert(rows, { onConflict: "profile_id,course_id", ignoreDuplicates: true });
  if (error) throw new Error("Não foi possível atribuir o curso aos colaboradores selecionados.");
  revalidatePath(`/painel/cursos/${courseId}`);
}

export async function unenrollProfile(courseId: string, enrollmentId: string) {
  await assertOrgPermission("course:manage");
  const supabase = await createClient();

  const { error } = await supabase.from("enrollments").delete().eq("id", enrollmentId);
  if (error) throw new Error("Não foi possível remover a atribuição.");
  revalidatePath(`/painel/cursos/${courseId}`);
}
