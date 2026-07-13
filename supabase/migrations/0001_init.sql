-- Valor Academy — schema inicial
-- Convenção: toda tabela multiempresa tem organization_id (exceto organizations e plans).
-- RLS habilitado em todas as tabelas; isolamento garantido por organization_id = auth.jwt() claim.

create extension if not exists "pgcrypto";

-- =========================================================================
-- PLANOS E ORGANIZAÇÕES (SaaS)
-- =========================================================================

create table plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  max_users int not null default 50,
  max_admins int not null default 3,
  max_courses int not null default 20,
  max_storage_mb int not null default 5120,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  cnpj text,
  logo_url text,
  primary_color text default '#0F9D58',
  secondary_color text default '#1E3A8A',
  domain text,
  timezone text not null default 'America/Belem',
  locale text not null default 'pt-BR',
  status text not null default 'active' check (status in ('active','suspended','cancelled')),
  plan_id uuid references plans(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  plan_id uuid not null references plans(id),
  status text not null default 'active' check (status in ('active','trialing','past_due','cancelled')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organization_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  video_completion_threshold_pct int not null default 90,
  default_passing_score numeric(5,2) not null default 70,
  default_max_attempts int not null default 3,
  gamification_enabled boolean not null default true,
  certificates_enabled boolean not null default true,
  ranking_enabled boolean not null default true,
  terms_of_use text,
  privacy_policy text,
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- USUÁRIOS E PERFIS
-- =========================================================================

-- profiles espelha auth.users (Supabase Auth) 1:1, adicionando dados de negócio.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  cpf text,
  phone text,
  avatar_url text,
  registration_number text,
  admission_date date,
  status text not null default 'active' check (status in ('active','inactive','pending_invite')),
  role text not null default 'collaborator' check (role in ('superadmin','company_admin','manager','collaborator')),
  job_position_id uuid,
  department_id uuid,
  unit_id uuid,
  manager_id uuid references profiles(id),
  must_change_password boolean not null default false,
  terms_accepted_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_profiles_organization on profiles(organization_id);
create index idx_profiles_manager on profiles(manager_id);

-- =========================================================================
-- ESTRUTURA ORGANIZACIONAL
-- =========================================================================

create table units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  unit_id uuid references units(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table job_positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  department_id uuid references departments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table profiles add constraint fk_profiles_job_position foreign key (job_position_id) references job_positions(id);
alter table profiles add constraint fk_profiles_department foreign key (department_id) references departments(id);
alter table profiles add constraint fk_profiles_unit foreign key (unit_id) references units(id);

create table teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  manager_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, profile_id)
);

-- =========================================================================
-- CURSOS
-- =========================================================================

create table course_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  short_description text,
  full_description text,
  cover_image_url text,
  category_id uuid references course_categories(id),
  instructor_name text,
  workload_hours numeric(6,2) default 0,
  level text default 'beginner' check (level in ('beginner','intermediate','advanced')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  due_date date,
  passing_score numeric(5,2) default 70,
  max_attempts int default 3,
  certificate_enabled boolean not null default true,
  is_mandatory boolean not null default false,
  target_audience text,
  tags text[] default '{}',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_courses_organization on courses(organization_id);

create table course_prerequisites (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  prerequisite_course_id uuid not null references courses(id) on delete cascade,
  unique (course_id, prerequisite_course_id)
);

create table course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_modules_course on course_modules(course_id);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references course_modules(id) on delete cascade,
  title text not null,
  description text,
  type text not null check (type in ('video','text','pdf','file','external_link','activity','quiz','live_event')),
  content text,
  file_url text,
  duration_minutes int default 0,
  order_index int not null default 0,
  is_mandatory boolean not null default true,
  min_watch_percent int not null default 90,
  release_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_lessons_module on lessons(module_id);

create table lesson_materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- TRILHAS
-- =========================================================================

create table learning_paths (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  cover_image_url text,
  due_date date,
  target_audience text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_mandatory boolean not null default false,
  certificate_enabled boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table learning_path_courses (
  id uuid primary key default gen_random_uuid(),
  learning_path_id uuid not null references learning_paths(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  order_index int not null default 0,
  unique (learning_path_id, course_id)
);

-- =========================================================================
-- ATRIBUIÇÕES E PROGRESSO
-- =========================================================================

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  learning_path_id uuid references learning_paths(id) on delete cascade,
  assigned_by uuid references profiles(id),
  assigned_at timestamptz not null default now(),
  due_date date,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed','overdue')),
  completed_at timestamptz,
  check (
    (course_id is not null and learning_path_id is null) or
    (course_id is null and learning_path_id is not null)
  )
);

create index idx_enrollments_profile on enrollments(profile_id);
create unique index uq_enrollment_course on enrollments(profile_id, course_id) where course_id is not null;
create unique index uq_enrollment_path on enrollments(profile_id, learning_path_id) where learning_path_id is not null;

create table course_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  completed_lessons int not null default 0,
  total_lessons int not null default 0,
  progress_pct numeric(5,2) not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (enrollment_id)
);

create table lesson_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  status text not null default 'locked' check (status in ('locked','available','in_progress','completed')),
  watched_seconds int not null default 0,
  watch_percent numeric(5,2) not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (profile_id, lesson_id)
);

create index idx_lesson_progress_profile on lesson_progress(profile_id);

create table video_progress (
  id uuid primary key default gen_random_uuid(),
  lesson_progress_id uuid not null references lesson_progress(id) on delete cascade,
  last_position_seconds int not null default 0,
  playback_rate numeric(3,2) not null default 1.0,
  updated_at timestamptz not null default now(),
  unique (lesson_progress_id)
);

-- =========================================================================
-- AVALIAÇÕES
-- =========================================================================

create table assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  module_id uuid references course_modules(id) on delete cascade,
  title text not null,
  description text,
  time_limit_minutes int,
  passing_score numeric(5,2) not null default 70,
  max_attempts int not null default 3,
  shuffle_questions boolean not null default false,
  shuffle_options boolean not null default false,
  show_feedback boolean not null default true,
  show_answer_key boolean not null default false,
  available_from timestamptz,
  available_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  type text not null check (type in ('single_choice','true_false','multiple_choice','short_answer','essay')),
  statement text not null,
  order_index int not null default 0,
  points numeric(6,2) not null default 1,
  created_at timestamptz not null default now()
);

