"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AttemptSummary = { attempt_number: number; status: string; passed: boolean | null; score: number | null };

type AssessmentItem = {
  id: string;
  title: string;
  course_title: string;
  max_attempts: number;
  attemptsUsed: number;
  lastAttempt: AttemptSummary | null;
};

export function CollaboratorAssessmentsClient({ assessments }: { assessments: AssessmentItem[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Avaliações</h1>
        <p className="text-muted-foreground text-sm">Provas dos seus cursos atribuídos.</p>
      </div>

      {assessments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma avaliação disponível no momento.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {assessments.map((a) => {
          const exhausted = a.attemptsUsed >= a.max_attempts;
          const passed = a.lastAttempt?.passed;
          return (
            <Card key={a.id}>
              <CardContent className="pt-6 space-y-3">
                <div>
                  <h2 className="font-medium">{a.title}</h2>
                  <p className="text-sm text-muted-foreground">{a.course_title}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">
                    {a.attemptsUsed}/{a.max_attempts} tentativas
                  </Badge>
                  {a.lastAttempt?.status === "grading_pending" && <Badge variant="outline">Aguardando correção</Badge>}
                  {passed === true && <Badge>Aprovado</Badge>}
                  {passed === false && <Badge variant="destructive">Reprovado</Badge>}
                </div>
                {a.lastAttempt ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/painel/avaliacoes/${a.id}/resultado/latest`}>Ver último resultado</Link>
                  </Button>
                ) : null}
                <Button asChild disabled={exhausted && passed !== true} size="sm">
                  <Link href={`/painel/avaliacoes/${a.id}/responder`}>
                    {a.attemptsUsed > 0 ? "Nova tentativa" : "Iniciar avaliação"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
