import { requireProfile } from "@/lib/auth/current-profile";
import { CollaboratorDashboard } from "./collaborator-dashboard";
import { ManagerDashboard } from "./manager-dashboard";
import { AdminDashboard } from "./admin-dashboard";
import { SuperadminDashboard } from "./superadmin-dashboard";

export default async function PainelHomePage() {
  const profile = await requireProfile();

  switch (profile.role) {
    case "superadmin":
      return <SuperadminDashboard profile={profile} />;
    case "company_admin":
      return <AdminDashboard profile={profile} />;
    case "manager":
      return <ManagerDashboard profile={profile} />;
    default:
      return <CollaboratorDashboard profile={profile} />;
  }
}
