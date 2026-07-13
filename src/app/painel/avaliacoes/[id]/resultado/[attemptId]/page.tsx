import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, Clock3 } from "lucide-react";
import { requireProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ResultadoPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id: assessmentId, attemptId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: assessment } = await supabase.from("assessments").select("*").eq("id", assessmentId).single();
  if (!assessment) notFound();

  let attemptQuery = supabase
    .from("assessment_attempts")
    .select("id, attempt_number, status, score, passed, submitted_at")
    .eq("assessment_id", assessmentId)
    .eq("profile_id", profile.id);

  if (attemptId === "latest") {
    attemptQuery = attemptQuery.order("attempt_number", { ascending: false }).limit(1);
  } else {
    attemptQuery = attemptQuery.eq("id", attemptId);
  }

  const { data: attempts } = await attemptQuery;
  const attempt = attempts?.[0];
  if (!attempt) notFound();

  const { data: answers } = await supabase
    .from("attempt_answers")
    .select("question_id, selected_option_ids, text_answer, is_correct, points_awarded, questions(statement, type, points, question_options(id, text, is_correct))")
    .eq("attempt_id", attempt.id);

  type AnswerRow = {
    question_id: string;
    selected_option_ids: string[];
    text_answer: string | null;
    is_correct: boolean | null;
    points_awarded: number | null;
    questions: {
      statement: string;
      type: string;
      points: number;
      question_options: { id: string; text: string; is_correct: boolean }[];
    } | null;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-3">
          <h1 className="text-xl font-semibold">{assessment.title} — Resultado</h1>
          <div className="flex gap-2 flex-wrap items-center">
            {attempt.status === "grading_pending" ? (
              <Badge variant="outline">
                <Clock3 className="size-3" /> Aguardando correção
              </Badge>
            ) : attempt.passed ? (
              <Badge>
                <CheckCircle2 className="size-3" /> Aprovado
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="size-3" /> Reprovado
              </Badge>
            )}
            {attempt.score !== null && <span className="text-sm text-muted-foreground">Nota: {attempt.score.toFixed(1)}%</span>}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/painel/avaliacoes">Voltar para avaliações</Link>
          </Button>
        </CardContent>
      </Card>

      {assessment.show_feedback &&
        ((answers as AnswerRow[]) ?? []).map((a, i) => (
          <Card key={a.question_id}>
            <CardContent className="pt-6 space-y-2">
              <p className="font-medium">
                {i + 1}. {a.questions?.statement}
              </p>
              {a.questions?.type !== "essay" && a.questions?.type !== "short_answer" && (
                <p className={`text-sm ${a.is_correct ? "text-success" : "text-destructive"}`}>
                  {a.is_correct ? "Correta" : "Incorreta"}
                </p>
              )}
              {(a.questions?.type === "essay" || a.questions?.type === "short_answer") && (
                <p className="text-sm text-muted-foreground">Resposta: {a.text_answer}</p>
              )}
              {assessment.show_answer_key && a.questions?.question_options?.length ? (
                <ul className="text-sm space-y-1 mt-2">
                  {a.questions.question_options.map((o) => (
                    <li key={o.id} className={o.is_correct ? "text-success" : "text-muted-foreground"}>
                      {o.is_correct ? "✓" : "—"} {o.text}
                    </li>
                  ))}
                </ul>
              ) : null}
              {a.points_awarded !== null && (
                <p className="text-xs text-muted-foreground">
                  Pontos: {a.points_awarded}/{a.questions?.points}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
