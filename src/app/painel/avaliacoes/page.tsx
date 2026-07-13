import { requireProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { AdminAssessmentsClient } from "./admin-assessments-client";
import { CollaboratorAssessmentsClient } from "./collaborator-assessments-client";

export default async function AvaliacoesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  if (profile.role === "company_admin" || profile.role === "superadmin") {
    const { data: assessments } = await supabase
      .from("assessments")
      .select("id, title, passing_score, max_attempts, courses(title)")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false });

    const { data: courses } = await supabase
      .from("courses")
      .select("id, title")
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .order("title");

    type AssessmentRow = { id: string; title: string; passing_score: number; max_attempts: number; courses: { title: string } | null };
    const rows = ((assessments as AssessmentRow[]) ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      passing_score: a.passing_score,
      max_attempts: a.max_attempts,
      course_title: a.courses?.title ?? "—",
    }));

    return <AdminAssessmentsClient assessments={rows} courses={(courses as { id: string; title: string }[]) ?? []} />;
  }

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("profile_id", profile.id)
    .not("course_id", "is", null);

  const courseIds = (enrollments ?? []).map((e) => e.course_id).filter(Boolean) as string[];

  const { data: assessments } =
    courseIds.length > 0
      ? await supabase
          .from("assessments")
          .select("id, title, passing_score, max_attempts, courses(title)")
          .in("course_id", courseIds)
      : { data: [] };

  const { data: attempts } = await supabase
    .from("assessment_attempts")
    .select("assessment_id, attempt_number, status, passed, score")
    .eq("profile_id", profile.id);

  type AssessmentRow = { id: string; title: string; passing_score: number; max_attempts: number; courses: { title: string } | null };
  type AttemptRow = { assessment_id: string; attempt_number: number; status: string; passed: boolean | null; score: number | null };

  const attemptsByAssessment = new Map<string, AttemptRow[]>();
  for (const a of (attempts as AttemptRow[]) ?? []) {
    const list = attemptsByAssessment.get(a.assessment_id) ?? [];
    list.push(a);
    attemptsByAssessment.set(a.assessment_id, list);
  }

  const rows = ((assessments as AssessmentRow[]) ?? []).map((a) => {
    const attemptList = (attemptsByAssessment.get(a.id) ?? []).sort((x, y) => y.attempt_number - x.attempt_number);
    return {
      id: a.id,
      title: a.title,
      course_title: a.courses?.title ?? "—",
      max_attempts: a.max_attempts,
      attemptsUsed: attemptList.length,
      lastAttempt: attemptList[0] ?? null,
    };
  });

  return <CollaboratorAssessmentsClient assessments={rows} />;
}
