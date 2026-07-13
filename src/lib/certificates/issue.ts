import "server-only";
import { createClient } from "@/lib/supabase/server";

function generateValidationCode() {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `VA-${year}-${random}`;
}

/**
 * Emite o certificado de um curso para um colaborador se, e somente se, todos os
 * critérios forem cumpridos no servidor: progresso 100%, aprovação em todas as
 * avaliações do curso (quando houver) e certificado habilitado no curso. Chamado
 * a cada evento relevante (conclusão de aula, correção de tentativa) — nunca
 * confiar em uma chamada vinda do cliente para emitir certificado.
 */
export async function issueCertificateIfEligible(profileId: string, courseId: string) {
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, organization_id, certificate_enabled, workload_hours")
    .eq("id", courseId)
    .single();

  if (!course || !course.certificate_enabled) return;

  const { data: existing } = await supabase
    .from("certificates")
    .select("id")
    .eq("profile_id", profileId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existing) return;

  const { data: progress } = await supabase
    .from("course_progress")
    .select("progress_pct")
    .eq("profile_id", profileId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!progress || progress.progress_pct < 100) return;

  const { data: assessments } = await supabase
    .from("assessments")
    .select("id")
    .eq("course_id", courseId);

  for (const assessment of assessments ?? []) {
    const { data: passedAttempt } = await supabase
      .from("assessment_attempts")
      .select("id")
      .eq("assessment_id", assessment.id)
      .eq("profile_id", profileId)
      .eq("passed", true)
      .maybeSingle();

    if (!passedAttempt) return;
  }

  await supabase.from("certificates").insert({
    organization_id: course.organization_id,
    profile_id: profileId,
    course_id: courseId,
    validation_code: generateValidationCode(),
    workload_hours: course.workload_hours ?? 0,
  });
}
