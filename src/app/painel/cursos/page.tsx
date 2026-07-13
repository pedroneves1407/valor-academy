import { requireOrgPermission } from "@/lib/auth/require-company-admin";
import { createClient } from "@/lib/supabase/server";
import { CoursesClient, type CourseListItem } from "./courses-client";

type CourseRow = {
  id: string;
  title: string;
  short_description: string | null;
  cover_image_url: string | null;
  status: CourseListItem["status"];
  level: CourseListItem["level"];
  workload_hours: number;
  is_mandatory: boolean;
  course_categories: { name: string } | null;
};

export default async function CursosPage() {
  const profile = await requireOrgPermission("course:manage");
  const supabase = await createClient();

  const { data } = await supabase
    .from("courses")
    .select(
      "id, title, short_description, cover_image_url, status, level, workload_hours, is_mandatory, course_categories(name)",
    )
    .eq("organization_id", profile.organization_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const courses: CourseListItem[] = ((data as CourseRow[]) ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    short_description: c.short_description,
    cover_image_url: c.cover_image_url,
    status: c.status,
    level: c.level,
    workload_hours: c.workload_hours,
    is_mandatory: c.is_mandatory,
    category_name: c.course_categories?.name ?? null,
  }));

  return <CoursesClient courses={courses} />;
}
