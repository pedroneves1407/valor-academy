"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertOrgPermission } from "@/lib/auth/require-company-admin";
import { assessmentSchema, type AssessmentInput } from "@/lib/validations/assessments";

export async function createAssessment(formData: AssessmentInput) {
  const profile = await assertOrgPermission("assessment:manage");
  const values = assessmentSchema.parse(formData);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assessments")
    .insert({
      organization_id: profile.organization_id,
      course_id: values.course_id,
      module_id: values.module_id || null,
      title: values.title,
      description: values.description || null,
      time_limit_minutes: values.time_limit_minutes || null,
      passing_score: values.passing_score,
      max_attempts: values.max_attempts,
      shuffle_questions: values.shuffle_questions,
      shuffle_options: values.shuffle_options,
      show_feedback: values.show_feedback,
      show_answer_key: values.show_answer_key,
      available_from: values.available_from || null,
      available_until: values.available_until || null,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error("Não foi possível criar a avaliação.");
  revalidatePath("/painel/avaliacoes");
  redirect(`/painel/avaliacoes/${data.id}`);
}

export async function updateAssessment(id: string, formData: AssessmentInput) {
  const profile = await assertOrgPermission("assessment:manage");
  const values = assessmentSchema.parse(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("assessments")
    .update({
      title: values.title,
      description: values.description || null,
      course_id: values.course_id,
      module_id: values.module_id || null,
      time_limit_minutes: values.time_limit_minutes || null,
      passing_score: values.passing_score,
      max_attempts: values.max_attempts,
      shuffle_questions: values.shuffle_questions,
      shuffle_options: values.shuffle_options,
      show_feedback: values.show_feedback,
      show_answer_key: values.show_answer_key,
      available_from: values.available_from || null,
      available_until: values.available_until || null,
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) throw new Error("Não foi possível atualizar a avaliação.");
  revalidatePath(`/painel/avaliacoes/${id}`);
}

export async function deleteAssessment(id: string) {
  const profile = await assertOrgPermission("assessment:manage");
  const supabase = await createClient();

  const { error } = await supabase.from("assessments").delete().eq("id", id).eq("organization_id", profile.organization_id);
  if (error) throw new Error("Não foi possível remover a avaliação.");
  revalidatePath("/painel/avaliacoes");
}
