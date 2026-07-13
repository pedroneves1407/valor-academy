"use client";

import { useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";

type EntityFormValues = Record<string, string | undefined>;
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

type ParentOption = { id: string; name: string };

type Item = {
  id: string;
  name: string;
  secondaryField?: string;
  parentId?: string | null;
  parentLabel?: string | null;
};

type FieldConfig = {
  name: "name" | "address" | "parent_id";
  label: string;
  placeholder?: string;
  optional?: boolean;
  kind: "text" | "select";
};

export function SimpleEntityManager({
  entityLabel,
  entityLabelPlural,
  items,
  fields,
  parentOptions,
  parentFieldLabel,
  schema,
  onCreate,
  onUpdate,
  onDelete,
}: {
  entityLabel: string;
  entityLabelPlural: string;
  items: Item[];
  fields: FieldConfig[];
  parentOptions?: ParentOption[];
  parentFieldLabel?: string;
  schema: ZodType;
  onCreate: (values: EntityFormValues) => Promise<void>;
  onUpdate: (id: string, values: EntityFormValues) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EntityFormValues>({
    resolver: zodResolver(schema as never) as unknown as Resolver<EntityFormValues>,
  });

  function openCreate() {
    setEditing(null);
    reset({ name: "", address: "", parent_id: "" });
    setDialogOpen(true);
  }

  function openEdit(item: Item) {
    setEditing(item);
    reset({ name: item.name, address: item.secondaryField ?? "", parent_id: item.parentId ?? "" });
    setDialogOpen(true);
  }

  function onSubmit(values: EntityFormValues) {
    startTransition(async () => {
      try {
        if (editing) {
          await onUpdate(editing.id, values);
          toast.success(`${entityLabel} atualizada com sucesso.`);
        } else {
          await onCreate(values);
          toast.success(`${entityLabel} criada com sucesso.`);
        }
        setDialogOpen(false);
      } catch {
        toast.error(`Não foi possível salvar ${entityLabel.toLowerCase()}.`);
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await onDelete(deleteTarget.id);
        toast.success(`${entityLabel} removida com sucesso.`);
      } catch {
        toast.error(`Não foi possível remover ${entityLabel.toLowerCase()}.`);
      } finally {
        setDeleteTarget(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{entityLabelPlural}</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie {entityLabelPlural.toLowerCase()} da sua empresa.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Nova {entityLabel.toLowerCase()}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? `Editar ${entityLabel.toLowerCase()}` : `Nova ${entityLabel.toLowerCase()}`}</DialogTitle>
              <DialogDescription>Preencha as informações abaixo.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {fields.map((field) =>
                field.kind === "text" ? (
                  <div className="space-y-1.5" key={field.name}>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Input
                      id={field.name}
                      placeholder={field.placeholder}
                      aria-invalid={!!errors[field.name]}
                      {...register(field.name)}
                    />
                    {errors[field.name] && (
                      <p className="text-sm text-destructive">{errors[field.name]?.message as string}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5" key={field.name}>
                    <Label>{parentFieldLabel}</Label>
                    <Select
                      value={watch("parent_id") || undefined}
                      onValueChange={(v) => setValue("parent_id", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {(parentOptions ?? []).map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ),
              )}
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              {parentFieldLabel && <TableHead>{parentFieldLabel}</TableHead>}
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={parentFieldLabel ? 3 : 2} className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado. Clique em &quot;Nova {entityLabel.toLowerCase()}&quot; para começar.
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                {parentFieldLabel && <TableCell>{item.parentLabel ?? "—"}</TableCell>}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(item)} aria-label="Editar">
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteTarget(item)}
                      aria-label="Remover"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {entityLabel.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá &quot;{deleteTarget?.name}&quot;. Registros vinculados não serão
              excluídos permanentemente, apenas desativados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
