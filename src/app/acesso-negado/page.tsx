import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AcessoNegadoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex items-center justify-center size-14 rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-7" />
        </div>
        <h1 className="text-xl font-semibold">Acesso negado</h1>
        <p className="text-sm text-muted-foreground">
          Seu perfil não tem permissão para acessar esta página. Se você acredita que isso é
          um engano, procure o administrador da sua empresa.
        </p>
        <Button asChild>
          <Link href="/painel">Voltar ao painel</Link>
        </Button>
      </div>
    </div>
  );
}
