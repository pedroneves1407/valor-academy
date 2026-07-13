import { z } from "zod";

export const assessmentSchema = z.object({
  title: z.string().min(2, "Informe o título da avaliação."),
  description: z.string().optional(),
  course_id: z.string().uuid("Selecione um curso."),
  module_id: z.string().uuid().nullable().optional(),
  time_limit_minutes: z.coerce.number().int().min(0).optional(),
  passing_score: z.coerce.number().min(0).max(100).default(70),
  max_attempts: z.coerce.number().int().min(1).default(3),
  shuffle_questions: z.boolean().default(false),
  shuffle_options: z.boolean().default(false),
  show_feedback: z.boolean().default(true),
  show_answer_key: z.boolean().default(false),
  available_from: z.string().optional(),
  available_until: z.string().optional(),
});
export type AssessmentInput = z.infer<typeof assessmentSchema>;

export const questionSchema = z.object({
  type: z.enum(["single_choice", "true_false", "multiple_choice", "short_answer", "essay"]),
  statement: z.string().min(2, "Informe o enunciado da questão."),
  points: z.coerce.number().min(0.01, "Informe uma pontuação válida.").default(1),
  options: z
    .array(
      z.object({
        text: z.string().min(1, "Informe o texto da alternativa."),
        is_correct: z.boolean().default(false),
      }),
    )
    .optional(),
});
export type QuestionInput = z.infer<typeof questionSchema>;
