"use client";

import { SimpleEntityManager } from "@/components/shared/simple-entity-manager";
import { teamSchema } from "@/lib/validations/org-structure";
import { createTeam, updateTeam, deleteTeam } from "./actions";

type Team = { id: string; name: string; manager_id: string | null; manager_name: string | null };
type Manager = { id: string; name: string };

export function TeamsClient({ teams, managers }: { teams: Team[]; managers: Manager[] }) {
  return (
    <SimpleEntityManager
      entityLabel="Equipe"
      entityLabelPlural="Equipes"
      schema={teamSchema}
      parentOptions={managers}
      parentFieldLabel="Gestor"
      items={teams.map((t) => ({
        id: t.id,
        name: t.name,
        parentId: t.manager_id,
        parentLabel: t.manager_name,
      }))}
      fields={[
        { name: "name", label: "Nome", kind: "text", placeholder: "Ex.: Time de Vendas Sul" },
        { name: "parent_id", label: "Gestor", kind: "select" },
      ]}
      onCreate={(values) => createTeam({ name: values.name ?? "", parent_id: values.parent_id })}
      onUpdate={(id, values) => updateTeam(id, { name: values.name ?? "", parent_id: values.parent_id })}
      onDelete={deleteTeam}
    />
  );
}
