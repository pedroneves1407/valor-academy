"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Plus, Loader2, CheckCircle2, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { developmentPlanSchema, developmentPlanActionSchema, developmentPlanMeetingSchema, type DevelopmentPlanInput, type DevelopmentPlanActionInput, type DevelopmentPlanMeetingInput } from "@/lib/validations/pdi";
import {
  updateDevelopmentPlan,
  sendForAcceptance,
  acceptDevelopmentPlan,
  requestAdjustments,
  completeDevelopmentPlan,
  addDevelopmentPlanAction,
  setActionStatus,
  addDevelopmentPlanMeeting,
} from "./../actions";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  awaiting_acceptance: "Aguardando aceite",
  active: "Ativo",
  completed: "Concluído",
  cancelled: "Cancelado",
};

type Plan = {
  id: string;
  status: string;
  period_start: string;
  period_end: string;
  career_objective: string;
  current_competencies: string;
  competencies_to_develop: string;
  strengths: string;
  improvement_points: string;
  manager_feedback: string;
  employee_feedback: string;
  employeeName: string;
  managerName: string;
};

type ActionItem = {
  id: string;
  description: string;
  due_date: string | null;
  status: "pending" | "in_progress" | "completed";
  courseTitle: string | null;
  responsibleName: string | null;
};

type Meeting = { id: string; meeting_date: string; notes: string | null };

