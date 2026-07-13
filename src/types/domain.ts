import type { AppRole } from "./database";

export type Profile = {
  id: string;
  organization_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  role: AppRole;
  status: "active" | "inactive" | "pending_invite";
  job_position_id: string | null;
  department_id: string | null;
  unit_id: string | null;
  manager_id: string | null;
  avatar_url: string | null;
  must_change_password: boolean;
  terms_accepted_at: string | null;
  last_login_at: string | null;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "cancelled";
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  timezone: string;
};
