import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { computeLessonAvailability, findFirstAvailableIncompleteLesson, type SequenceModule } from "@/lib/courses/sequence";
import { CoursePlayerClient } from "./course-player-client";

type LessonRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  content: string | null;
  file_url: string | null;
  duration_minutes: number;
  is_mandatory: boolean;
  min_watch_percent: number;
  order_index: number;
};

type ModuleRow = {
  id: string;
  title: string;
  order_index: number;
  lessons: LessonRow[];
};

export default async function CoursePlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ aula?: string }>;
}) {
  const { courseId } = await params;
  const { aula } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("profile_id", profile.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!enrollment) notFound();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, certificate_enabled")
    .eq("id", courseId)
    .single();

  if (!course) notFound();

  const { data: modules } = await supabase
    .from("course_modules")
    .select(
      "id, title, order_index, lessons(id, title, description, type, content, file_url, duration_minutes, is_mandatory, min_watch_percent, order_index)",
    )
    .eq("course_id", courseId)
    .order("order_index");

  const { data: lessonProgress } = await supabase
    .from("lesson_progress")
    .select("lesson_id, status, watch_percent, video_progress(last_position_seconds, playback_rate)")
    .eq("profile_id", profile.id);

  type ProgressRow = {
    lesson_id: string;
    status: string;
    watch_percent: number;
    video_progress: { last_position_seconds: number; playback_rate: number }[] | { last_position_seconds: number; playback_rate: number } | null;
  };
  const progressMap = new Map(
    ((lessonProgress as ProgressRow[]) ?? []).map((p) => [
      p.lesson_id,
      {
        status: p.status,
        watchPercent: p.watch_percent,
        lastPosition: Array.isArray(p.video_progress) ? p.video_progress[0]?.last_position_seconds ?? 0 : p.video_progress?.last_position_seconds ?? 0,
      },
    ]),
  );

  const orderedModules = [...((modules as ModuleRow[]) ?? [])].sort((a, b) => a.order_index - b.order_index).map((m) => ({
    ...m,
    lessons: [...(m.lessons ?? [])].sort((a, b) => a.order_index - b.order_index),
  }));

  const sequence: SequenceModule[] = orderedModules.map((m) => ({
    id: m.id,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      is_mandatory: l.is_mandatory,
      completed: progressMap.get(l.id)?.status === "completed",
    })),
  }));

  const availability = computeLessonAvailability(sequence);
  const allLessons = orderedModules.flatMap((m) => m.lessons);

  if (allLessons.length === 0) notFound();

  let currentLessonId = aula;
  if (!currentLessonId || !allLessons.some((l) => l.id === currentLessonId) || !availability.get(currentLessonId)) {
    const firstAvailable = findFirstAvailableIncompleteLesson(sequence);
    if (aula && aula !== firstAvailable) {
      // Tentativa de acessar aula bloqueada ou inexistente diretamente pela URL: redireciona no servidor.
      redirect(`/painel/meus-cursos/${courseId}${firstAvailable ? `?aula=${firstAvailable}` : ""}`);
    }
    currentLessonId = firstAvailable ?? allLessons[0].id;
  }

  const modulesForClient = orderedModules.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      type: l.type as never,
      duration_minutes: l.duration_minutes,
      is_mandatory: l.is_mandatory,
      available: availability.get(l.id) ?? false,
      completed: progressMap.get(l.id)?.status === "completed",
    })),
  }));

  const currentLesson = allLessons.find((l) => l.id === currentLessonId)!;
  const currentProgress = progressMap.get(currentLessonId);

  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l) => progressMap.get(l.id)?.status === "completed").length;

  return (
    <CoursePlayerClient
      key={currentLesson.id}
      courseId={courseId}
      courseTitle={course.title}
      modules={modulesForClient}
      currentLesson={{
        id: currentLesson.id,
        title: currentLesson.title,
        description: currentLesson.description,
        type: currentLesson.type as never,
        content: currentLesson.content,
        fileUrl: currentLesson.file_url,
        durationMinutes: currentLesson.duration_minutes,
        isMandatory: currentLesson.is_mandatory,
        minWatchPercent: currentLesson.min_watch_percent,
        completed: currentProgress?.status === "completed",
        watchPercent: currentProgress?.watchPercent ?? 0,
        lastPosition: currentProgress?.lastPosition ?? 0,
      }}
      overallProgressPct={totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0}
    />
  );
}
