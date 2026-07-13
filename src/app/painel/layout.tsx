import { requireProfile } from "@/lib/auth/current-profile";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { NAV_BY_ROLE, ROLE_LABEL } from "@/lib/navigation";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const navItems = NAV_BY_ROLE[profile.role];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar items={navItems} roleLabel={ROLE_LABEL[profile.role]} />
      <div className="flex flex-1 flex-col min-w-0">
        <Navbar profile={profile} navItems={navItems} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
