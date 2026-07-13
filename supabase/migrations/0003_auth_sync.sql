-- Sincroniza organization_id e role de profiles para app_metadata em auth.users,
-- de onde o Supabase Auth propaga para o JWT (request.jwt.claims) usado pelas RLS policies.

create or replace function sync_profile_claims()
returns trigger language plpgsql security definer as $$
begin
  update auth.users
  set raw_app_meta_data = raw_app_meta_data
    || jsonb_build_object('organization_id', new.organization_id, 'app_role', new.role)
  where id = new.id;
  return new;
end;
$$;

create trigger trg_sync_profile_claims
after insert or update of organization_id, role on profiles
for each row execute function sync_profile_claims();

-- Cria automaticamente um profile "pending_invite" quando um novo usuário é criado
-- via Supabase Auth (signUp administrativo). organization_id/role vêm do app_metadata
-- passado na criação do convite (ver rota de convite de colaborador).
create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, organization_id, first_name, last_name, email, role, status)
  values (
    new.id,
    nullif(new.raw_app_meta_data ->> 'organization_id', '')::uuid,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    coalesce(new.raw_app_meta_data ->> 'app_role', 'collaborator'),
    'pending_invite'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_handle_new_auth_user
after insert on auth.users
for each row execute function handle_new_auth_user();
