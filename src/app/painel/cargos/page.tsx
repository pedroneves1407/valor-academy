import { requireOrgPermission } from "@/lib/auth/require-company-admin";
import { createClient } from "@/lib/supabase/server";
import { JobPositionsClient } from "./job-positions-client";

export default async function CargosPage() {
  const profile = await requireOrgPermission("org_structure:manage");
  const supabase = await createClient();

  const [{ data: jobPositions }, { data: departments }] = await Promise.all([
    supabase
      .from("job_positions")
      .select("id, name, department_id, departments(name)")
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("departments")
      .select("id, name")
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const rows = (
    (jobPositions as {
      id: string;
      name: string;
      department_id: string | null;
      departments: { name: string } | null;
    }[]) ?? []
  ).map((j) => ({
    id: j.id,
    name: j.name,
    department_id: j.department_id,
    department_name: j.departments?.name ?? null,
  }));

  return <JobPositionsClient jobPositions={rows} departments={(departments as { id: string; name: string }[]) ?? []} />;
}
