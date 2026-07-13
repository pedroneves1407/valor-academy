import type { AppRole } from "@/types/database";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  BarChart3,
  ScrollText,
  Settings,
  UserCog,
  UsersRound,
  Network,
  MapPin,
  Briefcase,
  BookOpen,
  Route,
  ClipboardCheck,
  Award,
  Target,
  TrendingUp,
  FileBarChart,
  Megaphone,
  GraduationCap,
  User,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  superadmin: [
    { label: "Visão geral", href: "/painel", icon: LayoutDashboard },
    { label: "Empresas", href: "/painel/empresas", icon: Building2 },
    { label: "Usuários", href: "/painel/usuarios", icon: Users },
    { label: "Planos", href: "/painel/planos", icon: CreditCard },
    { label: "Uso da plataforma", href: "/painel/uso", icon: BarChart3 },
    { label: "Logs", href: "/painel/logs", icon: ScrollText },
    { label: "Configurações", href: "/painel/configuracoes", icon: Settings },
  ],
  company_admin: [
    { label: "Visão geral", href: "/painel", icon: LayoutDashboard },
    { label: "Colaboradores", href: "/painel/colaboradores", icon: UserCog },
    { label: "Equipes", href: "/painel/equipes", icon: UsersRound },
    { label: "Departamentos", href: "/painel/departamentos", icon: Network },
    { label: "Unidades", href: "/painel/unidades", icon: MapPin },
    { label: "Cargos", href: "/painel/cargos", icon: Briefcase },
    { label: "Cursos", href: "/painel/cursos", icon: BookOpen },
    { label: "Trilhas", href: "/painel/trilhas", icon: Route },
    { label: "Avaliações", href: "/painel/avaliacoes", icon: ClipboardCheck },
    { label: "Certificados", href: "/painel/certificados", icon: Award },
    { label: "Metas", href: "/painel/metas", icon: Target },
    { label: "PDI", href: "/painel/pdi", icon: TrendingUp },
    { label: "Relatórios", href: "/painel/relatorios", icon: FileBarChart },
    { label: "Comunicados", href: "/painel/comunicados", icon: Megaphone },
    { label: "Configurações", href: "/painel/configuracoes", icon: Settings },
  ],
  manager: [
    { label: "Visão geral", href: "/painel", icon: LayoutDashboard },
    { label: "Minha equipe", href: "/painel/minha-equipe", icon: UsersRound },
    { label: "Treinamentos", href: "/painel/treinamentos", icon: BookOpen },
    { label: "Desempenho", href: "/painel/desempenho", icon: BarChart3 },
    { label: "Metas", href: "/painel/metas", icon: Target },
    { label: "PDI", href: "/painel/pdi", icon: TrendingUp },
    { label: "Relatórios", href: "/painel/relatorios", icon: FileBarChart },
    { label: "Comunicados", href: "/painel/comunicados", icon: Megaphone },
  ],
  collaborator: [
    { label: "Início", href: "/painel", icon: LayoutDashboard },
    { label: "Meus cursos", href: "/painel/meus-cursos", icon: BookOpen },
    { label: "Minhas trilhas", href: "/painel/minhas-trilhas", icon: Route },
    { label: "Avaliações", href: "/painel/avaliacoes", icon: ClipboardCheck },
    { label: "Certificados", href: "/painel/certificados", icon: Award },
    { label: "Minhas metas", href: "/painel/metas", icon: Target },
    { label: "Meu PDI", href: "/painel/pdi", icon: GraduationCap },
    { label: "Comunicados", href: "/painel/comunicados", icon: Megaphone },
    { label: "Meu perfil", href: "/painel/perfil", icon: User },
  ],
};

export const ROLE_LABEL: Record<AppRole, string> = {
  superadmin: "Superadministrador",
  company_admin: "Administrador da empresa",
  manager: "Gestor",
  collaborator: "Colaborador",
};
