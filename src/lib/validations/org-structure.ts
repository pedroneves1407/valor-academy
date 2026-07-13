import { z } from "zod";

export const unitSchema = z.object({
  name: z.string().min(2, "Informe o nome da unidade."),
  address: z.string().optional(),
});
export type UnitInput = z.infer<typeof unitSchema>;

export const departmentSchema = z.object({
  name: z.string().min(2, "Informe o nome do departamento."),
  unit_id: z.string().uuid().nullable().optional(),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;

export const jobPositionSchema = z.object({
  name: z.string().min(2, "Informe o nome do cargo."),
  department_id: z.string().uuid().nullable().optional(),
});
export type JobPositionInput = z.infer<typeof jobPositionSchema>;

export const teamSchema = z.object({
  name: z.string().min(2, "Informe o nome da equipe."),
  manager_id: z.string().uuid().nullable().optional(),
});
export type TeamInput = z.infer<typeof teamSchema>;

export const inviteCollaboratorSchema = z.object({
  first_name: z.string().min(1, "Informe o nome."),
  last_name: z.string().min(1, "Informe o sobrenome."),
  email: z.string().min(1, "Informe o e-mail.").email("E-mail inválido."),
  role: z.enum(["company_admin", "manager", "collaborator"], {
    message: "Selecione um perfil.",
  }),
  registration_number: z.string().optional(),
  job_position_id: z.string().uuid().nullable().optional(),
  department_id: z.string().uuid().nullable().optional(),
  unit_id: z.string().uuid().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
});
export type InviteCollaboratorInput = z.infer<typeof inviteCollaboratorSchema>;
