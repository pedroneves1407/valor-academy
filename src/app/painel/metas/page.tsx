import { requireProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { GoalsClient, type GoalItem } from "./goals-client";

type GoalRow = {
  id: string;
  title: string;
  description: string | null;
  type: GoalItem["type"];
  status: GoalItem["status"];
  priority: GoalItem["priority"];
  initial_value: number;
  current_value: number;
  target_value: number;
  unit_label: string | null;
  start_date: string;
  due_date: string;
  owner_id: string;
  team_id: string | null;
  profiles: { first_name: string; last_name: string } | null;
};

export default async function MetasPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const canManage = can(profile.role, "goal:manage_own_team") || can(profile.role, "goal:manage_all");

  let ownerIds: string[] | null = null;
  if (profile.role === "manager") {
    const { data: teamMembers } = await supabase
      .from("profiles")
      .select("id")
      .eq("manager_id", profile.id);
    ownerIds = [profile.id, ...((teamMembers ?? []).map((m) => m.id))];
  } else if (profile.role === "collaborator") {
    ownerIds = [profile.id];
  }

  let query = supabase
    .from("goals")
    .select(
      "id, title, description, type, status, priority, initial_value, current_value, target_value, unit_label, start_date, due_date, owner_id, team_id, profiles(first_name,last_name)",
    )
    .eq("organization_id", profile.organization_id)
    .order("due_date");

  if (ownerIds) query = query.in("owner_id", ownerIds);

  const { data } = await query;

  const goals: GoalItem[] = ((data as unknown as GoalRow[]) ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    type: g.type,
    status: g.status,
    priority: g.priority,
    initial_value: g.initial_value,
    current_value: g.current_value,
    target_value: g.target_value,
    unit_label: g.unit_label,
    start_date: g.start_date,
    due_date: g.due_date,
    owner_id: g.owner_id,
    owner_name: g.profiles ? `${g.profiles.first_name} ${g.profiles.last_name}` : "—",
  }));

  let ownerOptions: { id: string; name: string }[] = [];
  if (canManage) {
    const { data: owners } =
      profile.role === "manager"
        ? await supabase.from("profiles").select("id, first_name, last_name").or(`manager_id.eq.${profile.id},id.eq.${profile.id}`)
        : await supabase.from("profiles").select("id, first_name, last_name").eq("organization_id", profile.organization_id);
    ownerOptions = ((owners as { id: string; first_name: string; last_name: string }[]) ?? []).map((o) => ({
      id: o.id,
      name: `${o.first_name} ${o.last_name}`,
    }));
  }

  return (
    <GoalsClient
      goals={goals}
      currentProfileId={profile.id}
      canManage={canManage}
      ownerOptions={ownerOptions}
    />
  );
}
