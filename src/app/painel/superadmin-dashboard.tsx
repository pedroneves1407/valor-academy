import { Building2, Users, BookOpen, CheckCircle2, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlyCountChart } from "@/components/dashboard/monthly-count-chart";
import type { Profile } from "@/types/domain";

export async function SuperadminDashboard({ profile }: { profile: Profile }) {
  const supabase = await createClient();

  const { count: totalOrgs } = await supabase.from("organizations").select("id", { count: "exact", head: true });
  const { count: activeOrgs } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");
  const { count: suspendedOrgs } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true })
    .eq("status", "suspended");
  const { count: totalUsers } = await supabase.from("profiles").select("id", { count: "exact", head: true });
  const { count: activeUsers } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");
  const { count: publishedCourses } = await supabase
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  const { data: orgs } = await supabase.from("organizations").select("created_at");

  const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()] };
  });
  const countByMonth = new Map(months.map((m) => [m.key, 0]));
  for (const o of orgs ?? []) {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (countByMonth.has(key)) countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1);
  }
  const chartData = months.map((m) => ({ month: m.label, count: countByMonth.get(m.key) ?? 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {profile.first_name}!</h1>
        <p className="text-muted-foreground">Visão geral da plataforma.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Total de empresas" value={totalOrgs ?? 0} />
        <StatCard icon={CheckCircle2} label="Empresas ativas" value={activeOrgs ?? 0} />
        <StatCard icon={Ban} label="Empresas suspensas" value={suspendedOrgs ?? 0} highlight={(suspendedOrgs ?? 0) > 0} />
        <StatCard icon={Users} label="Total de usuários" value={totalUsers ?? 0} />
        <StatCard icon={Users} label="Usuários ativos" value={activeUsers ?? 0} />
        <StatCard icon={BookOpen} label="Cursos publicados" value={publishedCourses ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crescimento mensal de empresas</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyCountChart data={chartData} label="Novas empresas" />
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
  icon: typeof Building2;
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
