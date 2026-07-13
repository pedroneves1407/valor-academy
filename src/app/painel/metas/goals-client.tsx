"use client";

import { useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Loader2, TrendingUp, Trash2, Pencil, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
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
import { goalSchema, goalUpdateSchema, type GoalInput, type GoalUpdateInput } from "@/lib/validations/goals";
import { createGoal, updateGoal, deleteGoal, addGoalUpdate, setGoalStatus } from "./actions";

export type GoalItem = {
  id: string;
  title: string;
  description: string | null;
  type: "numeric" | "percentage" | "done_not_done" | "milestone" | "okr";
  status: "not_started" | "in_progress" | "at_risk" | "overdue" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  initial_value: number;
  current_value: number;
  target_value: number;
  unit_label: string | null;
  start_date: string;
  due_date: string;
  owner_id: string;
  owner_name: string;
};

const STATUS_LABEL: Record<GoalItem["status"], string> = {
  not_started: "Não iniciada",
  in_progress: "Em andamento",
  at_risk: "Em risco",
  overdue: "Atrasada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const STATUS_VARIANT: Record<GoalItem["status"], "default" | "outline" | "destructive" | "secondary"> = {
  not_started: "outline",
  in_progress: "outline",
  at_risk: "secondary",
  overdue: "destructive",
  completed: "default",
  cancelled: "secondary",
};

const PRIORITY_LABEL: Record<GoalItem["priority"], string> = { low: "Baixa", medium: "Média", high: "Alta" };

export function GoalsClient({
  goals,
  currentProfileId,
  canManage,
  ownerOptions,
}: {
  goals: GoalItem[];
  currentProfileId: string;
  canManage: boolean;
  ownerOptions: { id: string; name: string }[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<GoalItem | null>(null);
  const [updatingProgress, setUpdatingProgress] = useState<GoalItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteGoal(id);
        toast.success("Meta removida.");
      } catch {
        toast.error("Não foi possível remover a meta.");
      }
    });
  }

  function handleCancel(id: string) {
    startTransition(async () => {
      try {
        await setGoalStatus(id, "cancelled");
        toast.success("Meta cancelada.");
      } catch {
        toast.error("Não foi possível cancelar a meta.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Metas</h1>
          <p className="text-muted-foreground text-sm">Acompanhe metas individuais e de equipe.</p>
        </div>
        {canManage && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="size-4" /> Nova meta
              </Button>
            </DialogTrigger>
            <GoalFormDialog ownerOptions={ownerOptions} initial={null} onDone={() => setCreateOpen(false)} />
          </Dialog>
        )}
      </div>

      {goals.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Nenhuma meta cadastrada ainda.</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const progressPct = goal.target_value !== 0 ? Math.min(100, (goal.current_value / goal.target_value) * 100) : 0;
          const canEditThis = canManage;
          const canUpdateThis = canManage || goal.owner_id === currentProfileId;
          return (
            <Card key={goal.id}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-medium">{goal.title}</h2>
                    <p className="text-xs text-muted-foreground">{goal.owner_name}</p>
                  </div>
                  {canEditThis && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(goal)} aria-label="Editar meta">
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleCancel(goal.id)} disabled={isPending} aria-label="Cancelar meta">
                        <Ban className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(goal.id)} disabled={isPending} aria-label="Remover meta">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
                {goal.description && <p className="text-sm text-muted-foreground">{goal.description}</p>}
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={STATUS_VARIANT[goal.status]}>{STATUS_LABEL[goal.status]}</Badge>
                  <Badge variant="outline">Prioridade {PRIORITY_LABEL[goal.priority]}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={progressPct} className="h-2" />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {goal.current_value}/{goal.target_value} {goal.unit_label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Prazo: {new Date(goal.due_date).toLocaleDateString("pt-BR")}
                </p>
                {canUpdateThis && goal.status !== "cancelled" && goal.status !== "completed" && (
                  <Button size="sm" variant="outline" onClick={() => setUpdatingProgress(goal)}>
                    <TrendingUp className="size-4" /> Atualizar progresso
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <GoalFormDialog ownerOptions={ownerOptions} initial={editing} onDone={() => setEditing(null)} />
        </Dialog>
      )}

      {updatingProgress && (
        <Dialog open onOpenChange={(o) => !o && setUpdatingProgress(null)}>
          <ProgressUpdateDialog goal={updatingProgress} onDone={() => setUpdatingProgress(null)} />
        </Dialog>
      )}
    </div>
  );
}

function GoalFormDialog({
  ownerOptions,
  initial,
  onDone,
}: {
  ownerOptions: { id: string; name: string }[];
  initial: GoalItem | null;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GoalInput>({
    resolver: zodResolver(goalSchema) as unknown as Resolver<GoalInput>,
    defaultValues: initial
      ? {
          title: initial.title,
          description: initial.description ?? "",
          type: initial.type,
          owner_id: initial.owner_id,
          start_date: initial.start_date,
          due_date: initial.due_date,
          initial_value: initial.initial_value,
          target_value: initial.target_value,
          unit_label: initial.unit_label ?? "",
          weight: 1,
          priority: initial.priority,
        }
      : { type: "numeric", initial_value: 0, target_value: 100, weight: 1, priority: "medium" },
  });

  function onSubmit(values: GoalInput) {
    startTransition(async () => {
      try {
        if (initial) {
          await updateGoal(initial.id, values);
          toast.success("Meta atualizada.");
        } else {
          await createGoal(values);
          toast.success("Meta criada.");
        }
        onDone();
      } catch {
        toast.error("Não foi possível salvar a meta.");
      }
    });
  }

  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{initial ? "Editar meta" : "Nova meta"}</DialogTitle>
        <DialogDescription>Defina o responsável, o tipo e o período da meta.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input aria-invalid={!!errors.title} {...register("title")} />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea rows={2} {...register("description")} />
        </div>
        <div className="space-y-1.5">
          <Label>Responsável</Label>
          <Select value={watch("owner_id")} onValueChange={(v) => setValue("owner_id", v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {ownerOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.owner_id && <p className="text-sm text-destructive">{errors.owner_id.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={watch("type")} onValueChange={(v) => setValue("type", v as GoalInput["type"])}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="numeric">Numérica</SelectItem>
              <SelectItem value="percentage">Percentual</SelectItem>
              <SelectItem value="done_not_done">Concluída ou não concluída</SelectItem>
              <SelectItem value="milestone">Marco</SelectItem>
              <SelectItem value="okr">OKR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Data inicial</Label>
            <Input type="date" aria-invalid={!!errors.start_date} {...register("start_date")} />
          </div>
          <div className="space-y-1.5">
            <Label>Prazo</Label>
            <Input type="date" aria-invalid={!!errors.due_date} {...register("due_date")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Valor inicial</Label>
            <Input type="number" {...register("initial_value")} disabled={!!initial} />
          </div>
          <div className="space-y-1.5">
            <Label>Valor esperado</Label>
            <Input type="number" {...register("target_value")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Unidade de medida</Label>
            <Input placeholder="Ex.: vendas, %, pontos" {...register("unit_label")} />
          </div>
          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v as GoalInput["priority"])}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ProgressUpdateDialog({ goal, onDone }: { goal: GoalItem; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalUpdateInput>({
    resolver: zodResolver(goalUpdateSchema) as unknown as Resolver<GoalUpdateInput>,
    defaultValues: { new_value: goal.current_value },
  });

  function onSubmit(values: GoalUpdateInput) {
    startTransition(async () => {
      try {
        await addGoalUpdate(goal.id, values);
        toast.success("Progresso atualizado.");
        onDone();
      } catch {
        toast.error("Não foi possível atualizar o progresso.");
      }
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Atualizar progresso</DialogTitle>
        <DialogDescription>{goal.title}</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label>Novo valor (meta: {goal.target_value} {goal.unit_label})</Label>
          <Input type="number" aria-invalid={!!errors.new_value} {...register("new_value")} />
          {errors.new_value && <p className="text-sm text-destructive">{errors.new_value.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Comentário</Label>
          <Textarea rows={2} {...register("comment")} />
        </div>
        <div className="space-y-1.5">
          <Label>Evidência (URL)</Label>
          <Input placeholder="https://..." {...register("evidence_url")} />
          {errors.evidence_url && <p className="text-sm text-destructive">{errors.evidence_url.message}</p>}
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
