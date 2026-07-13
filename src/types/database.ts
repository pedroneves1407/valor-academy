/**
 * Tipos do banco de dados. Placeholder manual até rodar
 * `npx supabase gen types typescript --project-id <id> > src/types/database.ts`
 * apontando para o projeto Supabase real (ver README, seção "Gerar tipos").
 */
export type AppRole = "superadmin" | "company_admin" | "manager" | "collaborator";

export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
