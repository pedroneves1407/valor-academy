import { requireOrgPermission } from "@/lib/auth/require-company-admin";
import { createClient } from "@/lib/supabase/server";
import { DepartmentsClient } from "./departments-client";

export default async function DepartamentosPage() {
  const profile = await requireOrgPermission("org_structure:manage");
  const supabase = await createClient();

  const [{ data: departments }, { data: units }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name, unit_id, units(name)")
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("units")
      .select("id, name")
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const rows = (
    (departments as { id: string; name: string; unit_id: string | null; units: { name: string } | null }[]) ?? []
  ).map((d) => ({ id: d.id, name: d.name, unit_id: d.unit_id, unit_name: d.units?.name ?? null }));

  return <DepartmentsClient departments={rows} units={(units as { id: string; name: string }[]) ?? []} />;
}