create table question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  text text not null,
  is_correct boolean not null default false,
  order_index int not null default 0
);

create table assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  attempt_number int not null default 1,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(6,2),
  passed boolean,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','grading_pending','graded')),
  unique (assessment_id, profile_id, attempt_number)
);

create table attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references assessment_attempts(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  selected_option_ids uuid[] default '{}',
  text_answer text,
  is_correct boolean,
  points_awarded numeric(6,2),
  grader_comment text,
  graded_by uuid references profiles(id),
  graded_at timestamptz,
  unique (attempt_id, question_id)
);

-- =========================================================================
-- CERTIFICADOS
-- =========================================================================

create table certificates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  course_id uuid references courses(id),
  learning_path_id uuid references learning_paths(id),
  validation_code text not null unique,
  workload_hours numeric(6,2) not null default 0,
  issued_at timestamptz not null default now(),
  pdf_url text,
  check (
    (course_id is not null and learning_path_id is null) or
    (course_id is null and learning_path_id is not null)
  )
);

create index idx_certificates_validation on certificates(validation_code);

-- =========================================================================
-- METAS
-- =========================================================================

create table goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  type text not null check (type in ('numeric','percentage','done_not_done','milestone','okr')),
  owner_id uuid not null references profiles(id) on delete cascade,
  created_by uuid not null references profiles(id),
  team_id uuid references teams(id),
  start_date date not null,
  due_date date not null,
  initial_value numeric(12,2) default 0,
  current_value numeric(12,2) default 0,
  target_value numeric(12,2) default 100,
  unit_label text,
  weight numeric(5,2) default 1,
  status text not null default 'not_started' check (status in ('not_started','in_progress','at_risk','overdue','completed','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table goal_updates (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  updated_by uuid not null references profiles(id),
  previous_value numeric(12,2),
  new_value numeric(12,2),
  comment text,
  evidence_url text,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- PDI
-- =========================================================================

create table development_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  manager_id uuid not null references profiles(id),
  period_start date not null,
  period_end date not null,
  career_objective text,
  current_competencies text,
  competencies_to_develop text,
  strengths text,
  improvement_points text,
  manager_feedback text,
  employee_feedback text,
  status text not null default 'draft' check (status in ('draft','awaiting_acceptance','active','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table development_plan_actions (
  id uuid primary key default gen_random_uuid(),
  development_plan_id uuid not null references development_plans(id) on delete cascade,
  description text not null,
  related_course_id uuid references courses(id),
  responsible_id uuid references profiles(id),
  due_date date,
  status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  created_at timestamptz not null default now()
);

create table development_plan_meetings (
  id uuid primary key default gen_random_uuid(),
  development_plan_id uuid not null references development_plans(id) on delete cascade,
  meeting_date date not null,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- =========================================================================
-- COMUNICADOS E NOTIFICAÇÕES
-- =========================================================================

create table announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  message text not null,
  image_url text,
  author_id uuid references profiles(id),
  audience_type text not null default 'company' check (audience_type in ('company','unit','department','job_position','team','specific_users')),
  audience_ids uuid[] default '{}',
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table announcement_reads (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references announcements(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (announcement_id, profile_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_profile on notifications(profile_id);

-- =========================================================================
-- GAMIFICAÇÃO
-- =========================================================================

create table achievements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  icon text,
  points int not null default 0,
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table user_achievements (
  id uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references achievements(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (achievement_id, profile_id)
);

create table points_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  points int not null,
  reason text not null,
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- AUDITORIA E ARQUIVOS
-- =========================================================================

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_organization on audit_logs(organization_id);

create table files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  bucket text not null,
  path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- updated_at trigger genérico
-- =========================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'organizations','organization_settings','subscriptions','profiles','units','departments',
    'job_positions','teams','courses','course_modules','lessons','learning_paths','course_progress',
    'lesson_progress','video_progress','assessments','goals','development_plans','plans'
  ])
  loop
    execute format('create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at()', t);
  end loop;
end $$;
