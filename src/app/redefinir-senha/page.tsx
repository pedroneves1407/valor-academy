import { KeyRound } from "lucide-react";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center size-12 rounded-xl bg-brand text-brand-foreground">
            <KeyRound className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Definir nova senha</h1>
          <p className="text-sm text-muted-foreground">
            Escolha uma nova senha para acessar a plataforma.
          </p>
        </div>

        <ResetPasswordForm />
      </div>
    </div>
  );
}
