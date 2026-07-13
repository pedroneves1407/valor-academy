import { Users, BookOpen, AlertTriangle, CheckCircle2, Target, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamProgressChart } from "@/components/dashboard/team-progress-chart";
import type { Profile } from "@/types/domain";

export async function ManagerDashboard({ profile }: { profile: Profile }) {
  const supabase = await createClient();

  const { data: team } = await supabase.from("profiles").select("id, first_name, last_name").eq("manager_id", profile.id);
  const teamIds = (team ?? []).map((t) => t.id);

  if (teamIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {profile.first_name}!</h1>
          <p className="text-muted-foreground">Você ainda não tem colaboradores na sua equipe.</p>
        </div>
      </div>
    );
  }

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, profile_id, status, courses(due_date), course_progress(progress_pct)")
    .in("profile_id", teamIds)
    .not("course_id", "is", null);

  type EnrollmentRow = {
    id: string;
    profile_id: string;
    status: string;
    courses: { due_date: string | null } | null;
    course_progress: { progress_pct: number }[] | { progress_pct: number } | null;
  };
  const enrollmentRows = (enrollments as unknown as EnrollmentRow[]) ?? [];

  const pending = enrollmentRows.filter((e) => e.status !== "completed");
  const now = new Date();
  const overdue = enrollmentRows.filter(
    (e) => e.status !== "completed" && e.courses?.due_date && new Date(e.courses.due_date) < now,
  );
  const completed = enrollmentRows.filter((e) => e.status === "completed");
  const completionRate = enrollmentRows.length > 0 ? (completed.length / enrollmentRows.length) * 100 : 0;

  const { data: attempts } = await supabase
    .from("assessment_attempts")
    .select("score")
    .in("profile_id", teamIds)
    .not("score", "is", null);
  const avgScore = attempts && attempts.length > 0 ? attempts.reduce((s, a) => s + (a.score ?? 0), 0) / attempts.length : null;

  const { data: atRiskGoals } = await supabase
    .from("goals")
    .select("id, owner_id, status")
    .in("owner_id", teamIds)
    .in("status", ["at_risk", "overdue"]);
  const membersAtRisk = new Set((atRiskGoals ?? []).map((g) => g.owner_id)).size;
  const overdueGoals = (atRiskGoals ?? []).filter((g) => g.status === "overdue").length;

  const { data: plans } = await supabase
    .from("development_plans")
    .select("id, status")
    .eq("manager_id", profile.id)
    .in("status", ["draft", "awaiting_acceptance"]);

  const progressByMember = new Map<string, number[]>();
  for (const e of enrollmentRows) {
    const progress = Array.isArray(e.course_progress) ? e.course_progress[0]?.progress_pct : e.course_progress?.progress_pct;
    const list = progressByMember.get(e.profile_id) ?? [];
    list.push(progress ?? 0);
    progressByMember.set(e.profile_id, list);
  }

  const chartData = (team ?? []).map((m) => {
    const values = progressByMember.get(m.id) ?? [];
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    return { name: `${m.first_name} ${m.last_name}`, progress: Math.round(avg) };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {profile.first_name}!</h1>
        <p className="text-muted-foreground">Visão geral da sua equipe.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Colaboradores" value={teamIds.length} />
        <StatCard icon={BookOpen} label="Treinamentos pendentes" value={pending.length} />
        <StatCard icon={AlertTriangle} label="Treinamentos atrasados" value={overdue.length} highlight={overdue.length > 0} />
        <StatCard icon={CheckCircle2} label="Cursos concluídos" value={completed.length} />
        <StatCard icon={CheckCircle2} label="Taxa de conclusão" value={`${completionRate.toFixed(0)}%`} />
        <StatCard icon={GraduationCap} label="Média nas avaliações" value={avgScore !== null ? `${avgScore.toFixed(0)}%` : "—"} />
        <StatCard icon={AlertTriangle} label="Colaboradores em risco" value={membersAtRisk} highlight={membersAtRisk > 0} />
        <StatCard icon={Target} label="Metas atrasadas" value={overdueGoals} highlight={overdueGoals > 0} />
        <StatCard icon={GraduationCap} label="PDI pendentes" value={plans?.length ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progresso médio por colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <TeamProgressChart data={chartData} />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum curso atribuído à equipe ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Icon className={`size-5 ${highlight ? "text-warning" : "text-brand"}`} />
        <p className="text-2xl font-semibold mt-2">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
