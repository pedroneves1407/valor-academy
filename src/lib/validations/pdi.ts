import { z } from "zod";

export const developmentPlanSchema = z.object({
  profile_id: z.string().uuid("Selecione o colaborador."),
  period_start: z.string().min(1, "Informe o início do período."),
  period_end: z.string().min(1, "Informe o fim do período."),
  career_objective: z.string().optional(),
  current_competencies: z.string().optional(),
  competencies_to_develop: z.string().optional(),
  strengths: z.string().optional(),
  improvement_points: z.string().optional(),
  manager_feedback: z.string().optional(),
});
export type DevelopmentPlanInput = z.infer<typeof developmentPlanSchema>;

export const developmentPlanActionSchema = z.object({
  description: z.string().min(2, "Descreva a ação."),
  related_course_id: z.string().uuid().nullable().optional(),
  responsible_id: z.string().uuid().nullable().optional(),
  due_date: z.string().optional(),
});
export type DevelopmentPlanActionInput = z.infer<typeof developmentPlanActionSchema>;

export const developmentPlanMeetingSchema = z.object({
  meeting_date: z.string().min(1, "Informe a data da reunião."),
  notes: z.string().optional(),
});
export type DevelopmentPlanMeetingInput = z.infer<typeof developmentPlanMeetingSchema>;
