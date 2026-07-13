import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { PlanDetailClient } from "./plan-detail-client";

export default async function PdiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("development_plans")
    .select("*, profiles!development_plans_profile_id_fkey(first_name,last_name), manager:manager_id(first_name,last_name)")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single();

  if (!plan) notFound();

  const canManage = can(profile.role, "dev_plan:manage") && plan.manager_id === profile.id;
  const isOwner = plan.profile_id === profile.id;
  if (!canManage && !isOwner && profile.role !== "company_admin") notFound();

  const { data: actions } = await supabase
    .from("development_plan_actions")
    .select("id, description, due_date, status, courses(title), responsible:responsible_id(first_name,last_name)")
    .eq("development_plan_id", id)
    .order("created_at");

  const { data: meetings } = await supabase
    .from("development_plan_meetings")
    .select("id, meeting_date, notes")
    .eq("development_plan_id", id)
    .order("meeting_date", { ascending: false });

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .eq("organization_id", profile.organization_id)
    .is("deleted_at", null)
    .order("title");

  type ActionRow = {
    id: string;
    description: string;
    due_date: string | null;
    status: "pending" | "in_progress" | "completed";
    courses: { title: string } | null;
    responsible: { first_name: string; last_name: string } | null;
  };

  return (
    <PlanDetailClient
      plan={{
        id: plan.id,
        status: plan.status,
        period_start: plan.period_start,
        period_end: plan.period_end,
        career_objective: plan.career_objective ?? "",
        current_competencies: plan.current_competencies ?? "",
        competencies_to_develop: plan.competencies_to_develop ?? "",
        strengths: plan.strengths ?? "",
        improvement_points: plan.improvement_points ?? "",
        manager_feedback: plan.manager_feedback ?? "",
        employee_feedback: plan.employee_feedback ?? "",
        employeeName: plan.profiles ? `${plan.profiles.first_name} ${plan.profiles.last_name}` : "—",
        managerName: plan.manager ? `${plan.manager.first_name} ${plan.manager.last_name}` : "—",
      }}
      actions={((actions as unknown as ActionRow[]) ?? []).map((a) => ({
        id: a.id,
        description: a.description,
        due_date: a.due_date,
        status: a.status,
        courseTitle: a.courses?.title ?? null,
        responsibleName: a.responsible ? `${a.responsible.first_name} ${a.responsible.last_name}` : null,
      }))}
      meetings={(meetings as { id: string; meeting_date: string; notes: string | null }[]) ?? []}
      courses={(courses as { id: string; title: string }[]) ?? []}
      canManage={canManage}
      isOwner={isOwner}
    />
  );
}
