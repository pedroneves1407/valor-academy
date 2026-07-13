"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/permissions";
import {
  developmentPlanSchema,
  developmentPlanActionSchema,
  developmentPlanMeetingSchema,
  type DevelopmentPlanInput,
  type DevelopmentPlanActionInput,
  type DevelopmentPlanMeetingInput,
} from "@/lib/validations/pdi";

export async function createDevelopmentPlan(formData: DevelopmentPlanInput) {
  const profile = await requireProfile();
  assertCan(profile.role, "dev_plan:manage");
  const values = developmentPlanSchema.parse(formData);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("development_plans")
    .insert({
      organization_id: profile.organization_id,
      profile_id: values.profile_id,
      manager_id: profile.id,
      period_start: values.period_start,
      period_end: values.period_end,
      career_objective: values.career_objective || null,
      current_competencies: values.current_competencies || null,
      competencies_to_develop: values.competencies_to_develop || null,
      strengths: values.strengths || null,
      improvement_points: values.improvement_points || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) throw new Error("Não foi possível criar o PDI.");
  revalidatePath("/painel/pdi");
  redirect(`/painel/pdi/${data.id}`);
}

export async function updateDevelopmentPlan(id: string, formData: Omit<DevelopmentPlanInput, "profile_id">) {
  const profile = await requireProfile();
  assertCan(profile.role, "dev_plan:manage");
  const values = developmentPlanSchema.omit({ profile_id: true }).parse(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("development_plans")
    .update({
      period_start: values.period_start,
      period_end: values.period_end,
      career_objective: values.career_objective || null,
      current_competencies: values.current_competencies || null,
      competencies_to_develop: values.competencies_to_develop || null,
      strengths: values.strengths || null,
      improvement_points: values.improvement_points || null,
      manager_feedback: values.manager_feedback || null,
    })
    .eq("id", id)
    .eq("manager_id", profile.id);

  if (error) throw new Error("Não foi possível atualizar o PDI.");
  revalidatePath(`/painel/pdi/${id}`);
}

export async function sendForAcceptance(id: string) {
  const profile = await requireProfile();
  assertCan(profile.role, "dev_plan:manage");
  const supabase = await createClient();

  const { error } = await supabase
    .from("development_plans")
    .update({ status: "awaiting_acceptance" })
    .eq("id", id)
    .eq("manager_id", profile.id);

  if (error) throw new Error("Não foi possível enviar o PDI para aceite.");
  revalidatePath(`/painel/pdi/${id}`);
}

export async function acceptDevelopmentPlan(id: string, employeeFeedback: string) {
  const profile = await requireProfile();
  assertCan(profile.role, "dev_plan:respond_own");
  const supabase = await createClient();

  const { error } = await supabase
    .from("development_plans")
    .update({ status: "active", employee_feedback: employeeFeedback || null })
    .eq("id", id)
    .eq("profile_id", profile.id)
    .eq("status", "awaiting_acceptance");

  if (error) throw new Error("Não foi possível aceitar o PDI.");
  revalidatePath(`/painel/pdi/${id}`);
}

export async function requestAdjustments(id: string, employeeFeedback: string) {
  const profile = await requireProfile();
  assertCan(profile.role, "dev_plan:respond_own");
  const supabase = await createClient();

  const { error } = await supabase
    .from("development_plans")
    .update({ status: "draft", employee_feedback: employeeFeedback || null })
    .eq("id", id)
    .eq("profile_id", profile.id)
    .eq("status", "awaiting_acceptance");

  if (error) throw new Error("Não foi possível solicitar ajustes.");
  revalidatePath(`/painel/pdi/${id}`);
}

export async function completeDevelopmentPlan(id: string) {
  const profile = await requireProfile();
  assertCan(profile.role, "dev_plan:manage");
  const supabase = await createClient();

  const { error } = await supabase
    .from("development_plans")
    .update({ status: "completed" })
    .eq("id", id)
    .eq("manager_id", profile.id);

  if (error) throw new Error("Não foi possível concluir o PDI.");
  revalidatePath(`/painel/pdi/${id}`);
}

export async function addDevelopmentPlanAction(planId: string, formData: DevelopmentPlanActionInput) {
  const profile = await requireProfile();
  assertCan(profile.role, "dev_plan:manage");
  const values = developmentPlanActionSchema.parse(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("development_plan_actions").insert({
    development_plan_id: planId,
    description: values.description,
    related_course_id: values.related_course_id || null,
    responsible_id: values.responsible_id || null,
    due_date: values.due_date || null,
    status: "pending",
  });

  if (error) throw new Error("Não foi possível adicionar a ação.");
  revalidatePath(`/painel/pdi/${planId}`);
}

export async function setActionStatus(planId: string, actionId: string, status: "pending" | "in_progress" | "completed") {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("development_plan_actions").update({ status }).eq("id", actionId);
  if (error) throw new Error("Não foi possível atualizar a ação.");
  revalidatePath(`/painel/pdi/${planId}`);
}

export async function addDevelopmentPlanMeeting(planId: string, formData: DevelopmentPlanMeetingInput) {
  const profile = await requireProfile();
  assertCan(profile.role, "dev_plan:manage");
  const values = developmentPlanMeetingSchema.parse(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("development_plan_meetings").insert({
    development_plan_id: planId,
    meeting_date: values.meeting_date,
    notes: values.notes || null,
    created_by: profile.id,
  });

  if (error) throw new Error("Não foi possível registrar a reunião.");
  revalidatePath(`/painel/pdi/${planId}`);
}
