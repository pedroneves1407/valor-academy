import { z } from "zod";

export const goalSchema = z.object({
  title: z.string().min(2, "Informe o título da meta."),
  description: z.string().optional(),
  type: z.enum(["numeric", "percentage", "done_not_done", "milestone", "okr"]),
  owner_id: z.string().uuid("Selecione o responsável."),
  team_id: z.string().uuid().nullable().optional(),
  start_date: z.string().min(1, "Informe a data inicial."),
  due_date: z.string().min(1, "Informe o prazo."),
  initial_value: z.coerce.number().default(0),
  target_value: z.coerce.number().default(100),
  unit_label: z.string().optional(),
  weight: z.coerce.number().min(0).default(1),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});
export type GoalInput = z.infer<typeof goalSchema>;

export const goalUpdateSchema = z.object({
  new_value: z.coerce.number(),
  comment: z.string().optional(),
  evidence_url: z.string().url("Informe uma URL válida.").optional().or(z.literal("")),
});
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;
