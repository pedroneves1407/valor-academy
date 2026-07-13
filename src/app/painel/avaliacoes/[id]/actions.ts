"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertOrgPermission } from "@/lib/auth/require-company-admin";
import { questionSchema, type QuestionInput } from "@/lib/validations/assessments";
import { issueCertificateIfEligible } from "@/lib/certificates/issue";

export async function createQuestion(assessmentId: string, formData: QuestionInput) {
  await assertOrgPermission("assessment:manage");
  const values = questionSchema.parse(formData);
  const supabase = await createClient();

  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("assessment_id", assessmentId);

  const { data: question, error } = await supabase
    .from("questions")
    .insert({
      assessment_id: assessmentId,
      type: values.type,
      statement: values.statement,
      points: values.points,
      order_index: count ?? 0,
    })
    .select("id")
    .single();

  if (error || !question) throw new Error("Não foi possível criar a questão.");

  if (values.options && values.options.length > 0) {
    await supabase.from("question_options").insert(
      values.options.map((opt, index) => ({
        question_id: question.id,
        text: opt.text,
        is_correct: opt.is_correct,
        order_index: index,
      })),
    );
  }

  revalidatePath(`/painel/avaliacoes/${assessmentId}`);
}

export async function updateQuestion(assessmentId: string, questionId: string, formData: QuestionInput) {
  await assertOrgPermission("assessment:manage");
  const values = questionSchema.parse(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("questions")
    .update({ type: values.type, statement: values.statement, points: values.points })
    .eq("id", questionId);

  if (error) throw new Error("Não foi possível atualizar a questão.");

  await supabase.from("question_options").delete().eq("question_id", questionId);
  if (values.options && values.options.length > 0) {
    await supabase.from("question_options").insert(
      values.options.map((opt, index) => ({
        question_id: questionId,
        text: opt.text,
        is_correct: opt.is_correct,
        order_index: index,
      })),
    );
  }

  revalidatePath(`/painel/avaliacoes/${assessmentId}`);
}

export async function deleteQuestion(assessmentId: string, questionId: string) {
  await assertOrgPermission("assessment:manage");
  const supabase = await createClient();

  const { error } = await supabase.from("questions").delete().eq("id", questionId);
  if (error) throw new Error("Não foi possível remover a questão.");
  revalidatePath(`/painel/avaliacoes/${assessmentId}`);
}

export async function gradeEssayAnswer(
  assessmentId: string,
  attemptId: string,
  answerId: string,
  points: number,
  comment: string,
) {
  const profile = await assertOrgPermission("assessment:manage");
  const supabase = await createClient();

  const { error } = await supabase
    .from("attempt_answers")
    .update({
      points_awarded: points,
      grader_comment: comment || null,
      graded_by: profile.id,
      graded_at: new Date().toISOString(),
    })
    .eq("id", answerId);

  if (error) throw new Error("Não foi possível salvar a correção.");

  type AttemptAnswerRow = { points_awarded: number | null; questions: { points: number } | null };
  const { data: answersData } = await supabase
    .from("attempt_answers")
    .select("points_awarded, questions(points)")
    .eq("attempt_id", attemptId);
  const answers = answersData as unknown as AttemptAnswerRow[] | null;

  const stillPending = (answers ?? []).some((a) => a.points_awarded === null);

  if (!stillPending) {
    const { data: assessment } = await supabase
      .from("assessments")
      .select("passing_score")
      .eq("id", assessmentId)
      .single();

    const totalPoints = (answers ?? []).reduce((sum, a) => sum + (a.questions?.points ?? 0), 0);
    const earnedPoints = (answers ?? []).reduce((sum, a) => sum + (a.points_awarded ?? 0), 0);
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= (assessment?.passing_score ?? 70);

    await supabase
      .from("assessment_attempts")
      .update({ status: "graded", score, passed })
      .eq("id", attemptId);

    if (passed) {
      const { data: attemptData } = await supabase
        .from("assessment_attempts")
        .select("profile_id, assessments(course_id)")
        .eq("id", attemptId)
        .single();
      const attempt = attemptData as unknown as { profile_id: string; assessments: { course_id: string } | null } | null;
      if (attempt?.assessments?.course_id) {
        await issueCertificateIfEligible(attempt.profile_id, attempt.assessments.course_id);
      }
    }
  }

  revalidatePath(`/painel/avaliacoes/${assessmentId}`);
}
