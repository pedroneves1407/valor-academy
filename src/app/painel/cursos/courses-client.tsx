"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal,
  Copy,
  Archive,
  CheckCircle2,
  Trash2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { createCourse, setCourseStatus, duplicateCourse, deleteCourse } from "./actions";

export type CourseListItem = {
  id: string;
  title: string;
  short_description: string | null;
  cover_image_url: string | null;
  status: "draft" | "published" | "archived";
  level: "beginner" | "intermediate" | "advanced";
  workload_hours: number;
  is_mandatory: boolean;
  category_name: string | null;
};

const STATUS_LABEL = { draft: "Rascunho", published: "Publicado", archived: "Arquivado" } as const;
const LEVEL_LABEL = { beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado" } as const;

const quickCreateSchema = z.object({
  title: z.string().min(2, "Informe o título do curso."),
  level: z.enum(["beginner", "intermediate", "advanced"]),
});
type QuickCreateInput = z.infer<typeof quickCreateSchema>;

export function CoursesClient({ courses }: { courses: CourseListItem[] }) {
  const [view, setView] = useState<"cards" | "table">("cards");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuickCreateInput>({
    resolver: zodResolver(quickCreateSchema),
    defaultValues: { level: "beginner" },
  });

  const filtered = useMemo(
    () =>
      courses.filter((c) => {
        const matchesStatus = statusFilter === "all" || c.status === statusFilter;
        const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
      }),
    [courses, statusFilter, search],
  );

  function onCreate(values: QuickCreateInput) {
    startTransition(async () => {
      try {
        await createCourse({
          title: values.title,
          level: values.level,
          passing_score: 70,
          max_attempts: 3,
          certificate_enabled: true,
          is_mandatory: false,
        });
      } catch (err) {
        const digest = (err as { digest?: string } | undefined)?.digest;
        if (digest?.startsWith("NEXT_REDIRECT")) throw err;
        toast.error("Não foi possível criar o curso.");
      }
    });
  }

  function handleStatusChange(id: string, status: "draft" | "published" | "archived") {
    startTransition(async () => {
      try {
        await setCourseStatus(id, status);
        toast.success("Status do curso atualizado.");
      } catch {
        toast.error("Não foi possível atualizar o status.");
      }
    });
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      try {
        await duplicateCourse(id);
        toast.success("Curso duplicado com sucesso.");
      } catch {
        toast.error("Não foi possível duplicar o curso.");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteCourse(id);
        toast.success("Curso removido com sucesso.");
      } catch {
        toast.error("Não foi possível remover o curso.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cursos</h1>
          <p className="text-muted-foreground text-sm">Crie e gerencie os cursos da sua empresa.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Novo curso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo curso</DialogTitle>
              <DialogDescription>
                Você poderá completar módulos, aulas e demais detalhes em seguida.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onCreate)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input aria-invalid={!!errors.title} {...register("title")} />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Nível</Label>
                <Select value={watch("level")} onValueChange={(v) => setValue("level", v as QuickCreateInput["level"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                  </SelectContent>
                </Select>
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

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder="Buscar curso..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="archived">Arquivado</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-1">
          <Button variant={view === "cards" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setView("cards")} aria-label="Ver em cards">
            <LayoutGrid className="size-4" />
          </Button>
          <Button variant={view === "table" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setView("table")} aria-label="Ver em tabela">
            <ListIcon className="size-4" />
          </Button>
        </div>
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum curso encontrado. Clique em &quot;Novo curso&quot; para começar.
          </CardContent>
        </Card>
      )}

      {view === "cards" && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => (
            <Card key={course.id} className="flex flex-col overflow-hidden p-0">
              <div className="h-32 bg-muted flex items-center justify-center text-muted-foreground text-sm">
                {course.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.cover_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  "Sem capa"
                )}
              </div>
              <CardHeader className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/painel/cursos/${course.id}`} className="font-medium hover:underline line-clamp-2">
                    {course.title}
                  </Link>
                  <CourseActionsMenu
                    course={course}
                    onStatusChange={handleStatusChange}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-2 pb-4">
                <p className="text-sm text-muted-foreground line-clamp-2">{course.short_description}</p>
                <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                  <Badge variant={course.status === "published" ? "default" : course.status === "archived" ? "secondary" : "outline"}>
                    {STATUS_LABEL[course.status]}
                  </Badge>
                  <Badge variant="outline">{LEVEL_LABEL[course.level]}</Badge>
                  {course.is_mandatory && <Badge variant="outline">Obrigatório</Badge>}
                  <Badge variant="outline">
                    <Clock className="size-3" /> {course.workload_hours}h
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {view === "table" && filtered.length > 0 && (
        <Card className="p-0 overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Carga horária</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <Link href={`/painel/cursos/${course.id}`} className="font-medium hover:underline">
                      {course.title}
                    </Link>
                  </TableCell>
                  <TableCell>{LEVEL_LABEL[course.level]}</TableCell>
                  <TableCell>{course.workload_hours}h</TableCell>
                  <TableCell>
                    <Badge variant={course.status === "published" ? "default" : course.status === "archived" ? "secondary" : "outline"}>
                      {STATUS_LABEL[course.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <CourseActionsMenu
                      course={course}
                      onStatusChange={handleStatusChange}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function CourseActionsMenu({
  course,
  onStatusChange,
  onDuplicate,
  onDelete,
}: {
  course: CourseListItem;
  onStatusChange: (id: string, status: "draft" | "published" | "archived") => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Mais ações">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {course.status !== "published" && (
          <DropdownMenuItem onClick={() => onStatusChange(course.id, "published")}>
            <CheckCircle2 className="size-4" /> Publicar
          </DropdownMenuItem>
        )}
        {course.status === "published" && (
          <DropdownMenuItem onClick={() => onStatusChange(course.id, "draft")}>
            Despublicar
          </DropdownMenuItem>
        )}
        {course.status !== "archived" && (
          <DropdownMenuItem onClick={() => onStatusChange(course.id, "archived")}>
            <Archive className="size-4" /> Arquivar
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onDuplicate(course.id)}>
          <Copy className="size-4" /> Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(course.id)}>
          <Trash2 className="size-4" /> Remover
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
