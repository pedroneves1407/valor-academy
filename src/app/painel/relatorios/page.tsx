import { requireProfile } from "@/lib/auth/current-profile";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportsClient } from "./reports-client";

export default async function RelatoriosPage() {
  const profile = await requireProfile();
  if (!can(profile.role, "report:view_team") && !can(profile.role, "report:view_organization")) {
    redirect("/acesso-negado");
  }

  const supabase = await createClient();
  const isOrgWide = can(profile.role, "report:view_organization");

  let scopeIds: string[] | null = null;
  if (!isOrgWide) {
    const { data: team } = await supabase.from("profiles").select("id").eq("manager_id", profile.id);
    scopeIds = [profile.id, ...((team ?? []).map((t) => t.id))];
  }

  const usersQuery = supabase
    .from("profiles")
    .select("first_name, last_name, email, status, role")
    .eq("organization_id", profile.organization_id);
  const { data: users } = scopeIds ? await usersQuery.in("id", scopeIds) : await usersQuery;

  const enrollmentsQuery = supabase
    .from("enrollments")
    .select("status, profiles(first_name,last_name), courses(title,due_date)")
    .eq("organization_id", profile.organization_id)
    .not("course_id", "is", null);
  const { data: enrollments } = scopeIds ? await enrollmentsQuery.in("profile_id", scopeIds) : await enrollmentsQuery;

  const certificatesQuery = supabase
    .from("certificates")
    .select("validation_code, workload_hours, issued_at, profiles(first_name,last_name), courses(title)")
    .eq("organization_id", profile.organization_id);
  const { data: certificates } = scopeIds ? await certificatesQuery.in("profile_id", scopeIds) : await certificatesQuery;

  const goalsQuery = supabase
    .from("goals")
    .select("title, status, priority, current_value, target_value, due_date, profiles!goals_owner_id_fkey(first_name,last_name)")
    .eq("organization_id", profile.organization_id);
  const { data: goals } = scopeIds ? await goalsQuery.in("owner_id", scopeIds) : await goalsQuery;

  type UserRow = { first_name: string; last_name: string; email: string; status: string; role: string };
  type EnrollmentRow = {
    status: string;
    profiles: { first_name: string; last_name: string } | null;
    courses: { title: string; due_date: string | null } | null;
  };
  type CertificateRow = {
    validation_code: string;
    workload_hours: number;
    issued_at: string;
    profiles: { first_name: string; last_name: string } | null;
    courses: { title: string } | null;
  };
  type GoalRow = {
    title: string;
    status: string;
    priority: string;
    current_value: number;
    target_value: number;
    due_date: string;
    profiles: { first_name: string; last_name: string } | null;
  };

  return (
    <ReportsClient
      users={((users as UserRow[]) ?? []).map((u) => ({
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        status: u.status,
        role: u.role,
      }))}
      enrollments={((enrollments as unknown as EnrollmentRow[]) ?? []).map((e) => ({
        collaborator: e.profiles ? `${e.profiles.first_name} ${e.profiles.last_name}` : "—",
        course: e.courses?.title ?? "—",
        status: e.status,
        dueDate: e.courses?.due_date ?? null,
      }))}
      certificates={((certificates as unknown as CertificateRow[]) ?? []).map((c) => ({
        collaborator: c.profiles ? `${c.profiles.first_name} ${c.profiles.last_name}` : "—",
        course: c.courses?.title ?? "—",
        code: c.validation_code,
        workloadHours: c.workload_hours,
        issuedAt: c.issued_at,
      }))}
      goals={((goals as unknown as GoalRow[]) ?? []).map((g) => ({
        owner: g.profiles ? `${g.profiles.first_name} ${g.profiles.last_name}` : "—",
        title: g.title,
        status: g.status,
        priority: g.priority,
        progress: g.target_value !== 0 ? (g.current_value / g.target_value) * 100 : 0,
        dueDate: g.due_date,
      }))}
    />
  );
}