export function PlanDetailClient({
  plan,
  actions,
  meetings,
  courses,
  canManage,
  isOwner,
}: {
  plan: Plan;
  actions: ActionItem[];
  meetings: Meeting[];
  courses: { id: string; title: string }[];
  canManage: boolean;
  isOwner: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Omit<DevelopmentPlanInput, "profile_id">>({
    resolver: zodResolver(developmentPlanSchema.omit({ profile_id: true })) as unknown as Resolver<
      Omit<DevelopmentPlanInput, "profile_id">
    >,
    defaultValues: {
      period_start: plan.period_start,
      period_end: plan.period_end,
      career_objective: plan.career_objective,
      current_competencies: plan.current_competencies,
      competencies_to_develop: plan.competencies_to_develop,
      strengths: plan.strengths,
      improvement_points: plan.improvement_points,
      manager_feedback: plan.manager_feedback,
    },
  });

  function onSubmit(values: Omit<DevelopmentPlanInput, "profile_id">) {
    startTransition(async () => {
      try {
        await updateDevelopmentPlan(plan.id, values);
        toast.success("PDI atualizado.");
      } catch {
        toast.error("Não foi possível atualizar o PDI.");
      }
    });
  }

  function handleSendForAcceptance() {
    startTransition(async () => {
      try {
        await sendForAcceptance(plan.id);
        toast.success("PDI enviado para aceite do colaborador.");
      } catch {
        toast.error("Não foi possível enviar para aceite.");
      }
    });
  }

  function handleComplete() {
    startTransition(async () => {
      try {
        await completeDevelopmentPlan(plan.id);
        toast.success("PDI concluído.");
      } catch {
        toast.error("Não foi possível concluir o PDI.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Link href="/painel/pdi" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar para PDI
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{plan.employeeName}</h1>
          <p className="text-sm text-muted-foreground">Gestor: {plan.managerName}</p>
        </div>
        <Badge variant={plan.status === "active" ? "default" : "outline"}>{STATUS_LABEL[plan.status]}</Badge>
      </div>

      {isOwner && plan.status === "awaiting_acceptance" && <AcceptanceCard planId={plan.id} />}

      {canManage && plan.status === "draft" && (
        <Button onClick={handleSendForAcceptance} disabled={isPending}>
          <Send className="size-4" /> Enviar para aceite do colaborador
        </Button>
      )}
      {canManage && plan.status === "active" && (
        <Button onClick={handleComplete} disabled={isPending}>
          <CheckCircle2 className="size-4" /> Marcar PDI como concluído
        </Button>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início do período</Label>
                <Input type="date" disabled={!canManage} {...register("period_start")} />
              </div>
              <div className="space-y-1.5">
                <Label>Fim do período</Label>
                <Input type="date" disabled={!canManage} {...register("period_end")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Objetivo profissional</Label>
              <Textarea rows={2} disabled={!canManage} {...register("career_objective")} />
            </div>
            <div className="space-y-1.5">
              <Label>Competências atuais</Label>
              <Textarea rows={2} disabled={!canManage} {...register("current_competencies")} />
            </div>
            <div className="space-y-1.5">
              <Label>Competências a desenvolver</Label>
              <Textarea rows={2} disabled={!canManage} {...register("competencies_to_develop")} />
            </div>
            <div className="space-y-1.5">
              <Label>Pontos fortes</Label>
              <Textarea rows={2} disabled={!canManage} {...register("strengths")} />
            </div>
            <div className="space-y-1.5">
              <Label>Pontos de melhoria</Label>
              <Textarea rows={2} disabled={!canManage} {...register("improvement_points")} />
            </div>
            <div className="space-y-1.5">
              <Label>Feedback do gestor</Label>
              <Textarea rows={2} disabled={!canManage} {...register("manager_feedback")} />
            </div>
            {plan.employee_feedback && (
              <div className="space-y-1.5">
                <Label>Feedback do colaborador</Label>
                <p className="text-sm text-muted-foreground bg-muted rounded-md p-3">{plan.employee_feedback}</p>
              </div>
            )}
            {errors.period_start && <p className="text-sm text-destructive">{errors.period_start.message}</p>}
            {canManage && (
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Salvar
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <ActionsSection planId={plan.id} actions={actions} courses={courses} canManage={canManage} />
      <MeetingsSection planId={plan.id} meetings={meetings} canManage={canManage} />
    </div>
  );
}

function AcceptanceCard({ planId }: { planId: string }) {
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      try {
        await acceptDevelopmentPlan(planId, feedback);
        toast.success("PDI aceito.");
      } catch {
        toast.error("Não foi possível aceitar o PDI.");
      }
    });
  }

  function handleRequestAdjustments() {
    startTransition(async () => {
      try {
        await requestAdjustments(planId, feedback);
        toast.success("Ajustes solicitados ao gestor.");
      } catch {
        toast.error("Não foi possível solicitar ajustes.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <p className="font-medium">Este PDI está aguardando seu aceite.</p>
        <Textarea
          rows={2}
          placeholder="Comentário (opcional)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        <div className="flex gap-2">
          <Button onClick={handleAccept} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Aceitar
          </Button>
          <Button variant="outline" onClick={handleRequestAdjustments} disabled={isPending}>
            Solicitar ajustes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionsSection({
  planId,
  actions,
  courses,
  canManage,
}: {
  planId: string;
  actions: ActionItem[];
  courses: { id: string; title: string }[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DevelopmentPlanActionInput>({
    resolver: zodResolver(developmentPlanActionSchema) as unknown as Resolver<DevelopmentPlanActionInput>,
  });

  function onSubmit(values: DevelopmentPlanActionInput) {
    startTransition(async () => {
      try {
        await addDevelopmentPlanAction(planId, values);
        toast.success("Ação adicionada.");
        reset();
        setOpen(false);
      } catch {
        toast.error("Não foi possível adicionar a ação.");
      }
    });
  }

  function handleStatusChange(actionId: string, status: ActionItem["status"]) {
    startTransition(async () => {
      try {
        await setActionStatus(planId, actionId, status);
        toast.success("Status da ação atualizado.");
      } catch {
        toast.error("Não foi possível atualizar a ação.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Ações de desenvolvimento</h2>
          {canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="size-4" /> Nova ação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova ação</DialogTitle>
                  <DialogDescription>Defina uma ação de desenvolvimento e, se aplicável, um curso relacionado.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <Label>Descrição</Label>
                    <Textarea rows={2} aria-invalid={!!errors.description} {...register("description")} />
                    {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Curso relacionado</Label>
                    <Select value={watch("related_course_id") ?? undefined} onValueChange={(v) => setValue("related_course_id", v)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Opcional" /></SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prazo</Label>
                    <Input type="date" {...register("due_date")} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="size-4 animate-spin" />}
                      Adicionar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {actions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ação cadastrada.</p>}
        {actions.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
            <div>
              <p className="text-sm">{a.description}</p>
              <p className="text-xs text-muted-foreground">
                {a.courseTitle && `Curso: ${a.courseTitle} · `}
                {a.due_date && `Prazo: ${new Date(a.due_date).toLocaleDateString("pt-BR")}`}
              </p>
            </div>
            <Select value={a.status} onValueChange={(v) => handleStatusChange(a.id, v as ActionItem["status"])}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MeetingsSection({ planId, meetings, canManage }: { planId: string; meetings: Meeting[]; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DevelopmentPlanMeetingInput>({
    resolver: zodResolver(developmentPlanMeetingSchema) as unknown as Resolver<DevelopmentPlanMeetingInput>,
  });

  function onSubmit(values: DevelopmentPlanMeetingInput) {
    startTransition(async () => {
      try {
        await addDevelopmentPlanMeeting(planId, values);
        toast.success("Reunião registrada.");
        reset();
        setOpen(false);
      } catch {
        toast.error("Não foi possível registrar a reunião.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium flex items-center gap-2">
            <Users className="size-4" /> Reuniões de acompanhamento
          </h2>
          {canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="size-4" /> Registrar reunião
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar reunião</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <Label>Data</Label>
                    <Input type="date" aria-invalid={!!errors.meeting_date} {...register("meeting_date")} />
                    {errors.meeting_date && <p className="text-sm text-destructive">{errors.meeting_date.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notas</Label>
                    <Textarea rows={3} {...register("notes")} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="size-4 animate-spin" />}
                      Salvar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {meetings.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma reunião registrada.</p>}
        {meetings.map((m) => (
          <div key={m.id} className="rounded-md border border-border p-3">
            <p className="text-sm font-medium">{new Date(m.meeting_date).toLocaleDateString("pt-BR")}</p>
            {m.notes && <p className="text-sm text-muted-foreground">{m.notes}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
