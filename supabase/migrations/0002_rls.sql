-- Valor Academy — Row Level Security
-- Estratégia: uma função auxiliar lê organization_id e role do JWT (custom claims
-- sincronizados a partir de profiles via trigger em auth.users, ver 0003_auth_sync.sql).
-- Superadmin (role = 'superadmin', organization_id nulo) enxerga todas as organizações.

create or replace function auth_organization_id()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'organization_id', '')::uuid;
$$;

create or replace function auth_role()
returns text language sql stable as $$
  select current_setting('request.jwt.claims', true)::jsonb ->> 'app_role';
$$;

create or replace function is_superadmin()
returns boolean language sql stable as $$
  select auth_role() = 'superadmin';
$$;

create or replace function is_manager_of(target_profile_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from profiles p where p.id = target_profile_id and p.manager_id = auth.uid()
  );
$$;

-- Habilita RLS em todas as tabelas de negócio
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'organizations','organization_settings','subscriptions','plans','profiles','units','departments',
    'job_positions','teams','team_members','course_categories','courses','course_prerequisites',
    'course_modules','lessons','lesson_materials','learning_paths','learning_path_courses',
    'enrollments','course_progress','lesson_progress','video_progress','assessments','questions',
    'question_options','assessment_attempts','attempt_answers','certificates','goals','goal_updates',
    'development_plans','development_plan_actions','development_plan_meetings','announcements',
    'announcement_reads','notifications','achievements','user_achievements','points_transactions',
    'audit_logs','files'
  ])
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- organizations: superadmin vê tudo; usuários da organização veem a própria
create policy org_select on organizations for select
  using (is_superadmin() or id = auth_organization_id());
create policy org_all_superadmin on organizations for all
  using (is_superadmin()) with check (is_superadmin());

create policy plans_select on plans for select using (true);
create policy plans_write_superadmin on plans for all
  using (is_superadmin()) with check (is_superadmin());

-- Padrão para tabelas com organization_id: isolamento total por organização,
-- superadmin com acesso irrestrito para suporte/operação.
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'organization_settings','subscriptions','units','departments','job_positions','teams',
    'course_categories','courses','learning_paths','enrollments','assessments','certificates',
    'goals','development_plans','announcements','notifications','achievements','points_transactions',
    'audit_logs','files'
  ])
  loop
    execute format($f$
      create policy %1$I_isolation on %1$I for all
      using (is_superadmin() or organization_id = auth_organization_id())
      with check (is_superadmin() or organization_id = auth_organization_id())
    $f$, t);
  end loop;
end $$;

-- profiles: usuário vê a si mesmo, colegas da mesma organização, gestor vê sua equipe
create policy profiles_select on profiles for select
  using (
    is_superadmin()
    or organization_id = auth_organization_id()
  );
create policy profiles_update_self on profiles for update
  using (id = auth.uid() or is_superadmin() or (auth_role() in ('company_admin') and organization_id = auth_organization_id()))
  with check (id = auth.uid() or is_superadmin() or (auth_role() in ('company_admin') and organization_id = auth_organization_id()));
create policy profiles_insert_admin on profiles for insert
  with check (is_superadmin() or (auth_role() = 'company_admin' and organization_id = auth_organization_id()));
create policy profiles_delete_admin on profiles for delete
  using (is_superadmin() or (auth_role() = 'company_admin' and organization_id = auth_organization_id()));

-- Tabelas filhas de curso: isolamento via join com courses
create policy course_prereq_isolation on course_prerequisites for all
  using (exists (select 1 from courses c where c.id = course_id and (is_superadmin() or c.organization_id = auth_organization_id())));

create policy modules_isolation on course_modules for all
  using (exists (select 1 from courses c where c.id = course_id and (is_superadmin() or c.organization_id = auth_organization_id())));

create policy lessons_isolation on lessons for all
  using (exists (
    select 1 from course_modules m join courses c on c.id = m.course_id
    where m.id = module_id and (is_superadmin() or c.organization_id = auth_organization_id())
  ));

create policy lesson_materials_isolation on lesson_materials for all
  using (exists (
    select 1 from lessons l join course_modules m on m.id = l.module_id join courses c on c.id = m.course_id
    where l.id = lesson_id and (is_superadmin() or c.organization_id = auth_organization_id())
  ));

create policy path_courses_isolation on learning_path_courses for all
  using (exists (select 1 from learning_paths lp where lp.id = learning_path_id and (is_superadmin() or lp.organization_id = auth_organization_id())));

create policy team_members_isolation on team_members for all
  using (exists (select 1 from teams t where t.id = team_id and (is_superadmin() or t.organization_id = auth_organization_id())));

-- Progresso: o próprio usuário e sua organização; gestores/admin com acesso de leitura
create policy course_progress_select on course_progress for select
  using (
    is_superadmin()
    or profile_id = auth.uid()
    or is_manager_of(profile_id)
    or auth_role() in ('company_admin')
  );
