"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { assessmentSchema, type AssessmentInput } from "@/lib/validations/assessments";
import { createAssessment, deleteAssessment } from "./actions";

type AssessmentListItem = {
  id: string;
  title: string;
  passing_score: number;
  max_attempts: number;
  course_title: string;
};

export function AdminAssessmentsClient({
  assessments,
  courses,
}: {
  assessments: AssessmentListItem[];
  courses: { id: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AssessmentInput>({
    resolver: zodResolver(assessmentSchema) as unknown as Resolver<AssessmentInput>,
    defaultValues: { passing_score: 70, max_attempts: 3, shuffle_questions: false, shuffle_options: false, show_feedback: true, show_answer_key: false },
  });

  function onSubmit(values: AssessmentInput) {
    startTransition(async () => {
      try {
        await createAssessment(values);
      } catch (err) {
        const digest = (err as { digest?: string } | undefined)?.digest;
        if (digest?.startsWith("NEXT_REDIRECT")) throw err;
        toast.error("Não foi possível criar a avaliação.");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteAssessment(id);
        toast.success("Avaliação removida.");
      } catch {
        toast.error("Não foi possível remover a avaliação.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Avaliações</h1>
          <p className="text-muted-foreground text-sm">Crie e gerencie as provas dos seus cursos.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Nova avaliação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova avaliação</DialogTitle>
              <DialogDescription>Você poderá adicionar questões em seguida.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input aria-invalid={!!errors.title} {...register("title")} />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Curso</Label>
                <Select value={watch("course_id")} onValueChange={(v) => setValue("course_id", v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.course_id && <p className="text-sm text-destructive">{errors.course_id.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nota mínima (%)</Label>
                  <Input type="number" {...register("passing_score")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tentativas máximas</Label>
                  <Input type="number" {...register("max_attempts")} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Criar e continuar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Nota mínima</TableHead>
              <TableHead>Tentativas</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assessments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma avaliação criada ainda.
                </TableCell>
              </TableRow>
            )}
            {assessments.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link href={`/painel/avaliacoes/${a.id}`} className="font-medium hover:underline">
                    {a.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{a.course_title}</TableCell>
                <TableCell>{a.passing_score}%</TableCell>
                <TableCell>{a.max_attempts}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(a.id)} aria-label="Remover">
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
