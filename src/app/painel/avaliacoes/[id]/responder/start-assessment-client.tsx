"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Clock, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startAttempt } from "./actions";

export function StartAssessmentClient({
  assessmentId,
  title,
  description,
  timeLimitMinutes,
  maxAttempts,
  attemptsUsed,
}: {
  assessmentId: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  attemptsUsed: number;
}) {
  const [isPending, startTransition] = useTransition();
  const exhausted = attemptsUsed >= maxAttempts;

  function handleStart() {
    startTransition(async () => {
      try {
        await startAttempt(assessmentId);
      } catch (err) {
        const digest = (err as { digest?: string } | undefined)?.digest;
        if (digest?.startsWith("NEXT_REDIRECT")) throw err;
        toast.error(err instanceof Error ? err.message : "Não foi possível iniciar a avaliação.");
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h1 className="text-xl font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <div className="flex gap-2 flex-wrap">
            {timeLimitMinutes ? (
              <Badge variant="outline">
                <Clock className="size-3" /> {timeLimitMinutes} min
              </Badge>
            ) : null}
            <Badge variant="outline">
              <RotateCcw className="size-3" /> {attemptsUsed}/{maxAttempts} tentativas usadas
            </Badge>
          </div>
          {exhausted ? (
            <p className="text-sm text-destructive">Você atingiu o número máximo de tentativas.</p>
          ) : (
            <Button onClick={handleStart} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Iniciar avaliação
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
