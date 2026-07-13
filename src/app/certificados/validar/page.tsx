import { CheckCircle2, XCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";

type CertificateValidation = {
  validation_code: string;
  issued_at: string;
  workload_hours: number;
  profiles: { first_name: string; last_name: string } | null;
  courses: { title: string } | null;
  learning_paths: { title: string } | null;
  organizations: { name: string } | null;
};

async function findCertificate(code: string): Promise<CertificateValidation | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("certificates")
    .select(
      "validation_code, issued_at, workload_hours, profiles(first_name,last_name), courses(title), learning_paths(title), organizations(name)",
    )
    .eq("validation_code", code)
    .maybeSingle();
  return data as CertificateValidation | null;
}

export default async function ValidarCertificadoPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  const { codigo } = await searchParams;
  const certificate = codigo ? await findCertificate(codigo) : null;

  return (
    <div className="min-h-screen bg-background px-4 py-16">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Validação pública de certificado</h1>
          <p className="text-sm text-muted-foreground">
            Informe o código de validação impresso no certificado ou no QR Code.
          </p>
        </div>

        <form className="flex gap-2" action="/certificados/validar">
          <Input
            name="codigo"
            defaultValue={codigo}
            placeholder="Ex.: VA-2026-000123"
            aria-label="Código de validação"
          />
          <Button type="submit">
            <Search className="size-4" />
            Validar
          </Button>
        </form>

        {codigo && (
          <Card>
            <CardContent className="pt-6">
              {certificate ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="size-5" />
                    <span className="font-medium">Certificado válido</span>
                  </div>
                  <dl className="text-sm divide-y divide-border">
                    <div className="flex justify-between py-2">
                      <dt className="text-muted-foreground">Participante</dt>
                      <dd className="font-medium">
                        {certificate.profiles?.first_name} {certificate.profiles?.last_name}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-muted-foreground">Curso/Trilha</dt>
                      <dd className="font-medium">
                        {certificate.courses?.title ?? certificate.learning_paths?.title}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-muted-foreground">Empresa emissora</dt>
                      <dd className="font-medium">{certificate.organizations?.name}</dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-muted-foreground">Carga horária</dt>
                      <dd className="font-medium">{certificate.workload_hours}h</dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-muted-foreground">Emitido em</dt>
                      <dd className="font-medium">
                        {new Date(certificate.issued_at).toLocaleDateString("pt-BR")}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-muted-foreground">Código</dt>
                      <dd className="font-mono font-medium">{certificate.validation_code}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="size-5" />
                  <span className="font-medium">Certificado não encontrado ou inválido.</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
