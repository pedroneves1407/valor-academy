"use client";

import Papa from "papaparse";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type UserRow = { name: string; email: string; status: string; role: string };
type EnrollmentRow = { collaborator: string; course: string; status: string; dueDate: string | null };
type CertificateRow = { collaborator: string; course: string; code: string; workloadHours: number; issuedAt: string };
type GoalRow = { owner: string; title: string; status: string; priority: string; progress: number; dueDate: string };

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsClient({
  users,
  enrollments,
  certificates,
  goals,
}: {
  users: UserRow[];
  enrollments: EnrollmentRow[];
  certificates: CertificateRow[];
  goals: GoalRow[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground text-sm">Exporte dados de usuários, cursos, certificados e metas.</p>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="cursos">Cursos</TabsTrigger>
          <TabsTrigger value="certificados">Certificados</TabsTrigger>
          <TabsTrigger value="metas">Metas</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="pt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCsv(
                  "usuarios.csv",
                  users.map((u) => ({ nome: u.name, email: u.email, status: u.status, perfil: u.role })),
                )
              }
            >
              <Download className="size-4" /> Exportar CSV
            </Button>
          </div>
          <Card className="p-0 overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Perfil</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u, i) => (
                  <TableRow key={i}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === "active" ? "default" : "outline"}>{u.status}</Badge>
                    </TableCell>
                    <TableCell>{u.role}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="cursos" className="pt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCsv(
                  "cursos.csv",
                  enrollments.map((e) => ({
                    colaborador: e.collaborator,
                    curso: e.course,
                    status: e.status,
                    prazo: e.dueDate ? new Date(e.dueDate).toLocaleDateString("pt-BR") : "",
                  })),
                )
              }
            >
              <Download className="size-4" /> Exportar CSV
            </Button>
          </div>
          <Card className="p-0 overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell>{e.collaborator}</TableCell>
                    <TableCell>{e.course}</TableCell>
                    <TableCell>{e.status}</TableCell>
                    <TableCell>{e.dueDate ? new Date(e.dueDate).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="certificados" className="pt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCsv(
                  "certificados.csv",
                  certificates.map((c) => ({
                    colaborador: c.collaborator,
                    curso: c.course,
                    codigo: c.code,
                    carga_horaria: c.workloadHours,
                    emitido_em: new Date(c.issuedAt).toLocaleDateString("pt-BR"),
                  })),
                )
              }
            >
              <Download className="size-4" /> Exportar CSV
            </Button>
          </div>
          <Card className="p-0 overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Carga horária</TableHead>
                  <TableHead>Emitido em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>{c.collaborator}</TableCell>
                    <TableCell>{c.course}</TableCell>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell>{c.workloadHours}h</TableCell>
                    <TableCell>{new Date(c.issuedAt).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="metas" className="pt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCsv(
                  "metas.csv",
                  goals.map((g) => ({
                    responsavel: g.owner,
                    titulo: g.title,
                    status: g.status,
                    prioridade: g.priority,
                    progresso: `${g.progress.toFixed(0)}%`,
                    prazo: new Date(g.dueDate).toLocaleDateString("pt-BR"),
                  })),
                )
              }
            >
              <Download className="size-4" /> Exportar CSV
            </Button>
          </div>
          <Card className="p-0 overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Prazo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map((g, i) => (
                  <TableRow key={i}>
                    <TableCell>{g.owner}</TableCell>
                    <TableCell>{g.title}</TableCell>
                    <TableCell>{g.status}</TableCell>
                    <TableCell>{g.progress.toFixed(0)}%</TableCell>
                    <TableCell>{new Date(g.dueDate).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
