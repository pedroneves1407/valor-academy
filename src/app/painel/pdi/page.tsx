import Link from "next/link";
import { Plus, GraduationCap } from "lucide-react";
import { requireProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewPlanDialog } from "./new-plan-dialog";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  awaiting_acceptance: "Aguardando aceite",
  active: "Ativo",
  completed: "Concluído",
  cancelled: "Cancelado",
};

type PlanRow = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  profiles: { first_name: string; last_name: string } | null;
};

export default async function PdiPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const canManage = can(profile.role, "dev_plan:manage");

  const query = supabase
    .from("development_plans")
    .select("id, period_start, period_end, status, profiles!development_plans_profile_id_fkey(first_name,last_name)")
    .eq("organization_id", profile.organization_id)
    .order("period_start", { ascending: false });

  const { data } = canManage && profile.role === "manager" ? await query.eq("manager_id", profile.id) : canManage ? await query : await query.eq("profile_id", profile.id);

  const plans = ((data as unknown as PlanRow[]) ?? []).map((p) => ({
    id: p.id,
    period: `${new Date(p.period_start).toLocaleDateString("pt-BR")} - ${new Date(p.period_end).toLocaleDateString("pt-BR")}`,
    status: p.status,
    employeeName: p.profiles ? `${p.profiles.first_name} ${p.profiles.last_name}` : "—",
  }));

  let teamOptions: { id: string; name: string }[] = [];
  if (canManage) {
    const { data: members } =
      profile.role === "manager"
        ? await supabase.from("profiles").select("id, first_name, last_name").eq("manager_id", profile.id)
        : await supabase.from("profiles").select("id, first_name, last_name").eq("organization_id", profile.organization_id);
    teamOptions = ((members as { id: string; first_name: string; last_name: string }[]) ?? []).map((m) => ({
      id: m.id,
      name: `${m.first_name} ${m.last_name}`,
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">PDI</h1>
          <p className="text-muted-foreground text-sm">Planos de Desenvolvimento Individual.</p>
        </div>
        {canManage && <NewPlanDialog employeeOptions={teamOptions} />}
      </div>

      {plans.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
            <GraduationCap className="size-8" />
            Nenhum PDI cadastrado ainda.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plans.map((p) => (
          <Link key={p.id} href={`/painel/pdi/${p.id}`}>
            <Card className="hover:border-brand transition-colors">
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{p.employeeName}</h2>
                  <Badge variant={p.status === "active" ? "default" : "outline"}>{STATUS_LABEL[p.status]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{p.period}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
