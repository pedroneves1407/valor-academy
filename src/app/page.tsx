import Link from "next/link";
import { GraduationCap, BookOpen, Award, Target, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Cursos e trilhas",
    description: "Organize treinamentos com sequência obrigatória e progresso real.",
  },
  {
    icon: Award,
    title: "Certificados",
    description: "Emissão automática com validação pública por QR Code.",
  },
  {
    icon: Target,
    title: "Metas e PDI",
    description: "Acompanhe metas individuais, de equipe e planos de desenvolvimento.",
  },
  {
    icon: BarChart3,
    title: "Relatórios",
    description: "Dashboards por perfil com dados reais de desempenho.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-brand text-brand-foreground">
            <GraduationCap className="size-5" />
          </div>
          <span className="font-semibold">Valor Academy</span>
        </div>
        <Button asChild>
          <Link href="/login">Entrar</Link>
        </Button>
      </header>

      <main className="flex-1">
        <section className="px-4 md:px-8 py-20 text-center max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-balance">
            Treinamentos corporativos, do onboarding ao desenvolvimento contínuo.
          </h1>
          <p className="mt-4 text-muted-foreground text-lg text-balance">
            Uma plataforma multiempresa para gerenciar cursos, trilhas, avaliações,
            certificados, metas e PDI — com isolamento total entre empresas.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">Acessar plataforma</Link>
            </Button>
          </div>
        </section>

        <section className="px-4 md:px-8 pb-20 max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-border bg-card p-6">
              <feature.icon className="size-6 text-brand" />
              <h2 className="mt-3 font-medium">{feature.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border px-4 md:px-8 py-6 text-sm text-muted-foreground flex flex-wrap gap-4 justify-between">
        <span>© {new Date().getFullYear()} Valor Academy</span>
        <div className="flex gap-4">
          <Link href="/termos" className="hover:underline">
            Termos de uso
          </Link>
          <Link href="/privacidade" className="hover:underline">
            Privacidade
          </Link>
          <Link href="/certificados/validar" className="hover:underline">
            Validar certificado
          </Link>
        </div>
      </footer>
    </div>
  );
}
