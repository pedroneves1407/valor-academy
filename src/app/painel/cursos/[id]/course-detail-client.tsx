"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Video,
  FileText,
  File as FileIcon,
  Link2,
  ClipboardList,
  HelpCircle,
  Radio,
} from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { courseSchema, moduleSchema, lessonSchema, type CourseInput, type ModuleInput, type LessonInput } from "@/lib/validations/courses";
import { updateCourse } from "../actions";
import {
  createModule,
  updateModule,
  deleteModule,
  reorderModule,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLesson,
  enrollProfiles,
  unenrollProfile,
} from "./actions";

type Lesson = {
  id: string;
  title: string;
  type: LessonInput["type"];
  duration_minutes: number;
  is_mandatory: boolean;
  min_watch_percent: number;
  description: string | null;
  content: string | null;
  file_url: string | null;
};

type Module = {
  id: string;
  title: string;
  description: string | null;
  lessons: Lesson[];
};

type Enrollment = {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  status: string;
  progress_pct: number;
};

type Course = CourseInput & { id: string; status: "draft" | "published" | "archived" };

const LESSON_TYPE_ICON: Record<LessonInput["type"], typeof Video> = {
  video: Video,
  text: FileText,
  pdf: FileIcon,
  file: FileIcon,
  external_link: Link2,
  activity: ClipboardList,
  quiz: HelpCircle,
  live_event: Radio,
};

const LESSON_TYPE_LABEL: Record<LessonInput["type"], string> = {
  video: "Vídeo",
  text: "Texto",
  pdf: "PDF",
  file: "Arquivo",
  external_link: "Link externo",
  activity: "Atividade",
  quiz: "Questionário rápido",
  live_event: "Aula ao vivo",
};

