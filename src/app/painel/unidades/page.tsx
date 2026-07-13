import { requireOrgPermission } from "@/lib/auth/require-company-admin";
import { createClient } from "@/lib/supabase/server";
import { UnitsClient } from "./units-client";

export default async function UnidadesPage() {
  const profile = await requireOrgPermission("org_structure:manage");
  const supabase = await createClient();

  const { data } = await supabase
    .from("units")
    .select("id, name, address")
    .eq("organization_id", profile.organization_id)
    .is("deleted_at", null)
    .order("name");

  return <UnitsClient units={(data as { id: string; name: string; address: string | null }[]) ?? []} />;
}
