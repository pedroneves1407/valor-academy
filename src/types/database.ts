/**
 * Tipos do banco de dados. Placeholder manual até rodar
 * `npx supabase gen types typescript --project-id <id> > src/types/database.ts`
 * apontando para o projeto Supabase real (ver README, seção "Gerar tipos").
 */
export type AppRole = "superadmin" | "company_admin" | "manager" | "collaborator";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlaceholderTable = { Row: any; Insert: any; Update: any; Relationships: [] };

export type Database = {
  public: {
    Tables: Record<string, PlaceholderTable>;
    Views: Record<string, PlaceholderTable>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
