import Link from "next/link";
import { KeyRound } from "lucide-react";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center size-12 rounded-xl bg-brand text-brand-foreground">
            <KeyRound className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground">
            Informe seu e-mail corporativo para receber o link de redefinição.
          </p>
        </div>

        <ForgotPasswordForm />

        <div className="text-center text-sm">
          <Link href="/login" className="text-brand hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
