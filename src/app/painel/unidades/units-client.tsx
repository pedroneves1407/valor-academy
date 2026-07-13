"use client";

import { SimpleEntityManager } from "@/components/shared/simple-entity-manager";
import { unitSchema } from "@/lib/validations/org-structure";
import { createUnit, updateUnit, deleteUnit } from "./actions";

type Unit = { id: string; name: string; address: string | null };

export function UnitsClient({ units }: { units: Unit[] }) {
  return (
    <SimpleEntityManager
      entityLabel="Unidade"
      entityLabelPlural="Unidades"
      schema={unitSchema}
      items={units.map((u) => ({ id: u.id, name: u.name, secondaryField: u.address ?? "" }))}
      fields={[
        { name: "name", label: "Nome", kind: "text", placeholder: "Ex.: Matriz São Paulo" },
        { name: "address", label: "Endereço", kind: "text", optional: true, placeholder: "Opcional" },
      ]}
      onCreate={(values) => createUnit({ name: values.name ?? "", address: values.address })}
      onUpdate={(id, values) => updateUnit(id, { name: values.name ?? "", address: values.address })}
      onDelete={deleteUnit}
    />
  );
}
