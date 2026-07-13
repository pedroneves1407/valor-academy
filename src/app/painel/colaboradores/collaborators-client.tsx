"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Papa from "papaparse";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Search,
  Upload,
  Download,
  MoreHorizontal,
  Pencil,
  Ban,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import {
  inviteCollaboratorSchema,
  type InviteCollaboratorInput,
} from "@/lib/validations/org-structure";
import {
  inviteCollaborator,
  updateCollaborator,
  setCollaboratorStatus,
  bulkSetCollaboratorStatus,
  resendInvite,
  importCollaborators,
} from "./actions";

export type Collaborator = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "superadmin" | "company_admin" | "manager" | "collaborator";
  status: "active" | "inactive" | "pending_invite";
  registration_number: string | null;
  job_position_name: string | null;
  department_name: string | null;
  unit_name: string | null;
  manager_name: string | null;
};

type Option = { id: string; name: string };

const ROLE_LABEL: Record<Collaborator["role"], string> = {
  superadmin: "Superadministrador",
  company_admin: "Administrador",
  manager: "Gestor",
  collaborator: "Colaborador",
};

const STATUS_LABEL: Record<Collaborator["status"], string> = {
  active: "Ativo",
  inactive: "Inativo",
  pending_invite: "Convite pendente",
};

const PAGE_SIZE = 10;

