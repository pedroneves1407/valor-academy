"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { submitAttempt } from "./actions";

type Question = {
  id: string;
  type: "single_choice" | "true_false" | "multiple_choice" | "short_answer" | "essay";
  statement: string;
  points: number;
  options: { id: string; text: string }[];
};

export function TakeAttemptClient({
  assessmentId,
  attemptId,
  title,
  timeLimitMinutes,
  questions,
}: {
  assessmentId: string;
  attemptId: string;
  title: string;
  timeLimitMinutes: number | null;
  questions: Question[];
}) {
  const [answers, setAnswers] = useState<Record<string, { selectedOptionIds?: string[]; textAnswer?: string }>>({});
  const [isPending, startTransition] = useTransition();
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMinutes ? timeLimitMinutes * 60 : null);

  const allAnswered = useMemo(
    () =>
      questions.every((q) => {
        const a = answers[q.id];
        if (!a) return false;
        if (q.type === "short_answer" || q.type === "essay") return !!a.textAnswer?.trim();
        return (a.selectedOptionIds?.length ?? 0) > 0;
      }),
    [answers, questions],
  );

  function handleSubmit() {
    startTransition(async () => {
      try {
        const payload = questions.map((q) => ({ questionId: q.id, ...answers[q.id] }));
        await submitAttempt(assessmentId, attemptId, payload);
      } catch (err) {
        const digest = (err as { digest?: string } | undefined)?.digest;
        if (digest?.startsWith("NEXT_REDIRECT")) throw err;
        toast.error("Não foi possível enviar a avaliação.");
      }
    });
  }

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  function setSingle(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: { selectedOptionIds: [optionId] } }));
  }

  function toggleMultiple(questionId: string, optionId: string) {
    setAnswers((prev) => {
      const current = new Set(prev[questionId]?.selectedOptionIds ?? []);
      if (current.has(optionId)) current.delete(optionId);
      else current.add(optionId);
      return { ...prev, [questionId]: { selectedOptionIds: [...current] } };
    });
  }

  function setText(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: { textAnswer: value } }));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        {secondsLeft !== null && (
          <Badge variant={secondsLeft < 60 ? "destructive" : "outline"}>
            <Clock className="size-3" /> {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          </Badge>
        )}
      </div>

      {questions.map((q, index) => (
        <Card key={q.id}>
          <CardContent className="pt-6 space-y-3">
            <p className="font-medium">
              {index + 1}. {q.statement}
            </p>
            {(q.type === "single_choice" || q.type === "true_false") && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id]?.selectedOptionIds?.[0] === opt.id}
                      onChange={() => setSingle(q.id, opt.id)}
                      className="size-4 accent-current"
                    />
                    <span className="text-sm">{opt.text}</span>
                  </label>
                ))}
              </div>
            )}
            {q.type === "multiple_choice" && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={answers[q.id]?.selectedOptionIds?.includes(opt.id) ?? false}
                      onCheckedChange={() => toggleMultiple(q.id, opt.id)}
                    />
                    <span className="text-sm">{opt.text}</span>
                  </label>
                ))}
              </div>
            )}
            {(q.type === "short_answer" || q.type === "essay") && (
              <Textarea
                rows={q.type === "essay" ? 5 : 2}
                value={answers[q.id]?.textAnswer ?? ""}
                onChange={(e) => setText(q.id, e.target.value)}
                placeholder="Sua resposta..."
              />
            )}
          </CardContent>
        </Card>
      ))}

      <Button onClick={handleSubmit} disabled={!allAnswered || isPending}>
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Enviar avaliação
      </Button>
    </div>
  );
}
