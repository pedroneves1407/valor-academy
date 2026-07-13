import { requireProfile } from "@/lib/auth/current-profile";
import { ROLE_LABEL } from "@/lib/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PainelHomePage() {
  const profile = await requireProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {profile.first_name}!
        </h1>
        <p className="text-muted-foreground">
          Você está conectado como {ROLE_LABEL[profile.role]}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fundação da plataforma concluída</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Autenticação, isolamento multiempresa, permissões por perfil e navegação já
            estão funcionais. Os módulos de cursos, avaliações, certificados, metas, PDI,
            relatórios e comunicados serão adicionados nas próximas etapas descritas em{" "}
            <code className="text-foreground">PLANO_IMPLEMENTACAO.md</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
