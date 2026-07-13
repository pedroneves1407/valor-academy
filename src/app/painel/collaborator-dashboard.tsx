import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, Award, Target, ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonthlyHoursChart } from "@/components/dashboard/monthly-hours-chart";
import { ScoreTrendChart } from "@/components/dashboard/score-trend-chart";
import type { Profile } from "@/types/domain";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function last6Months() {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()] });
  }
  return months;
}

export async function CollaboratorDashboard({ profile }: { profile: Profile }) {
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, status, course_id, courses(title, is_mandatory, due_date)")
    .eq("profile_id", profile.id)
    .not("course_id", "is", null);

  type EnrollmentRow = {
    id: string;
    status: string;
    course_id: string;
    courses: { title: string; is_mandatory: boolean; due_date: string | null } | null;
  };
  const enrollmentRows = (enrollments as unknown as EnrollmentRow[]) ?? [];

  const inProgress = enrollmentRows.filter((e) => e.status === "in_progress" || e.status === "not_started");
  const completed = enrollmentRows.filter((e) => e.status === "completed");
  const mandatoryPending = enrollmentRows.filter((e) => e.courses?.is_mandatory && e.status !== "completed");

  const { data: completedLessons } = await supabase
    .from("lesson_progress")
    .select("completed_at, lessons(duration_minutes)")
    .eq("profile_id", profile.id)
    .eq("status", "completed")
    .not("completed_at", "is", null);

  type LessonProgressRow = { completed_at: string; lessons: { duration_minutes: number } | null };
  const lessonRows = (completedLessons as unknown as LessonProgressRow[]) ?? [];
  const totalMinutes = lessonRows.reduce((sum, l) => sum + (l.lessons?.duration_minutes ?? 0), 0);

  const months = last6Months();
  const hoursByMonth = new Map(months.map((m) => [m.key, 0]));
  for (const l of lessonRows) {
    const d = new Date(l.completed_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (hoursByMonth.has(key)) {
      hoursByMonth.set(key, (hoursByMonth.get(key) ?? 0) + (l.lessons?.duration_minutes ?? 0) / 60);
    }
  }
  const monthlyHoursData = months.map((m) => ({ month: m.label, hours: Math.round((hoursByMonth.get(m.key) ?? 0) * 10) / 10 }));

  const { data: certificates } = await supabase.from("certificates").select("id").eq("profile_id", profile.id);

  const { data: attempts } = await supabase
    .from("assessment_attempts")
    .select("score, submitted_at")
    .eq("profile_id", profile.id)
    .not("score", "is", null)
    .order("submitted_at", { ascending: true })
    .limit(10);

  const scoreData = (attempts ?? []).map((a, i) => ({
    label: `#${i + 1}`,
    score: a.score ?? 0,
  }));
  const avgScore = scoreData.length > 0 ? scoreData.reduce((s, a) => s + a.score, 0) / scoreData.length : null;

  const { count: goalsInProgress } = await supabase
    .from("goals")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", profile.id)
    .eq("status", "in_progress");

  const nextCourse = inProgress[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {profile.first_name}!</h1>
        <p className="text-muted-foreground">Aqui está um resumo do seu desenvolvimento.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Cursos em andamento" value={inProgress.length} />
        <StatCard icon={CheckCircle2} label="Cursos concluídos" value={completed.length} />
        <StatCard icon={Clock} label="Horas estudadas" value={`${(totalMinutes / 60).toFixed(1)}h`} />
        <StatCard icon={Award} label="Certificados" value={certificates?.length ?? 0} />
        <StatCard icon={ClipboardCheck} label="Média nas avaliações" value={avgScore !== null ? `${avgScore.toFixed(0)}%` : "—"} />
        <StatCard icon={Target} label="Metas em andamento" value={goalsInProgress ?? 0} />
        <StatCard icon={BookOpen} label="Treinamentos obrigatórios pendentes" value={mandatoryPending.length} highlight={mandatoryPending.length > 0} />
      </div>

      {nextCourse && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próxima atividade</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{nextCourse.courses?.title}</p>
            <Button asChild size="sm">
              <Link href={`/painel/meus-cursos/${nextCourse.course_id}`}>Continuar</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horas estudadas por mês</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyHoursChart data={monthlyHoursData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desempenho nas avaliações</CardTitle>
          </CardHeader>
          <CardContent>
            {scoreData.length > 0 ? (
              <ScoreTrendChart data={scoreData} />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma avaliação realizada ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof BookOpen;
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
