import { requireOrgPermission } from "@/lib/auth/require-company-admin";
import { createClient } from "@/lib/supabase/server";
import { TeamsClient } from "./teams-client";

export default async function EquipesPage() {
  const profile = await requireOrgPermission("org_structure:manage");
  const supabase = await createClient();

  const [{ data: teams }, { data: managers }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, manager_id, profiles(first_name,last_name)")
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("organization_id", profile.organization_id)
      .in("role", ["manager", "company_admin"])
      .order("first_name"),
  ]);

  const rows = (
    (teams as {
      id: string;
      name: string;
      manager_id: string | null;
      profiles: { first_name: string; last_name: string } | null;
    }[]) ?? []
  ).map((t) => ({
    id: t.id,
    name: t.name,
    manager_id: t.manager_id,
    manager_name: t.profiles ? `${t.profiles.first_name} ${t.profiles.last_name}` : null,
  }));

  const managerOptions = (
    (managers as { id: string; first_name: string; last_name: string }[]) ?? []
  ).map((m) => ({ id: m.id, name: `${m.first_name} ${m.last_name}` }));

  return <TeamsClient teams={rows} managers={managerOptions} />;
}
