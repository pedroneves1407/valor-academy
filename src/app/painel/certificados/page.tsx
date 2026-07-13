import Link from "next/link";
import { Award, Download, QrCode } from "lucide-react";
import { requireProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CertificateRow = {
  id: string;
  validation_code: string;
  workload_hours: number;
  issued_at: string;
  courses: { title: string } | null;
  profiles: { first_name: string; last_name: string } | null;
};

export default async function CertificadosPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const isAdmin = profile.role === "company_admin" || profile.role === "superadmin";

  const query = supabase
    .from("certificates")
    .select("id, validation_code, workload_hours, issued_at, courses(title), profiles(first_name,last_name)")
    .order("issued_at", { ascending: false });

  const { data } = isAdmin
    ? await query.eq("organization_id", profile.organization_id)
    : await query.eq("profile_id", profile.id);

  const certificates = (data as unknown as CertificateRow[]) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Certificados</h1>
        <p className="text-muted-foreground text-sm">
          {isAdmin ? "Certificados emitidos na sua empresa." : "Seus certificados de conclusão."}
        </p>
      </div>

      {certificates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Award className="size-8" />
            Nenhum certificado emitido ainda.
          </CardContent>
        </Card>
      )}

      {certificates.length > 0 && (
        <Card className="p-0 overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && <TableHead>Colaborador</TableHead>}
                <TableHead>Curso</TableHead>
                <TableHead>Carga horária</TableHead>
                <TableHead>Emitido em</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {certificates.map((c) => (
                <TableRow key={c.id}>
                  {isAdmin && (
                    <TableCell>
                      {c.profiles?.first_name} {c.profiles?.last_name}
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{c.courses?.title}</TableCell>
                  <TableCell>{c.workload_hours}h</TableCell>
                  <TableCell>{new Date(c.issued_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-mono text-xs">{c.validation_code}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button asChild variant="ghost" size="icon-sm" aria-label="Baixar PDF">
                        <a href={`/api/certificados/${c.id}/pdf`} download>
                          <Download className="size-4" />
                        </a>
                      </Button>
                      <Button asChild variant="ghost" size="icon-sm" aria-label="Validar publicamente">
                        <Link href={`/certificados/validar?codigo=${c.validation_code}`} target="_blank">
                          <QrCode className="size-4" />
                        </Link>
                      </Button>
                    </div>
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