create policy course_progress_write on course_progress for all
  using (is_superadmin() or profile_id = auth.uid())
  with check (is_superadmin() or profile_id = auth.uid());

create policy lesson_progress_select on lesson_progress for select
  using (
    is_superadmin()
    or profile_id = auth.uid()
    or is_manager_of(profile_id)
    or auth_role() in ('company_admin')
  );
create policy lesson_progress_write on lesson_progress for all
  using (is_superadmin() or profile_id = auth.uid())
  with check (is_superadmin() or profile_id = auth.uid());

create policy video_progress_isolation on video_progress for all
  using (exists (
    select 1 from lesson_progress lp where lp.id = lesson_progress_id and (is_superadmin() or lp.profile_id = auth.uid())
  ));

-- Questões e opções seguem o assessment
create policy questions_isolation on questions for all
  using (exists (select 1 from assessments a where a.id = assessment_id and (is_superadmin() or a.organization_id = auth_organization_id())));
create policy question_options_isolation on question_options for all
  using (exists (
    select 1 from questions q join assessments a on a.id = q.assessment_id
    where q.id = question_id and (is_superadmin() or a.organization_id = auth_organization_id())
  ));

-- Tentativas: o próprio colaborador, mais gestor/admin para correção e relatórios
create policy attempts_select on assessment_attempts for select
  using (
    is_superadmin()
    or profile_id = auth.uid()
    or is_manager_of(profile_id)
    or exists (select 1 from assessments a where a.id = assessment_id and a.organization_id = auth_organization_id() and auth_role() = 'company_admin')
  );
create policy attempts_write on assessment_attempts for insert
  with check (profile_id = auth.uid() or is_superadmin());
create policy attempts_update on assessment_attempts for update
  using (
    is_superadmin()
    or profile_id = auth.uid()
    or exists (select 1 from assessments a where a.id = assessment_id and a.organization_id = auth_organization_id() and auth_role() = 'company_admin')
  );

create policy attempt_answers_isolation on attempt_answers for all
  using (exists (
    select 1 from assessment_attempts at where at.id = attempt_id
    and (is_superadmin() or at.profile_id = auth.uid() or is_manager_of(at.profile_id) or auth_role() = 'company_admin')
  ));

-- Metas: dono, gestor, admin
create policy goal_updates_isolation on goal_updates for all
  using (exists (
    select 1 from goals g where g.id = goal_id
    and (is_superadmin() or g.owner_id = auth.uid() or is_manager_of(g.owner_id) or g.organization_id = auth_organization_id() and auth_role() = 'company_admin')
  ));

-- PDI: colaborador e gestor responsável
create policy dev_plans_select on development_plans for select
  using (
    is_superadmin()
    or profile_id = auth.uid()
    or manager_id = auth.uid()
    or (auth_role() = 'company_admin' and organization_id = auth_organization_id())
  );
create policy dev_plans_write on development_plans for all
  using (
    is_superadmin()
    or manager_id = auth.uid()
    or (auth_role() = 'company_admin' and organization_id = auth_organization_id())
  )
  with check (
    is_superadmin()
    or manager_id = auth.uid()
    or (auth_role() = 'company_admin' and organization_id = auth_organization_id())
  );

create policy dev_plan_actions_isolation on development_plan_actions for all
  using (exists (
    select 1 from development_plans dp where dp.id = development_plan_id
    and (is_superadmin() or dp.profile_id = auth.uid() or dp.manager_id = auth.uid() or auth_role() = 'company_admin')
  ));
create policy dev_plan_meetings_isolation on development_plan_meetings for all
  using (exists (
    select 1 from development_plans dp where dp.id = development_plan_id
    and (is_superadmin() or dp.profile_id = auth.uid() or dp.manager_id = auth.uid() or auth_role() = 'company_admin')
  ));

-- Comunicados: leitura ampla dentro da organização; escrita por admin
create policy announcement_reads_isolation on announcement_reads for all
  using (profile_id = auth.uid() or is_superadmin());

-- Notificações: apenas o próprio usuário
create policy notifications_select on notifications for select
  using (profile_id = auth.uid() or is_superadmin());
create policy notifications_update on notifications for update
  using (profile_id = auth.uid() or is_superadmin());

-- Conquistas do usuário
create policy user_achievements_select on user_achievements for select
  using (
    is_superadmin()
    or profile_id = auth.uid()
    or is_manager_of(profile_id)
    or exists (select 1 from achievements a where a.id = achievement_id and a.organization_id = auth_organization_id() and auth_role() = 'company_admin')
  );

-- Certificados: leitura pública é feita via rota server-side com service role
-- (validação pública não deve expor RLS de usuário autenticado).
create policy certificates_select on certificates for select
  using (
    is_superadmin()
    or profile_id = auth.uid()
    or is_manager_of(profile_id)
    or (auth_role() = 'company_admin' and organization_id = auth_organization_id())
  );
