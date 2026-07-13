"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { developmentPlanSchema, type DevelopmentPlanInput } from "@/lib/validations/pdi";
import { createDevelopmentPlan } from "./actions";
import type { Resolver } from "react-hook-form";

export function NewPlanDialog({ employeeOptions }: { employeeOptions: { id: string; name: string }[] }) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DevelopmentPlanInput>({
    resolver: zodResolver(developmentPlanSchema) as unknown as Resolver<DevelopmentPlanInput>,
  });

  function onSubmit(values: DevelopmentPlanInput) {
    startTransition(async () => {
      try {
        await createDevelopmentPlan(values);
      } catch (err) {
        const digest = (err as { digest?: string } | undefined)?.digest;
        if (digest?.startsWith("NEXT_REDIRECT")) throw err;
        toast.error("Não foi possível criar o PDI.");
      }
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Novo PDI
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo PDI</DialogTitle>
          <DialogDescription>Selecione o colaborador e o período do plano.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label>Colaborador</Label>
            <Select value={watch("profile_id")} onValueChange={(v) => setValue("profile_id", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {employeeOptions.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.profile_id && <p className="text-sm text-destructive">{errors.profile_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início do período</Label>
              <Input type="date" aria-invalid={!!errors.period_start} {...register("period_start")} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim do período</Label>
              <Input type="date" aria-invalid={!!errors.period_end} {...register("period_end")} />
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
  );
}
