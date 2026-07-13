import { Users, BookOpen, Award, ClipboardList, Target, GraduationCap, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlyCountChart } from "@/components/dashboard/monthly-count-chart";
import type { Profile } from "@/types/domain";

export async function AdminDashboard({ profile }: { profile: Profile }) {
  const supabase = await createClient();
  const orgId = profile.organization_id;

  const { count: activeUsers } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "active");

  const { count: publishedCourses } = await supabase
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "published");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("organization_id", orgId)
    .not("course_id", "is", null);
  const completionRate =
    enrollments && enrollments.length > 0
      ? (enrollments.filter((e) => e.status === "completed").length / enrollments.length) * 100
      : 0;

  const { count: certificatesIssued } = await supabase
    .from("certificates")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  const { count: pendingGrading } = await supabase
    .from("assessment_attempts")
    .select("id, assessments!inner(organization_id)", { count: "exact", head: true })
    .eq("status", "grading_pending")
    .eq("assessments.organization_id", orgId);

  const { count: overdueGoals } = await supabase
    .from("goals")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "overdue");

  const { count: pendingPlans } = await supabase
    .from("development_plans")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .in("status", ["draft", "awaiting_acceptance"]);

  const { data: certificatesByMonth } = await supabase
    .from("certificates")
    .select("issued_at")
    .eq("organization_id", orgId);

  const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()] };
  });
  const countByMonth = new Map(months.map((m) => [m.key, 0]));
  for (const c of certificatesByMonth ?? []) {
    const d = new Date(c.issued_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (countByMonth.has(key)) countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1);
  }
  const chartData = months.map((m) => ({ month: m.label, count: countByMonth.get(m.key) ?? 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {profile.first_name}!</h1>
        <p className="text-muted-foreground">Visão geral da sua empresa.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Colaboradores ativos" value={activeUsers ?? 0} />
        <StatCard icon={BookOpen} label="Cursos publicados" value={publishedCourses ?? 0} />
        <StatCard icon={CheckCircle2} label="Taxa de conclusão" value={`${completionRate.toFixed(0)}%`} />
        <StatCard icon={Award} label="Certificados emitidos" value={certificatesIssued ?? 0} />
        <StatCard icon={ClipboardList} label="Avaliações aguardando correção" value={pendingGrading ?? 0} highlight={(pendingGrading ?? 0) > 0} />
        <StatCard icon={Target} label="Metas atrasadas" value={overdueGoals ?? 0} highlight={(overdueGoals ?? 0) > 0} />
        <StatCard icon={GraduationCap} label="PDI pendentes" value={pendingPlans ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certificados emitidos por mês</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyCountChart data={chartData} label="Certificados emitidos" />
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
