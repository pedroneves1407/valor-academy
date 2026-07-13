import { NextResponse, type NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { requireProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  type CertificateRow = {
    id: string;
    profile_id: string;
    validation_code: string;
    workload_hours: number;
    issued_at: string;
    profiles: { first_name: string; last_name: string } | null;
    courses: { title: string } | null;
    organizations: { name: string } | null;
  };

  const { data: certificateData } = await supabase
    .from("certificates")
    .select(
      "id, profile_id, validation_code, workload_hours, issued_at, profiles(first_name,last_name), courses(title), organizations(name)",
    )
    .eq("id", id)
    .single();
  const certificate = certificateData as unknown as CertificateRow | null;

  if (!certificate) return NextResponse.json({ error: "Certificado não encontrado." }, { status: 404 });

  const isOwner = certificate.profile_id === profile.id;
  const canAccess = isOwner || profile.role === "company_admin" || profile.role === "superadmin";
  if (!canAccess) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const learner = certificate.profiles;
  const course = certificate.courses;
  const organization = certificate.organizations;

  const validationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/certificados/validar?codigo=${certificate.validation_code}`;
  const qrDataUrl = await QRCode.toDataURL(validationUrl, { margin: 1, width: 160 });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

  const doc = new PDFDocument({ layout: "landscape", size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc
    .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
    .lineWidth(2)
    .strokeColor("#0F9D58")
    .stroke();

  doc.fontSize(12).fillColor("#64748B").text(organization?.name ?? "Valor Academy", 0, 60, { align: "center" });
  doc.moveDown(1);
  doc.fontSize(30).fillColor("#1F2937").text("Certificado de Conclusão", { align: "center" });
  doc.moveDown(1.5);

  doc.fontSize(14).fillColor("#64748B").text("Certificamos que", { align: "center" });
  doc.moveDown(0.3);
  doc
    .fontSize(24)
    .fillColor("#1E3A8A")
    .text(`${learner?.first_name ?? ""} ${learner?.last_name ?? ""}`.trim(), { align: "center" });
  doc.moveDown(0.5);
  doc
    .fontSize(14)
    .fillColor("#64748B")
    .text(`concluiu o curso "${course?.title ?? ""}" com carga horária de ${certificate.workload_hours} horas.`, {
      align: "center",
    });

  doc.moveDown(2);
  const issuedDate = new Date(certificate.issued_at).toLocaleDateString("pt-BR");
  doc.fontSize(11).fillColor("#64748B").text(`Emitido em ${issuedDate}`, { align: "center" });

  const bottomY = doc.page.height - 140;
  doc.image(qrBuffer, 60, bottomY, { width: 80 });
  doc.fontSize(9).fillColor("#64748B").text(`Código: ${certificate.validation_code}`, 60, bottomY + 85, { width: 120 });
  doc.fontSize(8).text("Valide em:", 60, bottomY + 98, { width: 200 });
  doc.fontSize(8).text(validationUrl, 60, bottomY + 108, { width: 220 });

  doc.moveTo(doc.page.width - 260, bottomY + 40).lineTo(doc.page.width - 60, bottomY + 40).strokeColor("#1F2937").stroke();
  doc.fontSize(10).fillColor("#1F2937").text("Responsável pela emissão", doc.page.width - 260, bottomY + 45, { width: 200, align: "center" });

  doc.end();
  const pdfBuffer = await done;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-${certificate.validation_code}.pdf"`,
    },
  });
}
