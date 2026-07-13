"use client";

import { SimpleEntityManager } from "@/components/shared/simple-entity-manager";
import { jobPositionSchema } from "@/lib/validations/org-structure";
import { createJobPosition, updateJobPosition, deleteJobPosition } from "./actions";

type JobPosition = { id: string; name: string; department_id: string | null; department_name: string | null };
type Department = { id: string; name: string };

export function JobPositionsClient({
  jobPositions,
  departments,
}: {
  jobPositions: JobPosition[];
  departments: Department[];
}) {
  return (
    <SimpleEntityManager
      entityLabel="Cargo"
      entityLabelPlural="Cargos"
      schema={jobPositionSchema}
      parentOptions={departments}
      parentFieldLabel="Departamento"
      items={jobPositions.map((j) => ({
        id: j.id,
        name: j.name,
        parentId: j.department_id,
        parentLabel: j.department_name,
      }))}
      fields={[
        { name: "name", label: "Nome", kind: "text", placeholder: "Ex.: Analista de RH" },
        { name: "parent_id", label: "Departamento", kind: "select" },
      ]}
      onCreate={(values) => createJobPosition({ name: values.name ?? "", parent_id: values.parent_id })}
      onUpdate={(id, values) => updateJobPosition(id, { name: values.name ?? "", parent_id: values.parent_id })}
      onDelete={deleteJobPosition}
    />
  );
}
