import { notFound } from "next/navigation";
import { requireOrgPermission } from "@/lib/auth/require-company-admin";
import { createClient } from "@/lib/supabase/server";
import { CourseDetailClient } from "./course-detail-client";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireOrgPermission("course:manage");
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .is("deleted_at", null)
    .single();

  if (!course) notFound();

  const [{ data: modules }, { data: enrollments }, { data: orgProfiles }] = await Promise.all([
    supabase
      .from("course_modules")
      .select("id, title, description, order_index, lessons(id, title, type, duration_minutes, is_mandatory, min_watch_percent, description, content, file_url, order_index)")
      .eq("course_id", id)
      .order("order_index"),
    supabase
      .from("enrollments")
      .select("id, profile_id, status, profiles(first_name,last_name,email), course_progress(progress_pct)")
      .eq("course_id", id),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .order("first_name"),
  ]);

  type ModuleRow = {
    id: string;
    title: string;
    description: string | null;
    order_index: number;
    lessons: {
      id: string;
      title: string;
      type: string;
      duration_minutes: number;
      is_mandatory: boolean;
      min_watch_percent: number;
      description: string | null;
      content: string | null;
      file_url: string | null;
      order_index: number;
    }[];
  };

  const normalizedModules = ((modules as ModuleRow[]) ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    lessons: [...(m.lessons ?? [])].sort((a, b) => a.order_index - b.order_index).map((l) => ({
      id: l.id,
      title: l.title,
      type: l.type as never,
      duration_minutes: l.duration_minutes,
      is_mandatory: l.is_mandatory,
      min_watch_percent: l.min_watch_percent,
      description: l.description,
      content: l.content,
      file_url: l.file_url,
    })),
  }));

  type EnrollmentRow = {
    id: string;
    profile_id: string;
    status: string;
    profiles: { first_name: string; last_name: string; email: string } | null;
    course_progress: { progress_pct: number }[] | { progress_pct: number } | null;
  };

  const normalizedEnrollments = ((enrollments as EnrollmentRow[]) ?? []).map((e) => {
    const progress = Array.isArray(e.course_progress) ? e.course_progress[0] : e.course_progress;
    return {
      id: e.id,
      profile_id: e.profile_id,
      name: e.profiles ? `${e.profiles.first_name} ${e.profiles.last_name}` : "—",
      email: e.profiles?.email ?? "",
      status: e.status,
      progress_pct: progress?.progress_pct ?? 0,
    };
  });

  const profileOptions = ((orgProfiles as { id: string; first_name: string; last_name: string; email: string }[]) ?? []).map((p) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
    email: p.email,
  }));

  return (
    <CourseDetailClient
      course={{
        ...course,
        tags: (course.tags ?? []).join(", "),
        cover_image_url: course.cover_image_url ?? "",
        short_description: course.short_description ?? "",
        full_description: course.full_description ?? "",
        instructor_name: course.instructor_name ?? "",
        target_audience: course.target_audience ?? "",
        due_date: course.due_date ?? "",
      }}
      modules={normalizedModules}
      enrollments={normalizedEnrollments}
      orgProfiles={profileOptions}
    />
  );
}
