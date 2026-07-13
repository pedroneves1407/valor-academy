"use client";

import { SimpleEntityManager } from "@/components/shared/simple-entity-manager";
import { departmentSchema } from "@/lib/validations/org-structure";
import { createDepartment, updateDepartment, deleteDepartment } from "./actions";

type Department = { id: string; name: string; unit_id: string | null; unit_name: string | null };
type Unit = { id: string; name: string };

export function DepartmentsClient({ departments, units }: { departments: Department[]; units: Unit[] }) {
  return (
    <SimpleEntityManager
      entityLabel="Departamento"
      entityLabelPlural="Departamentos"
      schema={departmentSchema}
      parentOptions={units}
      parentFieldLabel="Unidade"
      items={departments.map((d) => ({
        id: d.id,
        name: d.name,
        parentId: d.unit_id,
        parentLabel: d.unit_name,
      }))}
      fields={[
        { name: "name", label: "Nome", kind: "text", placeholder: "Ex.: Recursos Humanos" },
        { name: "parent_id", label: "Unidade", kind: "select" },
      ]}
      onCreate={(values) => createDepartment({ name: values.name ?? "", parent_id: values.parent_id })}
      onUpdate={(id, values) => updateDepartment(id, { name: values.name ?? "", parent_id: values.parent_id })}
      onDelete={deleteDepartment}
    />
  );
}