export function CollaboratorsClient({
  collaborators,
  jobPositions,
  departments,
  units,
  managers,
}: {
  collaborators: Collaborator[];
  jobPositions: Option[];
  departments: Option[];
  units: Option[];
  managers: Option[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Collaborator | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return collaborators.filter((c) => {
      const matchesSearch =
        !search ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesRole = roleFilter === "all" || c.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [collaborators, search, statusFilter, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = pageItems.every((c) => next.has(c.id));
      for (const c of pageItems) {
        if (allSelected) next.delete(c.id);
        else next.add(c.id);
      }
      return next;
    });
  }

  function handleBulkStatus(status: "active" | "inactive") {
    startTransition(async () => {
      try {
        await bulkSetCollaboratorStatus([...selected], status);
        toast.success("Colaboradores atualizados com sucesso.");
        setSelected(new Set());
      } catch {
        toast.error("Não foi possível atualizar os colaboradores selecionados.");
      }
    });
  }

  function handleExport() {
    const csv = Papa.unparse(
      filtered.map((c) => ({
        nome: c.first_name,
        sobrenome: c.last_name,
        email: c.email,
        matricula: c.registration_number ?? "",
        perfil: ROLE_LABEL[c.role],
        status: STATUS_LABEL[c.status],
        cargo: c.job_position_name ?? "",
        departamento: c.department_name ?? "",
        unidade: c.unit_name ?? "",
        gestor: c.manager_name ?? "",
      })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "colaboradores.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Colaboradores</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie os colaboradores, gestores e administradores da sua empresa.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="size-4" />
            Exportar
          </Button>
          <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
          <InviteDialog
            open={inviteOpen}
            onOpenChange={setInviteOpen}
            jobPositions={jobPositions}
            departments={departments}
            units={units}
            managers={managers}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
            <SelectItem value="pending_invite">Convite pendente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Perfil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os perfis</SelectItem>
            <SelectItem value="company_admin">Administrador</SelectItem>
            <SelectItem value="manager">Gestor</SelectItem>
            <SelectItem value="collaborator">Colaborador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
          <span>{selected.size} selecionado(s)</span>
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleBulkStatus("active")}>
            Ativar
          </Button>
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleBulkStatus("inactive")}>
            Desativar
          </Button>
        </div>
      )}

      <Card className="p-0 overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={pageItems.length > 0 && pageItems.every((c) => selected.has(c.id))}
                  onCheckedChange={toggleSelectAllOnPage}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum colaborador encontrado.
                </TableCell>
              </TableRow>
            )}
            {pageItems.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelected(c.id)} />
                </TableCell>
                <TableCell className="font-medium">
                  {c.first_name} {c.last_name}
                </TableCell>
                <TableCell className="text-muted-foreground">{c.email}</TableCell>
                <TableCell>{ROLE_LABEL[c.role]}</TableCell>
                <TableCell className="text-muted-foreground">{c.job_position_name ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={c.status === "active" ? "default" : c.status === "inactive" ? "destructive" : "secondary"}
                  >
                    {STATUS_LABEL[c.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Mais ações">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(c)}>
                        <Pencil className="size-4" /> Editar
                      </DropdownMenuItem>
                      {c.status === "pending_invite" && (
                        <DropdownMenuItem
                          onClick={() =>
                            startTransition(async () => {
                              try {
                                await resendInvite(c.email);
                                toast.success("Convite reenviado.");
                              } catch {
                                toast.error("Não foi possível reenviar o convite.");
                              }
                            })
                          }
                        >
                          <Mail className="size-4" /> Reenviar convite
                        </DropdownMenuItem>
                      )}
                      {c.status !== "inactive" ? (
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            startTransition(async () => {
                              try {
                                await setCollaboratorStatus(c.id, "inactive");
                                toast.success("Colaborador desativado.");
                              } catch {
                                toast.error("Não foi possível desativar o colaborador.");
                              }
                            })
                          }
                        >
                          <Ban className="size-4" /> Desativar
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() =>
                            startTransition(async () => {
                              try {
                                await setCollaboratorStatus(c.id, "active");
                                toast.success("Colaborador ativado.");
                              } catch {
                                toast.error("Não foi possível ativar o colaborador.");
                              }
                            })
                          }
                        >
                          <CheckCircle2 className="size-4" /> Ativar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Página {page} de {totalPages} — {filtered.length} colaborador(es)
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      </div>

      {editing && (
        <EditDialog
          collaborator={editing}
          jobPositions={jobPositions}
          departments={departments}
          units={units}
          managers={managers}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  jobPositions,
  departments,
  units,
  managers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobPositions: Option[];
  departments: Option[];
  units: Option[];
  managers: Option[];
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InviteCollaboratorInput>({ resolver: zodResolver(inviteCollaboratorSchema) });

  function onSubmit(values: InviteCollaboratorInput) {
    startTransition(async () => {
      try {
        await inviteCollaborator(values);
        toast.success("Convite enviado com sucesso.");
        reset();
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível convidar o colaborador.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={() => reset({})}>
          <Plus className="size-4" />
          Convidar colaborador
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convidar colaborador</DialogTitle>
          <DialogDescription>
            Um e-mail de convite será enviado para o colaborador definir a senha.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input aria-invalid={!!errors.first_name} {...register("first_name")} />
              {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Sobrenome</Label>
              <Input aria-invalid={!!errors.last_name} {...register("last_name")} />
              {errors.last_name && <p className="text-sm text-destructive">{errors.last_name.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" aria-invalid={!!errors.email} {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Perfil de acesso</Label>
            <Select value={watch("role")} onValueChange={(v) => setValue("role", v as InviteCollaboratorInput["role"])}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="collaborator">Colaborador</SelectItem>
                <SelectItem value="manager">Gestor</SelectItem>
                <SelectItem value="company_admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Matrícula</Label>
            <Input {...register("registration_number")} />
          </div>
          <SelectField label="Cargo" options={jobPositions} value={watch("job_position_id") ?? undefined} onChange={(v) => setValue("job_position_id", v)} />
          <SelectField label="Departamento" options={departments} value={watch("department_id") ?? undefined} onChange={(v) => setValue("department_id", v)} />
          <SelectField label="Unidade" options={units} value={watch("unit_id") ?? undefined} onChange={(v) => setValue("unit_id", v)} />
          <SelectField label="Gestor" options={managers} value={watch("manager_id") ?? undefined} onChange={(v) => setValue("manager_id", v)} />
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Enviar convite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  collaborator,
  jobPositions,
  departments,
  units,
  managers,
  onClose,
}: {
  collaborator: Collaborator;
  jobPositions: Option[];
  departments: Option[];
  units: Option[];
  managers: Option[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Omit<InviteCollaboratorInput, "email">>({
    resolver: zodResolver(inviteCollaboratorSchema.omit({ email: true })),
    defaultValues: {
      first_name: collaborator.first_name,
      last_name: collaborator.last_name,
      role: collaborator.role === "superadmin" ? "company_admin" : collaborator.role,
      registration_number: collaborator.registration_number ?? "",
    },
  });

  function onSubmit(values: Omit<InviteCollaboratorInput, "email">) {
    startTransition(async () => {
      try {
        await updateCollaborator(collaborator.id, values);
        toast.success("Colaborador atualizado com sucesso.");
        onClose();
      } catch {
        toast.error("Não foi possível atualizar o colaborador.");
      }
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar colaborador</DialogTitle>
          <DialogDescription>{collaborator.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input aria-invalid={!!errors.first_name} {...register("first_name")} />
            </div>
            <div className="space-y-1.5">
              <Label>Sobrenome</Label>
              <Input aria-invalid={!!errors.last_name} {...register("last_name")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Perfil de acesso</Label>
            <Select value={watch("role")} onValueChange={(v) => setValue("role", v as InviteCollaboratorInput["role"])}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="collaborator">Colaborador</SelectItem>
                <SelectItem value="manager">Gestor</SelectItem>
                <SelectItem value="company_admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Matrícula</Label>
            <Input {...register("registration_number")} />
          </div>
          <SelectField label="Cargo" options={jobPositions} value={watch("job_position_id") ?? undefined} onChange={(v) => setValue("job_position_id", v)} />
          <SelectField label="Departamento" options={departments} value={watch("department_id") ?? undefined} onChange={(v) => setValue("department_id", v)} />
          <SelectField label="Unidade" options={units} value={watch("unit_id") ?? undefined} onChange={(v) => setValue("unit_id", v)} />
          <SelectField label="Gestor" options={managers} value={watch("manager_id") ?? undefined} onChange={(v) => setValue("manager_id", v)} />
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione (opcional)" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type ParsedRow = {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  registration_number?: string;
};

function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [results, setResults] = useState<{ row: number; email: string; success: boolean; message?: string }[]>([]);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = result.data.map((r) => ({
          first_name: r.nome ?? r.first_name ?? "",
          last_name: r.sobrenome ?? r.last_name ?? "",
          email: r.email ?? "",
          role: r.perfil ?? r.role ?? "collaborator",
          registration_number: r.matricula ?? r.registration_number ?? "",
        }));
        setRows(parsed);
        setResults([]);
      },
    });
  }

  function downloadTemplate() {
    const csv = Papa.unparse([
      { nome: "Maria", sobrenome: "Silva", email: "maria.silva@empresa.com.br", perfil: "collaborator", matricula: "1001" },
    ]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-colaboradores.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function submitImport() {
    startTransition(async () => {
      const roleMap: Record<string, "company_admin" | "manager" | "collaborator"> = {
        administrador: "company_admin",
        gestor: "manager",
        colaborador: "collaborator",
        company_admin: "company_admin",
        manager: "manager",
        collaborator: "collaborator",
      };
      const normalized = rows.map((r) => ({
        ...r,
        role: roleMap[r.role.toLowerCase()] ?? "collaborator",
      }));
      const res = await importCollaborators(normalized as never);
      setResults(res);
      const successCount = res.filter((r) => r.success).length;
      if (successCount > 0) toast.success(`${successCount} colaborador(es) importado(s) com sucesso.`);
      const failCount = res.length - successCount;
      if (failCount > 0) toast.error(`${failCount} linha(s) com erro — veja os detalhes.`);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setRows([]);
          setResults([]);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="size-4" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar colaboradores por CSV</DialogTitle>
          <DialogDescription>
            Colunas esperadas: nome, sobrenome, email, perfil (colaborador/gestor/administrador), matrícula.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleFile} />
          <Button variant="outline" size="sm" onClick={downloadTemplate} type="button">
            Baixar modelo
          </Button>
        </div>

        {rows.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Prévia: {rows.length} linha(s) encontradas.</p>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => {
                    const result = results.find((res) => res.row === i + 1);
                    return (
                      <TableRow key={i}>
                        <TableCell>{r.first_name} {r.last_name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.email}</TableCell>
                        <TableCell>{r.role}</TableCell>
                        <TableCell>
                          {result ? (
                            result.success ? (
                              <Badge>Importado</Badge>
                            ) : (
                              <span className="text-destructive text-xs">{result.message}</span>
                            )
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" disabled={rows.length === 0 || isPending} onClick={submitImport}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Importar {rows.length > 0 && `(${rows.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
