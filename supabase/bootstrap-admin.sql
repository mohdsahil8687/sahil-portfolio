-- Run privately in Supabase SQL Editor AFTER creating the admin user and
-- confirming its email address. Replace YOUR_VERIFIED_USER_UUID before running.
-- This does NOT create a user or password. The browser has no grant path.
do $$
declare owner_id uuid;
        confirmed_at timestamptz;
begin
 owner_id := '6588b91b-4979-4ab8-93f2-bc2e33e5aef1'::uuid;
 select email_confirmed_at into confirmed_at from auth.users where id=owner_id;
 if confirmed_at is null then raise exception 'The supplied UID does not belong to a verified Supabase Auth user.'; end if;
 if exists(select 1 from public.admin_members where active and user_id<>owner_id) then
   raise exception 'Another active administrator exists. Review admin_members privately before configuring a sole owner.';
 end if;
 insert into public.admin_members(user_id,role,active) values(owner_id,'owner',true)
 on conflict(user_id) do update set role='owner',active=true;
end $$;