export function CourseDetailClient({
  course,
  modules,
  enrollments,
  orgProfiles,
}: {
  course: Course;
  modules: Module[];
  enrollments: Enrollment[];
  orgProfiles: { id: string; name: string; email: string }[];
}) {
  return (
    <div className="space-y-4">
      <Link href="/painel/cursos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar para cursos
      </Link>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
        <Badge variant={course.status === "published" ? "default" : "outline"}>
          {course.status === "published" ? "Publicado" : course.status === "archived" ? "Arquivado" : "Rascunho"}
        </Badge>
      </div>

      <Tabs defaultValue="modulos">
        <TabsList>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="modulos">Módulos e aulas</TabsTrigger>
          <TabsTrigger value="matriculas">Matrículas</TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="pt-4">
          <DetailsTab course={course} />
        </TabsContent>

        <TabsContent value="modulos" className="pt-4">
          <ModulesTab courseId={course.id} modules={modules} />
        </TabsContent>

        <TabsContent value="matriculas" className="pt-4">
          <EnrollmentsTab courseId={course.id} enrollments={enrollments} orgProfiles={orgProfiles} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailsTab({ course }: { course: Course }) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CourseInput>({
    resolver: zodResolver(courseSchema) as unknown as Resolver<CourseInput>,
    defaultValues: course,
  });

  function onSubmit(values: CourseInput) {
    startTransition(async () => {
      try {
        await updateCourse(course.id, values);
        toast.success("Curso atualizado com sucesso.");
      } catch {
        toast.error("Não foi possível atualizar o curso.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl" noValidate>
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input aria-invalid={!!errors.title} {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Descrição curta</Label>
            <Input {...register("short_description")} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição completa</Label>
            <Textarea rows={4} {...register("full_description")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Instrutor</Label>
              <Input {...register("instructor_name")} />
            </div>
            <div className="space-y-1.5">
              <Label>Carga horária (horas)</Label>
              <Input type="number" step="0.5" {...register("workload_hours")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nível</Label>
              <Select value={watch("level")} onValueChange={(v) => setValue("level", v as CourseInput["level"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Iniciante</SelectItem>
                  <SelectItem value="intermediate">Intermediário</SelectItem>
                  <SelectItem value="advanced">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <Input type="date" {...register("due_date")} />
            </div>
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
          <div className="space-y-1.5">
            <Label>Público-alvo</Label>
            <Input {...register("target_audience")} />
          </div>
          <div className="space-y-1.5">
            <Label>Tags (separadas por vírgula)</Label>
            <Input {...register("tags")} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={watch("certificate_enabled")} onCheckedChange={(v) => setValue("certificate_enabled", !!v)} />
            <Label>Certificado habilitado</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={watch("is_mandatory")} onCheckedChange={(v) => setValue("is_mandatory", !!v)} />
            <Label>Treinamento obrigatório</Label>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar alterações
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ModulesTab({ courseId, modules }: { courseId: string; modules: Module[] }) {
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [lessonDialogModuleId, setLessonDialogModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ moduleId: string; lesson: Lesson } | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingModule(null)}>
              <Plus className="size-4" /> Novo módulo
            </Button>
          </DialogTrigger>
          <ModuleFormDialog
            courseId={courseId}
            initial={editingModule}
            onDone={() => {
              setModuleDialogOpen(false);
              setEditingModule(null);
            }}
          />
        </Dialog>
      </div>

      {modules.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum módulo criado ainda.
          </CardContent>
        </Card>
      )}

      {modules.map((mod, modIndex) => (
        <Card key={mod.id}>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium">{mod.title}</h3>
                {mod.description && <p className="text-sm text-muted-foreground">{mod.description}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={modIndex === 0 || isPending}
                  onClick={() => startTransition(() => reorderModule(courseId, mod.id, "up"))}
                  aria-label="Mover módulo para cima"
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={modIndex === modules.length - 1 || isPending}
                  onClick={() => startTransition(() => reorderModule(courseId, mod.id, "down"))}
                  aria-label="Mover módulo para baixo"
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setEditingModule(mod);
                    setModuleDialogOpen(true);
                  }}
                  aria-label="Editar módulo"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await deleteModule(courseId, mod.id);
                        toast.success("Módulo removido.");
                      } catch {
                        toast.error("Não foi possível remover o módulo.");
                      }
                    })
                  }
                  aria-label="Remover módulo"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-border divide-y divide-border">
              {mod.lessons.length === 0 && (
                <p className="text-sm text-muted-foreground p-3">Nenhuma aula neste módulo.</p>
              )}
              {mod.lessons.map((lesson, lessonIndex) => {
                const Icon = LESSON_TYPE_ICON[lesson.type];
                return (
                  <div key={lesson.id} className="flex items-center justify-between gap-2 p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="size-4 text-muted-foreground shrink-0" />
                      <span className="truncate text-sm">{lesson.title}</span>
                      <Badge variant="outline" className="shrink-0">{LESSON_TYPE_LABEL[lesson.type]}</Badge>
                      {lesson.is_mandatory && <Badge variant="outline" className="shrink-0">Obrigatória</Badge>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={lessonIndex === 0 || isPending}
                        onClick={() => startTransition(() => reorderLesson(courseId, mod.id, lesson.id, "up"))}
                        aria-label="Mover aula para cima"
                      >
                        <ChevronUp className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={lessonIndex === mod.lessons.length - 1 || isPending}
                        onClick={() => startTransition(() => reorderLesson(courseId, mod.id, lesson.id, "down"))}
                        aria-label="Mover aula para baixo"
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditingLesson({ moduleId: mod.id, lesson })}
                        aria-label="Editar aula"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              await deleteLesson(courseId, lesson.id);
                              toast.success("Aula removida.");
                            } catch {
                              toast.error("Não foi possível remover a aula.");
                            }
                          })
                        }
                        aria-label="Remover aula"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Dialog open={lessonDialogModuleId === mod.id} onOpenChange={(o) => setLessonDialogModuleId(o ? mod.id : null)}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="size-4" /> Nova aula
                </Button>
              </DialogTrigger>
              <LessonFormDialog
                courseId={courseId}
                moduleId={mod.id}
                initial={null}
                onDone={() => setLessonDialogModuleId(null)}
              />
            </Dialog>
          </CardContent>
        </Card>
      ))}

      {editingLesson && (
        <Dialog open onOpenChange={(o) => !o && setEditingLesson(null)}>
          <LessonFormDialog
            courseId={courseId}
            moduleId={editingLesson.moduleId}
            initial={editingLesson.lesson}
            onDone={() => setEditingLesson(null)}
          />
        </Dialog>
      )}
    </div>
  );
}

function ModuleFormDialog({
  courseId,
  initial,
  onDone,
}: {
  courseId: string;
  initial: Module | null;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ModuleInput>({
    resolver: zodResolver(moduleSchema),
    values: initial ? { title: initial.title, description: initial.description ?? "" } : { title: "", description: "" },
  });

  function onSubmit(values: ModuleInput) {
    startTransition(async () => {
      try {
        if (initial) {
          await updateModule(courseId, initial.id, values);
          toast.success("Módulo atualizado.");
        } else {
          await createModule(courseId, values);
          toast.success("Módulo criado.");
        }
        onDone();
      } catch {
        toast.error("Não foi possível salvar o módulo.");
      }
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{initial ? "Editar módulo" : "Novo módulo"}</DialogTitle>
        <DialogDescription>Módulos organizam as aulas do curso em blocos sequenciais.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input aria-invalid={!!errors.title} {...register("title")} />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea rows={3} {...register("description")} />
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

function LessonFormDialog({
  courseId,
  moduleId,
  initial,
  onDone,
}: {
  courseId: string;
  moduleId: string;
  initial: Lesson | null;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LessonInput>({
    resolver: zodResolver(lessonSchema) as unknown as Resolver<LessonInput>,
    values: initial
      ? {
          title: initial.title,
          description: initial.description ?? "",
          type: initial.type,
          content: initial.content ?? "",
          file_url: initial.file_url ?? "",
          duration_minutes: initial.duration_minutes,
          is_mandatory: initial.is_mandatory,
          min_watch_percent: initial.min_watch_percent,
        }
      : {
          title: "",
          description: "",
          type: "video",
          content: "",
          file_url: "",
          duration_minutes: 0,
          is_mandatory: true,
          min_watch_percent: 90,
        },
  });

  const type = watch("type");

  function onSubmit(values: LessonInput) {
    startTransition(async () => {
      try {
        if (initial) {
          await updateLesson(courseId, initial.id, values);
          toast.success("Aula atualizada.");
        } else {
          await createLesson(courseId, moduleId, values);
          toast.success("Aula criada.");
        }
        onDone();
      } catch {
        toast.error("Não foi possível salvar a aula.");
      }
    });
  }

  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{initial ? "Editar aula" : "Nova aula"}</DialogTitle>
        <DialogDescription>Defina o conteúdo e as regras de conclusão da aula.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input aria-invalid={!!errors.title} {...register("title")} />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(v) => setValue("type", v as LessonInput["type"])}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(LESSON_TYPE_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea rows={2} {...register("description")} />
        </div>
        {type === "text" ? (
          <div className="space-y-1.5">
            <Label>Conteúdo</Label>
            <Textarea rows={6} {...register("content")} />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>URL do conteúdo</Label>
            <Input placeholder="https://..." aria-invalid={!!errors.file_url} {...register("file_url")} />
            {errors.file_url && <p className="text-sm text-destructive">{errors.file_url.message}</p>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Duração (minutos)</Label>
            <Input type="number" {...register("duration_minutes")} />
          </div>
          {type === "video" && (
            <div className="space-y-1.5">
              <Label>% mínimo assistido</Label>
              <Input type="number" {...register("min_watch_percent")} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={watch("is_mandatory")} onCheckedChange={(v) => setValue("is_mandatory", !!v)} />
          <Label>Aula obrigatória</Label>
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

function EnrollmentsTab({
  courseId,
  enrollments,
  orgProfiles,
}: {
  courseId: string;
  enrollments: Enrollment[];
  orgProfiles: { id: string; name: string; email: string }[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const availableProfiles = orgProfiles.filter((p) => !enrollments.some((e) => e.profile_id === p.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAssign() {
    startTransition(async () => {
      try {
        await enrollProfiles(courseId, [...selected]);
        toast.success("Colaboradores atribuídos ao curso.");
        setSelected(new Set());
        setDialogOpen(false);
      } catch {
        toast.error("Não foi possível atribuir o curso.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Atribuir colaboradores
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atribuir curso</DialogTitle>
              <DialogDescription>Selecione os colaboradores que devem realizar este curso.</DialogDescription>
            </DialogHeader>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {availableProfiles.length === 0 && (
                <p className="text-sm text-muted-foreground">Todos os colaboradores já estão atribuídos.</p>
              )}
              {availableProfiles.map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded-md p-2 hover:bg-muted cursor-pointer">
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                  <span className="text-sm">{p.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{p.email}</span>
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button disabled={selected.size === 0 || isPending} onClick={handleAssign}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Atribuir ({selected.size})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum colaborador atribuído ainda.
                </TableCell>
              </TableRow>
            )}
            {enrollments.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <div>{e.name}</div>
                  <div className="text-xs text-muted-foreground">{e.email}</div>
                </TableCell>
                <TableCell>{e.status}</TableCell>
                <TableCell>{e.progress_pct.toFixed(0)}%</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await unenrollProfile(courseId, e.id);
                          toast.success("Atribuição removida.");
                        } catch {
                          toast.error("Não foi possível remover a atribuição.");
                        }
                      })
                    }
                    aria-label="Remover atribuição"
                  >
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
