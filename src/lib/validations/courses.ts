import { z } from "zod";

export const courseSchema = z.object({
  title: z.string().min(2, "Informe o título do curso."),
  short_description: z.string().max(240, "Máximo de 240 caracteres.").optional(),
  full_description: z.string().optional(),
  cover_image_url: z.string().url("Informe uma URL válida.").optional().or(z.literal("")),
  category_id: z.string().uuid().nullable().optional(),
  instructor_name: z.string().optional(),
  workload_hours: z.coerce.number().min(0, "Informe uma carga horária válida.").optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  due_date: z.string().optional(),
  passing_score: z.coerce.number().min(0).max(100).default(70),
  max_attempts: z.coerce.number().int().min(1).default(3),
  certificate_enabled: z.boolean().default(true),
  is_mandatory: z.boolean().default(false),
  target_audience: z.string().optional(),
  tags: z.string().optional(),
});
export type CourseInput = z.infer<typeof courseSchema>;

export const moduleSchema = z.object({
  title: z.string().min(2, "Informe o título do módulo."),
  description: z.string().optional(),
});
export type ModuleInput = z.infer<typeof moduleSchema>;

export const lessonSchema = z.object({
  title: z.string().min(2, "Informe o título da aula."),
  description: z.string().optional(),
  type: z.enum(["video", "text", "pdf", "file", "external_link", "activity", "quiz", "live_event"]),
  content: z.string().optional(),
  file_url: z.string().url("Informe uma URL válida.").optional().or(z.literal("")),
  duration_minutes: z.coerce.number().int().min(0).default(0),
  is_mandatory: z.boolean().default(true),
  min_watch_percent: z.coerce.number().int().min(1).max(100).default(90),
});
export type LessonInput = z.infer<typeof lessonSchema>;
