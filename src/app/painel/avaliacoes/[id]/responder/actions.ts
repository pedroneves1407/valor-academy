"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import type { SequenceModule } from "@/lib/courses/sequence";
import { issueCertificateIfEligible } from "@/lib/certificates/issue";

async function loadAssessment(assessmentId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("assessments").select("*").eq("id", assessmentId).single();
  if (!data) throw new Error("Avaliação não encontrada.");
  return data;
}

async function assertMandatoryLessonsCompleted(profileId: string, courseId: string) {
  const supabase = await createClient();
  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, order_index, lessons(id, is_mandatory, order_index)")
    .eq("course_id", courseId)
    .order("order_index");

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lesson_id, status")
    .eq("profile_id", profileId);

  const completedSet = new Set((progress ?? []).filter((p) => p.status === "completed").map((p) => p.lesson_id));

  type ModRow = { id: string; order_index: number; lessons: { id: string; is_mandatory: boolean; order_index: number }[] };
  const sequence: SequenceModule[] = ((modules as ModRow[]) ?? []).map((m) => ({
    id: m.id,
    lessons: [...(m.lessons ?? [])]
      .sort((a, b) => a.order_index - b.order_index)
      .map((l) => ({ id: l.id, is_mandatory: l.is_mandatory, completed: completedSet.has(l.id) })),
  }));

  const allMandatoryCompleted = sequence.every((m) => m.lessons.every((l) => !l.is_mandatory || l.completed));
  if (!allMandatoryCompleted) {
    throw new Error("Conclua todas as aulas obrigatórias do curso antes de realizar a avaliação.");
  }
}

export async function startAttempt(assessmentId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const assessment = await loadAssessment(assessmentId);

  const now = new Date();
  if (assessment.available_from && new Date(assessment.available_from) > now) {
    throw new Error("Esta avaliação ainda não está disponível.");
  }
  if (assessment.available_until && new Date(assessment.available_until) < now) {
    throw new Error("O período de disponibilidade desta avaliação já encerrou.");
  }

  await assertMandatoryLessonsCompleted(profile.id, assessment.course_id);

  const { count } = await supabase
    .from("assessment_attempts")
    .select("id", { count: "exact", head: true })
    .eq("assessment_id", assessmentId)
    .eq("profile_id", profile.id);

  const attemptNumber = (count ?? 0) + 1;
  if (attemptNumber > assessment.max_attempts) {
    throw new Error("Você já atingiu o número máximo de tentativas para esta avaliação.");
  }

  const { data: attempt, error } = await supabase
    .from("assessment_attempts")
    .insert({ assessment_id: assessmentId, profile_id: profile.id, attempt_number: attemptNumber, status: "in_progress" })
    .select("id")
    .single();

  if (error || !attempt) throw new Error("Não foi possível iniciar a tentativa.");
  redirect(`/painel/avaliacoes/${assessmentId}/responder?tentativa=${attempt.id}`);
}

type SubmittedAnswer = {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
};

export async function submitAttempt(assessmentId: string, attemptId: string, answers: SubmittedAnswer[]) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("assessment_attempts")
    .select("id, profile_id, status")
    .eq("id", attemptId)
    .single();

  if (!attempt || attempt.profile_id !== profile.id) throw new Error("Tentativa não encontrada.");
  if (attempt.status !== "in_progress") throw new Error("Esta tentativa já foi enviada.");

  const { data: questions } = await supabase
    .from("questions")
    .select("id, type, points, question_options(id, is_correct)")
    .eq("assessment_id", assessmentId);

  type QuestionRow = { id: string; type: string; points: number; question_options: { id: string; is_correct: boolean }[] };
  const questionMap = new Map(((questions as QuestionRow[]) ?? []).map((q) => [q.id, q]));

  let hasPending = false;
  let totalPoints = 0;
  let earnedPoints = 0;

  const rows = answers.map((a) => {
    const question = questionMap.get(a.questionId);
    if (!question) return null;
    totalPoints += question.points;

    if (question.type === "essay" || question.type === "short_answer") {
      hasPending = true;
      return {
        attempt_id: attemptId,
        question_id: a.questionId,
        text_answer: a.textAnswer || null,
        points_awarded: null,
      };
    }

    const correctIds = new Set(question.question_options.filter((o) => o.is_correct).map((o) => o.id));
    const selected = new Set(a.selectedOptionIds ?? []);
    const isCorrect =
      correctIds.size === selected.size && [...correctIds].every((id) => selected.has(id));
    const points = isCorrect ? question.points : 0;
    earnedPoints += points;

    return {
      attempt_id: attemptId,
      question_id: a.questionId,
      selected_option_ids: a.selectedOptionIds ?? [],
      is_correct: isCorrect,
      points_awarded: points,
    };
  }).filter(Boolean);

  await supabase.from("attempt_answers").insert(rows as never);

  const { data: assessment } = await supabase
    .from("assessments")
    .select("passing_score, course_id")
    .eq("id", assessmentId)
    .single();

  const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  const passed = hasPending ? null : score >= (assessment?.passing_score ?? 70);

  await supabase
    .from("assessment_attempts")
    .update({
      submitted_at: new Date().toISOString(),
      status: hasPending ? "grading_pending" : "graded",
      score: hasPending ? null : score,
      passed,
    })
    .eq("id", attemptId);

  if (passed && assessment?.course_id) {
    await issueCertificateIfEligible(profile.id, assessment.course_id);
  }

  revalidatePath(`/painel/avaliacoes/${assessmentId}`);
  redirect(`/painel/avaliacoes/${assessmentId}/resultado/${attemptId}`);
}
