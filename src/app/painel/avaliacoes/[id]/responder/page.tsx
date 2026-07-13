import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { StartAssessmentClient } from "./start-assessment-client";
import { TakeAttemptClient } from "./take-attempt-client";

function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default async function ResponderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tentativa?: string }>;
}) {
  const { id: assessmentId } = await params;
  const { tentativa } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: assessment } = await supabase.from("assessments").select("*").eq("id", assessmentId).single();
  if (!assessment) notFound();

  if (!tentativa) {
    const { count } = await supabase
      .from("assessment_attempts")
      .select("id", { count: "exact", head: true })
      .eq("assessment_id", assessmentId)
      .eq("profile_id", profile.id);

    return (
      <StartAssessmentClient
        assessmentId={assessmentId}
        title={assessment.title}
        description={assessment.description}
        timeLimitMinutes={assessment.time_limit_minutes}
        maxAttempts={assessment.max_attempts}
        attemptsUsed={count ?? 0}
      />
    );
  }

  const { data: attempt } = await supabase
    .from("assessment_attempts")
    .select("id, profile_id, status")
    .eq("id", tentativa)
    .single();

  if (!attempt || attempt.profile_id !== profile.id) notFound();
  if (attempt.status !== "in_progress") redirect(`/painel/avaliacoes/${assessmentId}/resultado/${attempt.id}`);

  const { data: questions } = await supabase
    .from("questions")
    .select("id, type, statement, points, order_index, question_options(id, text, order_index)")
    .eq("assessment_id", assessmentId)
    .order("order_index");

  type QuestionRow = {
    id: string;
    type: string;
    statement: string;
    points: number;
    order_index: number;
    question_options: { id: string; text: string; order_index: number }[];
  };

  let orderedQuestions = [...((questions as QuestionRow[]) ?? [])].sort((a, b) => a.order_index - b.order_index);
  if (assessment.shuffle_questions) orderedQuestions = seededShuffle(orderedQuestions, attempt.id);

  const questionsForClient = orderedQuestions.map((q) => {
    let options = [...(q.question_options ?? [])].sort((a, b) => a.order_index - b.order_index);
    if (assessment.shuffle_options) options = seededShuffle(options, attempt.id + q.id);
    return {
      id: q.id,
      type: q.type as never,
      statement: q.statement,
      points: q.points,
      options: options.map((o) => ({ id: o.id, text: o.text })),
    };
  });

  return (
    <TakeAttemptClient
      assessmentId={assessmentId}
      attemptId={attempt.id}
      title={assessment.title}
      timeLimitMinutes={assessment.time_limit_minutes}
      questions={questionsForClient}
    />
  );
}
