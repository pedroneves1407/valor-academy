import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; erro?: string }>;
}) {
  const { redirect: redirectTo, erro } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center size-12 rounded-xl bg-brand text-brand-foreground">
            <GraduationCap className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Entrar no Valor Academy</h1>
          <p className="text-sm text-muted-foreground">
            Acesse com seu e-mail corporativo e senha.
          </p>
        </div>

        {erro === "usuario_inativo" && (
          <p className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">
            Seu usuário está inativo. Procure o administrador da sua empresa.
          </p>
        )}

        <LoginForm redirectTo={redirectTo} />

        <div className="flex justify-between text-sm">
          <Link href="/esqueci-senha" className="text-brand hover:underline">
            Esqueci minha senha
          </Link>
          <Link href="/" className="text-muted-foreground hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
