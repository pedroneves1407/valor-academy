import { notFound } from "next/navigation";
import { requireOrgPermission } from "@/lib/auth/require-company-admin";
import { createClient } from "@/lib/supabase/server";
import { AssessmentDetailClient } from "./assessment-detail-client";

export default async function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireOrgPermission("assessment:manage");
  const supabase = await createClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single();

  if (!assessment) notFound();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .eq("organization_id", profile.organization_id)
    .is("deleted_at", null)
    .order("title");

  const { data: questions } = await supabase
    .from("questions")
    .select("id, type, statement, points, order_index, question_options(id, text, is_correct, order_index)")
    .eq("assessment_id", id)
    .order("order_index");

  type QuestionRow = {
    id: string;
    type: string;
    statement: string;
    points: number;
    order_index: number;
    question_options: { id: string; text: string; is_correct: boolean; order_index: number }[];
  };

  const normalizedQuestions = ((questions as QuestionRow[]) ?? []).map((q) => ({
    id: q.id,
    type: q.type as never,
    statement: q.statement,
    points: q.points,
    options: [...(q.question_options ?? [])].sort((a, b) => a.order_index - b.order_index),
  }));

  const { data: pendingAttemptAnswers } = await supabase
    .from("attempt_answers")
    .select(
      "id, text_answer, assessment_attempts!inner(id, attempt_number, assessment_id, profiles(first_name,last_name)), questions!inner(statement, points, assessment_id)",
    )
    .is("points_awarded", null)
    .eq("questions.assessment_id", id)
    .eq("assessment_attempts.assessment_id", id);

  type PendingRow = {
    id: string;
    text_answer: string | null;
    assessment_attempts: { id: string; attempt_number: number; profiles: { first_name: string; last_name: string } | null } | null;
    questions: { statement: string; points: number } | null;
  };

  const pendingAnswers = ((pendingAttemptAnswers as unknown as PendingRow[]) ?? []).map((a) => ({
    id: a.id,
    attemptId: a.assessment_attempts?.id ?? "",
    attemptNumber: a.assessment_attempts?.attempt_number ?? 0,
    studentName: a.assessment_attempts?.profiles
      ? `${a.assessment_attempts.profiles.first_name} ${a.assessment_attempts.profiles.last_name}`
      : "—",
    statement: a.questions?.statement ?? "",
    textAnswer: a.text_answer,
    maxPoints: a.questions?.points ?? 0,
  }));

  return (
    <AssessmentDetailClient
      assessment={{
        ...assessment,
        description: assessment.description ?? "",
        available_from: assessment.available_from ?? "",
        available_until: assessment.available_until ?? "",
      }}
      courses={(courses as { id: string; title: string }[]) ?? []}
      questions={normalizedQuestions}
      pendingAnswers={pendingAnswers}
    />
  );
}
