"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { goalSchema, goalUpdateSchema, type GoalInput, type GoalUpdateInput } from "@/lib/validations/goals";

function computeStatus(currentValue: number, targetValue: number, dueDate: string, currentStatus: string) {
  if (currentStatus === "cancelled") return currentStatus;
  const progress = targetValue !== 0 ? currentValue / targetValue : 0;
  if (progress >= 1) return "completed";
  const isOverdue = new Date(dueDate) < new Date();
  if (isOverdue) return "overdue";
  const daysLeft = (new Date(dueDate).getTime() - Date.now()) / 86_400_000;
  if (progress < 0.5 && daysLeft < 7) return "at_risk";
  if (currentValue > 0) return "in_progress";
  return "not_started";
}

export async function createGoal(formData: GoalInput) {
  const profile = await requireProfile();
  if (!can(profile.role, "goal:manage_own_team") && !can(profile.role, "goal:manage_all")) {
    throw new Error("Você não tem permissão para criar metas.");
  }
  const values = goalSchema.parse(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("goals").insert({
    organization_id: profile.organization_id,
    title: values.title,
    description: values.description || null,
    type: values.type,
    owner_id: values.owner_id,
    created_by: profile.id,
    team_id: values.team_id || null,
    start_date: values.start_date,
    due_date: values.due_date,
    initial_value: values.initial_value,
    current_value: values.initial_value,
    target_value: values.target_value,
    unit_label: values.unit_label || null,
    weight: values.weight,
    priority: values.priority,
    status: "not_started",
  });

  if (error) throw new Error("Não foi possível criar a meta.");
  revalidatePath("/painel/metas");
}

export async function updateGoal(id: string, formData: GoalInput) {
  const profile = await requireProfile();
  if (!can(profile.role, "goal:manage_own_team") && !can(profile.role, "goal:manage_all")) {
    throw new Error("Você não tem permissão para editar metas.");
  }
  const values = goalSchema.parse(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("goals")
    .update({
      title: values.title,
      description: values.description || null,
      type: values.type,
      owner_id: values.owner_id,
      team_id: values.team_id || null,
      start_date: values.start_date,
      due_date: values.due_date,
      target_value: values.target_value,
      unit_label: values.unit_label || null,
      weight: values.weight,
      priority: values.priority,
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) throw new Error("Não foi possível atualizar a meta.");
  revalidatePath("/painel/metas");
}

export async function deleteGoal(id: string) {
  const profile = await requireProfile();
  if (!can(profile.role, "goal:manage_own_team") && !can(profile.role, "goal:manage_all")) {
    throw new Error("Você não tem permissão para remover metas.");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id).eq("organization_id", profile.organization_id);
  if (error) throw new Error("Não foi possível remover a meta.");
  revalidatePath("/painel/metas");
}

export async function addGoalUpdate(goalId: string, formData: GoalUpdateInput) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const values = goalUpdateSchema.parse(formData);

  const { data: goal } = await supabase
    .from("goals")
    .select("id, owner_id, current_value, target_value, due_date, status, organization_id")
    .eq("id", goalId)
    .single();

  if (!goal) throw new Error("Meta não encontrada.");

  const isOwner = goal.owner_id === profile.id;
  const isManagerOrAdmin = can(profile.role, "goal:manage_own_team") || can(profile.role, "goal:manage_all");
  if (!isOwner && !isManagerOrAdmin) throw new Error("Você não tem permissão para atualizar esta meta.");

  await supabase.from("goal_updates").insert({
    goal_id: goalId,
    updated_by: profile.id,
    previous_value: goal.current_value,
    new_value: values.new_value,
    comment: values.comment || null,
    evidence_url: values.evidence_url || null,
  });

  const newStatus = computeStatus(values.new_value, goal.target_value, goal.due_date, goal.status);

  const { error } = await supabase
    .from("goals")
    .update({ current_value: values.new_value, status: newStatus })
    .eq("id", goalId);

  if (error) throw new Error("Não foi possível atualizar o progresso da meta.");
  revalidatePath("/painel/metas");
}

export async function setGoalStatus(id: string, status: "cancelled" | "in_progress") {
  const profile = await requireProfile();
  if (!can(profile.role, "goal:manage_own_team") && !can(profile.role, "goal:manage_all")) {
    throw new Error("Você não tem permissão para alterar o status desta meta.");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("goals").update({ status }).eq("id", id).eq("organization_id", profile.organization_id);
  if (error) throw new Error("Não foi possível alterar o status da meta.");
  revalidatePath("/painel/metas");
}
