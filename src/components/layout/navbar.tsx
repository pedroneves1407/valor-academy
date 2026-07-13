import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { signOutAction } from "@/lib/auth/actions";
import type { NavItem } from "@/lib/navigation";
import type { Profile } from "@/types/domain";

function initials(profile: Profile) {
  return `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase();
}

export function Navbar({ profile, navItems }: { profile: Profile; navItems: NavItem[] }) {
  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-2">
        <MobileNav items={navItems} />
        <p className="text-sm text-muted-foreground hidden sm:block">
          Olá, <span className="font-medium text-foreground">{profile.first_name}</span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notificações">
          <Bell className="size-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-9">
                <AvatarFallback className="bg-brand text-brand-foreground text-sm">
                  {initials(profile)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">
              {profile.first_name} {profile.last_name}
              <p className="text-xs font-normal text-muted-foreground truncate">{profile.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/painel/perfil">Meu perfil</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={signOutAction}>
              <button type="submit" className="w-full">
                <DropdownMenuItem asChild>
                  <span className="flex items-center gap-2 text-destructive">
                    <LogOut className="size-4" /> Sair
                  </span>
                </DropdownMenuItem>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
