import { requireOrgPermission } from "@/lib/auth/require-company-admin";
import { createClient } from "@/lib/supabase/server";
import { CollaboratorsClient, type Collaborator } from "./collaborators-client";

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Collaborator["role"];
  status: Collaborator["status"];
  registration_number: string | null;
  job_positions: { name: string } | null;
  departments: { name: string } | null;
  units: { name: string } | null;
  manager: { first_name: string; last_name: string } | null;
};

export default async function ColaboradoresPage() {
  const profile = await requireOrgPermission("user:manage");
  const supabase = await createClient();

  const [{ data: profiles }, { data: jobPositions }, { data: departments }, { data: units }, { data: managers }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, email, role, status, registration_number, job_positions(name), departments(name), units(name), manager:manager_id(first_name,last_name)",
        )
        .eq("organization_id", profile.organization_id)
        .is("deleted_at", null)
        .order("first_name"),
      supabase.from("job_positions").select("id, name").eq("organization_id", profile.organization_id).is("deleted_at", null).order("name"),
      supabase.from("departments").select("id, name").eq("organization_id", profile.organization_id).is("deleted_at", null).order("name"),
      supabase.from("units").select("id, name").eq("organization_id", profile.organization_id).is("deleted_at", null).order("name"),
      supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("organization_id", profile.organization_id)
        .in("role", ["manager", "company_admin"])
        .order("first_name"),
    ]);

  const rows: Collaborator[] = ((profiles as ProfileRow[]) ?? []).map((p) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    email: p.email,
    role: p.role,
    status: p.status,
    registration_number: p.registration_number,
    job_position_name: p.job_positions?.name ?? null,
    department_name: p.departments?.name ?? null,
    unit_name: p.units?.name ?? null,
    manager_name: p.manager ? `${p.manager.first_name} ${p.manager.last_name}` : null,
  }));

  const toOptions = (data: { id: string; name: string }[] | null) => (data ?? []).map((d) => ({ id: d.id, name: d.name }));
  const managerOptions = ((managers as { id: string; first_name: string; last_name: string }[]) ?? []).map((m) => ({
    id: m.id,
    name: `${m.first_name} ${m.last_name}`,
  }));

  return (
    <CollaboratorsClient
      collaborators={rows}
      jobPositions={toOptions(jobPositions as { id: string; name: string }[])}
      departments={toOptions(departments as { id: string; name: string }[])}
      units={toOptions(units as { id: string; name: string }[])}
      managers={managerOptions}
    />
  );
}
