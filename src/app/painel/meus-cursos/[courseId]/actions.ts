"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { computeLessonAvailability, type SequenceModule } from "@/lib/courses/sequence";
import { issueCertificateIfEligible } from "@/lib/certificates/issue";

async function loadSequenceState(supabase: Awaited<ReturnType<typeof createClient>>, profileId: string, courseId: string) {
  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, order_index, lessons(id, is_mandatory, order_index)")
    .eq("course_id", courseId)
    .order("order_index");

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lesson_id, status")
    .eq("profile_id", profileId);

  const completedSet = new Set((progress ?? []).filter((p) => p.status === "completed").map((p) => p.lesson_id));

  type ModRow = { id: string; order_index: number; lessons: { id: string; is_mandatory: boolean; order_index: number }[] };
  const sequence: SequenceModule[] = ((modules as ModRow[]) ?? []).map((m) => ({
    id: m.id,
    lessons: [...(m.lessons ?? [])]
      .sort((a, b) => a.order_index - b.order_index)
      .map((l) => ({ id: l.id, is_mandatory: l.is_mandatory, completed: completedSet.has(l.id) })),
  }));

  return sequence;
}

async function ensureEnrollment(profileId: string, courseId: string) {
  const supabase = await createClient();
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("profile_id", profileId)
    .eq("course_id", courseId)
    .single();

  if (!enrollment) throw new Error("Você não está matriculado neste curso.");
  return enrollment.id as string;
}

export async function markLessonComplete(courseId: string, lessonId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const enrollmentId = await ensureEnrollment(profile.id, courseId);

  const sequence = await loadSequenceState(supabase, profile.id, courseId);
  const availability = computeLessonAvailability(sequence);
  if (!availability.get(lessonId)) {
    throw new Error("Esta aula ainda não está liberada. Conclua as aulas anteriores primeiro.");
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, type, min_watch_percent")
    .eq("id", lessonId)
    .single();

  if (!lesson) throw new Error("Aula não encontrada.");

  if (lesson.type === "video") {
    const { data: lp } = await supabase
      .from("lesson_progress")
      .select("id, watch_percent")
      .eq("profile_id", profile.id)
      .eq("lesson_id", lessonId)
      .maybeSingle();

    if (!lp || lp.watch_percent < lesson.min_watch_percent) {
      throw new Error(
        `Assista pelo menos ${lesson.min_watch_percent}% do vídeo antes de concluir a aula.`,
      );
    }
  }

  await supabase.from("lesson_progress").upsert(
    {
      profile_id: profile.id,
      lesson_id: lessonId,
      enrollment_id: enrollmentId,
      status: "completed",
      completed_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,lesson_id" },
  );

  await recalculateCourseProgress(profile.id, courseId, enrollmentId);
  revalidatePath(`/painel/meus-cursos/${courseId}`);
}

export async function updateVideoProgress(
  courseId: string,
  lessonId: string,
  positionSeconds: number,
  durationSeconds: number,
  playbackRate: number,
) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const enrollmentId = await ensureEnrollment(profile.id, courseId);

  const watchPercent = durationSeconds > 0 ? Math.min(100, (positionSeconds / durationSeconds) * 100) : 0;

  const { data: lp } = await supabase
    .from("lesson_progress")
    .upsert(
      {
        profile_id: profile.id,
        lesson_id: lessonId,
        enrollment_id: enrollmentId,
        status: "in_progress",
        watched_seconds: Math.floor(positionSeconds),
        watch_percent: watchPercent,
      },
      { onConflict: "profile_id,lesson_id" },
    )
    .select("id")
    .single();

  if (lp) {
    await supabase
      .from("video_progress")
      .upsert(
        { lesson_progress_id: lp.id, last_position_seconds: Math.floor(positionSeconds), playback_rate: playbackRate },
        { onConflict: "lesson_progress_id" },
      );
  }
}

async function recalculateCourseProgress(profileId: string, courseId: string, enrollmentId: string) {
  const supabase = await createClient();

  const { count: totalLessons } = await supabase
    .from("lessons")
    .select("id, course_modules!inner(course_id)", { count: "exact", head: true })
    .eq("course_modules.course_id", courseId);

  const { data: progressRows } = await supabase
    .from("lesson_progress")
    .select("lesson_id, status, lessons!inner(module_id, course_modules!inner(course_id))")
    .eq("profile_id", profileId)
    .eq("status", "completed")
    .eq("lessons.course_modules.course_id", courseId);

  const completedLessons = progressRows?.length ?? 0;
  const total = totalLessons ?? 0;
  const progressPct = total > 0 ? (completedLessons / total) * 100 : 0;
  const isComplete = total > 0 && completedLessons >= total;

  await supabase.from("course_progress").upsert(
    {
      enrollment_id: enrollmentId,
      profile_id: profileId,
      course_id: courseId,
      completed_lessons: completedLessons,
      total_lessons: total,
      progress_pct: progressPct,
      started_at: new Date().toISOString(),
      completed_at: isComplete ? new Date().toISOString() : null,
    },
    { onConflict: "enrollment_id" },
  );

  await supabase
    .from("enrollments")
    .update({ status: isComplete ? "completed" : "in_progress", completed_at: isComplete ? new Date().toISOString() : null })
    .eq("id", enrollmentId);

  if (isComplete) {
    await issueCertificateIfEligible(profileId, courseId);
  }
}
