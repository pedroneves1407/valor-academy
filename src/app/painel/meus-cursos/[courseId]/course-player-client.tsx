"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Lock,
  Circle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Video,
  FileText,
  File as FileIcon,
  Link2,
  ClipboardList,
  HelpCircle,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { markLessonComplete, updateVideoProgress } from "./actions";

type LessonType = "video" | "text" | "pdf" | "file" | "external_link" | "activity" | "quiz" | "live_event";

type LessonSummary = {
  id: string;
  title: string;
  type: LessonType;
  duration_minutes: number;
  is_mandatory: boolean;
  available: boolean;
  completed: boolean;
};

type ModuleSummary = {
  id: string;
  title: string;
  lessons: LessonSummary[];
};

type CurrentLesson = {
  id: string;
  title: string;
  description: string | null;
  type: LessonType;
  content: string | null;
  fileUrl: string | null;
  durationMinutes: number;
  isMandatory: boolean;
  minWatchPercent: number;
  completed: boolean;
  watchPercent: number;
  lastPosition: number;
};

const TYPE_ICON: Record<LessonType, typeof Video> = {
  video: Video,
  text: FileText,
  pdf: FileIcon,
  file: FileIcon,
  external_link: Link2,
  activity: ClipboardList,
  quiz: HelpCircle,
  live_event: Radio,
};

export function CoursePlayerClient({
  courseId,
  courseTitle,
  modules,
  currentLesson,
  overallProgressPct,
}: {
  courseId: string;
  courseTitle: string;
  modules: ModuleSummary[];
  currentLesson: CurrentLesson;
  overallProgressPct: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem(`valor-academy:notes:${currentLesson.id}`) ?? "",
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReportRef = useRef(0);

  const allLessons = modules.flatMap((m) => m.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  function handleNotesChange(value: string) {
    setNotes(value);
    localStorage.setItem(`valor-academy:notes:${currentLesson.id}`, value);
  }

  function goToLesson(lessonId: string, available: boolean) {
    if (!available) {
      toast.error("Esta aula ainda não está liberada. Conclua as aulas anteriores primeiro.");
      return;
    }
    router.push(`/painel/meus-cursos/${courseId}?aula=${lessonId}`);
  }

  function handleMarkComplete() {
    startTransition(async () => {
      try {
        await markLessonComplete(courseId, currentLesson.id);
        toast.success("Aula concluída.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível concluir a aula.");
      }
    });
  }

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const now = Date.now();
    if (now - lastReportRef.current < 5000) return;
    lastReportRef.current = now;
    updateVideoProgress(courseId, currentLesson.id, video.currentTime, video.duration, video.playbackRate);
  }

  const Icon = TYPE_ICON[currentLesson.type];
  const canMarkComplete =
    !currentLesson.completed &&
    (currentLesson.type !== "video" || currentLesson.watchPercent >= currentLesson.minWatchPercent);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      <aside className="lg:w-80 shrink-0 space-y-3">
        <div>
          <h2 className="font-semibold">{courseTitle}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={overallProgressPct} className="h-2" />
            <span className="text-xs text-muted-foreground shrink-0">{overallProgressPct.toFixed(0)}%</span>
          </div>
        </div>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {modules.map((mod) => (
            <div key={mod.id}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{mod.title}</p>
              <div className="space-y-0.5">
                {mod.lessons.map((lesson) => {
                  const LIcon = TYPE_ICON[lesson.type];
                  const isCurrent = lesson.id === currentLesson.id;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => goToLesson(lesson.id, lesson.available)}
                      className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors ${
                        isCurrent ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                      } ${!lesson.available ? "opacity-50" : ""}`}
                    >
                      {lesson.completed ? (
                        <CheckCircle2 className="size-4 text-success shrink-0" />
                      ) : lesson.available ? (
                        <Circle className="size-4 shrink-0" />
                      ) : (
                        <Lock className="size-4 shrink-0" />
                      )}
                      <LIcon className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{lesson.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 min-w-0 space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Icon className="size-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold">{currentLesson.title}</h1>
              {currentLesson.isMandatory && <Badge variant="outline">Obrigatória</Badge>}
              {currentLesson.durationMinutes > 0 && (
                <Badge variant="outline">{currentLesson.durationMinutes} min</Badge>
              )}
            </div>

            {currentLesson.description && (
              <p className="text-sm text-muted-foreground">{currentLesson.description}</p>
            )}

            {currentLesson.type === "video" && currentLesson.fileUrl && (
              <video
                ref={videoRef}
                src={currentLesson.fileUrl}
                controls
                className="w-full rounded-md bg-black aspect-video"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(e) => {
                  if (currentLesson.lastPosition > 0) e.currentTarget.currentTime = currentLesson.lastPosition;
                }}
              />
            )}

            {currentLesson.type === "text" && (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">{currentLesson.content}</div>
            )}

            {(currentLesson.type === "pdf" || currentLesson.type === "file") && currentLesson.fileUrl && (
              <Button asChild variant="outline">
                <a href={currentLesson.fileUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="size-4" /> Baixar material
                </a>
              </Button>
            )}

            {currentLesson.type === "external_link" && currentLesson.fileUrl && (
              <Button asChild variant="outline">
                <a href={currentLesson.fileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" /> Abrir link externo
                </a>
              </Button>
            )}

            {(currentLesson.type === "activity" || currentLesson.type === "quiz" || currentLesson.type === "live_event") && (
              <p className="text-sm text-muted-foreground">
                Marque esta aula como concluída após realizar a atividade proposta.
              </p>
            )}

            {currentLesson.type === "video" && !currentLesson.completed && currentLesson.watchPercent < currentLesson.minWatchPercent && (
              <p className="text-xs text-muted-foreground">
                Assista pelo menos {currentLesson.minWatchPercent}% do vídeo para concluir esta aula
                (assistido até agora: {currentLesson.watchPercent.toFixed(0)}%).
              </p>
            )}

            <div className="flex items-center gap-2">
              {currentLesson.completed ? (
                <Badge>
                  <CheckCircle2 className="size-3.5" /> Aula concluída
                </Badge>
              ) : (
                <Button onClick={handleMarkComplete} disabled={!canMarkComplete || isPending}>
                  Marcar como concluída
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-2">
            <p className="text-sm font-medium">Minhas anotações</p>
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Escreva suas anotações sobre esta aula..."
            />
            <p className="text-xs text-muted-foreground">Salvo automaticamente neste dispositivo.</p>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            disabled={!prevLesson}
            onClick={() => prevLesson && goToLesson(prevLesson.id, prevLesson.available)}
          >
            <ChevronLeft className="size-4" /> Aula anterior
          </Button>
          <Button
            variant="outline"
            disabled={!nextLesson || !nextLesson.available}
            onClick={() => nextLesson && goToLesson(nextLesson.id, nextLesson.available)}
          >
            Próxima aula <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
