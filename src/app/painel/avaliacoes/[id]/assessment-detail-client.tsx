"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateAssessment } from "../actions";
import { createQuestion, updateQuestion, deleteQuestion, gradeEssayAnswer } from "./actions";
import { assessmentSchema, questionSchema, type AssessmentInput, type QuestionInput } from "@/lib/validations/assessments";
import type { Resolver } from "react-hook-form";

const QUESTION_TYPE_LABEL: Record<QuestionInput["type"], string> = {
  single_choice: "Múltipla escolha (uma resposta)",
  true_false: "Verdadeiro ou falso",
  multiple_choice: "Múltiplas respostas",
  short_answer: "Resposta curta",
  essay: "Discursiva",
};

type Question = {
  id: string;
  type: QuestionInput["type"];
  statement: string;
  points: number;
  options: { id: string; text: string; is_correct: boolean }[];
};

type PendingAnswer = {
  id: string;
  attemptId: string;
  attemptNumber: number;
  studentName: string;
  statement: string;
  textAnswer: string | null;
  maxPoints: number;
};

export function AssessmentDetailClient({
  assessment,
  courses,
  questions,
  pendingAnswers,
}: {
  assessment: AssessmentInput & { id: string };
  courses: { id: string; title: string }[];
  questions: Question[];
  pendingAnswers: PendingAnswer[];
}) {
  return (
    <div className="space-y-4">
      <Link href="/painel/avaliacoes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar para avaliações
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{assessment.title}</h1>

      <Tabs defaultValue="questoes">
        <TabsList>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          <TabsTrigger value="questoes">Questões</TabsTrigger>
          <TabsTrigger value="correcoes">
            Correções {pendingAnswers.length > 0 && <Badge variant="destructive" className="ml-1">{pendingAnswers.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuracoes" className="pt-4">
          <SettingsTab assessment={assessment} courses={courses} />
        </TabsContent>

        <TabsContent value="questoes" className="pt-4">
          <QuestionsTab assessmentId={assessment.id} questions={questions} />
        </TabsContent>

        <TabsContent value="correcoes" className="pt-4">
          <GradingTab assessmentId={assessment.id} pendingAnswers={pendingAnswers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsTab({
  assessment,
  courses,
}: {
  assessment: AssessmentInput & { id: string };
  courses: { id: string; title: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AssessmentInput>({
    resolver: zodResolver(assessmentSchema) as unknown as Resolver<AssessmentInput>,
    defaultValues: assessment,
  });

  function onSubmit(values: AssessmentInput) {
    startTransition(async () => {
      try {
        await updateAssessment(assessment.id, values);
        toast.success("Avaliação atualizada.");
      } catch {
        toast.error("Não foi possível atualizar a avaliação.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl" noValidate>
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input aria-invalid={!!errors.title} {...register("title")} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={3} {...register("description")} />
          </div>
          <div className="space-y-1.5">
            <Label>Curso</Label>
            <Select value={watch("course_id")} onValueChange={(v) => setValue("course_id", v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tempo limite (minutos)</Label>
              <Input type="number" {...register("time_limit_minutes")} placeholder="Sem limite" />
            </div>
            <div className="space-y-1.5">
              <Label>Nota mínima (%)</Label>
              <Input type="number" {...register("passing_score")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tentativas máximas</Label>
            <Input type="number" {...register("max_attempts")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Disponível a partir de</Label>
              <Input type="datetime-local" {...register("available_from")} />
            </div>
            <div className="space-y-1.5">
              <Label>Disponível até</Label>
              <Input type="datetime-local" {...register("available_until")} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={watch("shuffle_questions")} onCheckedChange={(v) => setValue("shuffle_questions", !!v)} />
            <Label>Embaralhar perguntas</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={watch("shuffle_options")} onCheckedChange={(v) => setValue("shuffle_options", !!v)} />
            <Label>Embaralhar alternativas</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={watch("show_feedback")} onCheckedChange={(v) => setValue("show_feedback", !!v)} />
            <Label>Exibir feedback após responder</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={watch("show_answer_key")} onCheckedChange={(v) => setValue("show_answer_key", !!v)} />
            <Label>Exibir gabarito</Label>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function QuestionsTab({ assessmentId, questions }: { assessmentId: string; questions: Question[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteQuestion(assessmentId, id);
        toast.success("Questão removida.");
      } catch {
        toast.error("Não foi possível remover a questão.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="size-4" /> Nova questão
            </Button>
          </DialogTrigger>
          <QuestionFormDialog
            assessmentId={assessmentId}
            initial={editing}
            onDone={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
          />
        </Dialog>
      </div>

      {questions.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Nenhuma questão criada ainda.</CardContent>
        </Card>
      )}

      {questions.map((q, i) => (
        <Card key={q.id}>
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{i + 1}. {q.statement}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">{QUESTION_TYPE_LABEL[q.type]}</Badge>
                  <Badge variant="outline">{q.points} pts</Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setEditing(q);
                    setDialogOpen(true);
                  }}
                  aria-label="Editar questão"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(q.id)} disabled={isPending} aria-label="Remover questão">
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
            {q.options.length > 0 && (
              <ul className="text-sm text-muted-foreground space-y-0.5 pl-4">
                {q.options.map((o) => (
                  <li key={o.id}>{o.is_correct ? "✓" : "—"} {o.text}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function QuestionFormDialog({
  assessmentId,
  initial,
  onDone,
}: {
  assessmentId: string;
  initial: Question | null;
  onDone: () => void;
}) {
  const [type, setType] = useState<QuestionInput["type"]>(initial?.type ?? "single_choice");
  const [statement, setStatement] = useState(initial?.statement ?? "");
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [options, setOptions] = useState<{ text: string; is_correct: boolean }[]>(
    initial?.options.map((o) => ({ text: o.text, is_correct: o.is_correct })) ?? [
      { text: "", is_correct: true },
      { text: "", is_correct: false },
    ],
  );
  const [isPending, startTransition] = useTransition();

  const needsOptions = type === "single_choice" || type === "true_false" || type === "multiple_choice";

  function handleTypeChange(value: QuestionInput["type"]) {
    setType(value);
    if (value === "true_false") {
      setOptions([
        { text: "Verdadeiro", is_correct: true },
        { text: "Falso", is_correct: false },
      ]);
    }
  }

  function handleSubmit() {
    if (!statement.trim()) {
      toast.error("Informe o enunciado da questão.");
      return;
    }
    const payload: QuestionInput = {
      type,
      statement,
      points,
      options: needsOptions ? options.filter((o) => o.text.trim()) : undefined,
    };
    const parsed = questionSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error("Verifique os campos da questão.");
      return;
    }
    startTransition(async () => {
      try {
        if (initial) {
          await updateQuestion(assessmentId, initial.id, parsed.data);
          toast.success("Questão atualizada.");
        } else {
          await createQuestion(assessmentId, parsed.data);
          toast.success("Questão criada.");
        }
        onDone();
      } catch {
        toast.error("Não foi possível salvar a questão.");
      }
    });
  }

  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{initial ? "Editar questão" : "Nova questão"}</DialogTitle>
        <DialogDescription>Escolha o tipo e defina o enunciado e as alternativas (se aplicável).</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(v) => handleTypeChange(v as QuestionInput["type"])}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(QUESTION_TYPE_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Enunciado</Label>
          <Textarea rows={3} value={statement} onChange={(e) => setStatement(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Pontos</Label>
          <Input type="number" step="0.5" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
        </div>
        {needsOptions && (
          <div className="space-y-2">
            <Label>Alternativas</Label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox
                  checked={opt.is_correct}
                  onCheckedChange={(v) =>
                    setOptions((prev) =>
                      prev.map((o, idx) =>
                        type === "single_choice" || type === "true_false"
                          ? { ...o, is_correct: idx === i ? !!v : false }
                          : idx === i
                            ? { ...o, is_correct: !!v }
                            : o,
                      ),
                    )
                  }
                />
                <Input
                  value={opt.text}
                  onChange={(e) =>
                    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, text: e.target.value } : o)))
                  }
                  placeholder={`Alternativa ${i + 1}`}
                  disabled={type === "true_false"}
                />
                {type !== "true_false" && options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label="Remover alternativa"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            {type !== "true_false" && (
              <Button variant="outline" size="sm" onClick={() => setOptions((prev) => [...prev, { text: "", is_correct: false }])}>
                <Plus className="size-4" /> Adicionar alternativa
              </Button>
            )}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function GradingTab({ assessmentId, pendingAnswers }: { assessmentId: string; pendingAnswers: PendingAnswer[] }) {
  return (
    <div className="space-y-4">
      {pendingAnswers.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhuma resposta discursiva aguardando correção.
          </CardContent>
        </Card>
      )}
      {pendingAnswers.map((a) => (
        <GradingCard key={a.id} assessmentId={assessmentId} answer={a} />
      ))}
    </div>
  );
}

function GradingCard({ assessmentId, answer }: { assessmentId: string; answer: PendingAnswer }) {
  const [points, setPoints] = useState(0);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleGrade() {
    startTransition(async () => {
      try {
        await gradeEssayAnswer(assessmentId, answer.attemptId, answer.id, points, comment);
        toast.success("Correção salva.");
      } catch {
        toast.error("Não foi possível salvar a correção.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <p className="text-sm text-muted-foreground">
          {answer.studentName} — tentativa {answer.attemptNumber}
        </p>
        <p className="font-medium">{answer.statement}</p>
        <p className="text-sm bg-muted rounded-md p-3">{answer.textAnswer || "(sem resposta)"}</p>
        <div className="grid grid-cols-[120px_1fr] gap-3 items-start">
          <div className="space-y-1.5">
            <Label>Pontos (máx. {answer.maxPoints})</Label>
            <Input type="number" max={answer.maxPoints} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Comentário</Label>
            <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleGrade} disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Salvar correção
        </Button>
      </CardContent>
    </Card>
  );
}
