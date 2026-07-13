import Link from "next/link";
import { BookOpen, Clock } from "lucide-react";
import { requireProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type EnrollmentRow = {
  id: string;
  status: string;
  courses: {
    id: string;
    title: string;
    short_description: string | null;
    cover_image_url: string | null;
    workload_hours: number;
    is_mandatory: boolean;
  } | null;
  course_progress: { progress_pct: number }[] | { progress_pct: number } | null;
};

export default async function MeusCursosPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("enrollments")
    .select("id, status, courses(id, title, short_description, cover_image_url, workload_hours, is_mandatory), course_progress(progress_pct)")
    .eq("profile_id", profile.id)
    .not("course_id", "is", null)
    .order("assigned_at", { ascending: false });

  const enrollments = ((data as unknown as EnrollmentRow[]) ?? []).filter((e) => e.courses);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meus cursos</h1>
        <p className="text-muted-foreground text-sm">Acompanhe seus treinamentos atribuídos.</p>
      </div>

      {enrollments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Você ainda não tem cursos atribuídos.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {enrollments.map((e) => {
          const course = e.courses!;
          const progress = Array.isArray(e.course_progress) ? e.course_progress[0] : e.course_progress;
          const progressPct = progress?.progress_pct ?? 0;
          return (
            <Card key={e.id} className="flex flex-col p-0 overflow-hidden">
              <div className="h-28 bg-muted flex items-center justify-center text-muted-foreground">
                {course.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.cover_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <BookOpen className="size-8" />
                )}
              </div>
              <CardHeader className="pt-4">
                <h2 className="font-medium line-clamp-2">{course.title}</h2>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 pb-4">
                <p className="text-sm text-muted-foreground line-clamp-2">{course.short_description}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {course.is_mandatory && <Badge variant="outline">Obrigatório</Badge>}
                  <Badge variant="outline">
                    <Clock className="size-3" /> {course.workload_hours}h
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={progressPct} className="h-2" />
                  <span className="text-xs text-muted-foreground shrink-0">{progressPct.toFixed(0)}%</span>
                </div>
                <Button asChild className="mt-auto">
                  <Link href={`/painel/meus-cursos/${course.id}`}>
                    {progressPct > 0 ? "Continuar" : "Começar"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
