-- Apply AFTER setup.sql, 20261015_client_inquiries.sql and 20261015_reading_archive.sql.
-- Additive migration: no existing content is deleted or overwritten.
begin;

create table if not exists public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.admin_members enable row level security;
revoke all on public.admin_members from anon, authenticated;
-- No API INSERT/UPDATE/DELETE grants or policies: only a trusted SQL owner can grant a role.

create or replace function public.admin_identity() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_members m join auth.users u on u.id=m.user_id
    where m.user_id=(select auth.uid()) and m.active and u.email_confirmed_at is not null);
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.admin_identity() and (
    coalesce((select auth.jwt())->>'aal','aal1')='aal2'
    or not exists(select 1 from auth.mfa_factors f where f.user_id=(select auth.uid()) and f.status='verified')
  );
$$;
revoke all on function public.admin_identity(), public.is_admin() from public;
grant execute on function public.admin_identity(), public.is_admin() to anon, authenticated;
-- The legacy email allowlist is retained for history, but is no longer an authority.
revoke all on public.admin_allowlist from anon, authenticated;

create or replace function public.valid_web_url(value text) returns boolean
language sql immutable set search_path = '' as $$
 select value='' or (length(value)<=2048 and value ~ '^https://[^/@[:space:]]+([/:?#][^[:space:]]*)?$' and value !~ '^https://[^/]*@');
$$;

alter table public.projects add column if not exists detailed_description text not null default '';
alter table public.projects add column if not exists video_url text not null default '';
alter table public.projects add column if not exists seo_title text not null default '';
alter table public.projects add column if not exists seo_description text not null default '';
alter table public.projects add column if not exists archived boolean not null default false;
alter table public.projects add column if not exists updated_at timestamptz not null default now();
create table if not exists public.project_media (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 url text not null check(public.valid_web_url(url) and url<>''), alt text not null default '', position integer not null default 0
);
create table if not exists public.skills (
 id text primary key check(length(id) between 1 and 100), title text not null check(length(title) between 1 and 150),
 category text not null default '', description text not null default '', note text not null default '',
 status text not null default 'UP NEXT' check(status in ('FOUNDATION','HANDS-ON','IN PROGRESS','UP NEXT')),
 icon text not null default 'orbit' check(icon in ('keyboard','game','web','server','database','brain','chart','network','orbit')),
 icon_url text not null default '' check(public.valid_web_url(icon_url)), technologies jsonb not null default '[]' check(jsonb_typeof(technologies)='array'),
 proficiency text not null default '', currently_learning boolean not null default false,
 position integer not null default 0, published boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.books add column if not exists started_on date;
alter table public.books add column if not exists completed_on date;
alter table public.books add column if not exists progress integer check(progress between 0 and 100);
alter table public.books add column if not exists external_cover_enabled boolean not null default true;
-- Preserve existing cover behavior; NEW books opt out by default in the editor.
alter table public.resources add column if not exists thumbnail_url text not null default '';
alter table public.resources add column if not exists tags jsonb not null default '[]' check(jsonb_typeof(tags)='array');
alter table public.resources add column if not exists access_type text not null default 'free' check(access_type in ('free','members'));
alter table public.resources add column if not exists updated_at timestamptz not null default now();
create table if not exists public.resource_files (
 resource_id uuid primary key references public.resources(id) on delete cascade,
 bucket text not null default 'portfolio-private' check(bucket='portfolio-private'),
 path text not null check(path ~ '^uploads/[a-zA-Z0-9._/-]+$')
);
create table if not exists public.social_links (
 id uuid primary key default gen_random_uuid(), platform text not null check(length(platform) between 1 and 60),
 label text not null check(length(label) between 1 and 100), url text not null check(public.valid_web_url(url) and url<>''),
 icon text not null default 'globe', enabled boolean not null default true, new_tab boolean not null default true,
 position integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.media_assets (
 id uuid primary key default gen_random_uuid(), bucket text not null check(bucket in ('portfolio-media','portfolio-pdfs','portfolio-private')),
 path text not null check(path ~ '^uploads/[a-zA-Z0-9._/-]+$'), name text not null check(length(name) between 1 and 255),
 alt text not null default '', mime_type text not null, size bigint not null check(size between 0 and 10485760),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(bucket,path)
);
alter table public.member_profiles add column if not exists avatar_url text not null default '';
alter table public.member_profiles add column if not exists phone text not null default '' check(length(phone)<=40);
alter table public.member_profiles add column if not exists phone_consent boolean not null default false;
alter table public.member_profiles add column if not exists last_activity_at timestamptz;
do $$
declare existing_def text;
        normalized_def text;
begin
 select pg_get_constraintdef(c.oid, true)
 into existing_def
 from pg_constraint c
 join pg_class r on r.oid=c.conrelid
 join pg_namespace n on n.oid=r.relnamespace
 where n.nspname='public'
   and r.relname='member_profiles'
   and c.conname='phone_requires_consent';

 if existing_def is null then
  alter table public.member_profiles
    add constraint phone_requires_consent
    check(phone='' or phone_consent);
 else
  normalized_def=regexp_replace(lower(existing_def),'\s+','','g');
  if position('phone=' in normalized_def)=0
     or position('phone_consent' in normalized_def)=0
     or position('or' in normalized_def)=0 then
   raise exception 'Existing public.member_profiles.phone_requires_consent has an unexpected definition: %', existing_def;
  end if;
 end if;
end $$;
create table if not exists public.communication_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 analytics_consent boolean not null default false, updated_at timestamptz not null default now()
);
alter table public.contact_messages add column if not exists subject text not null default '';
alter table public.contact_messages add column if not exists read_at timestamptz;
alter table public.contact_messages add column if not exists replied_at timestamptz;
alter table public.contact_messages add column if not exists archived boolean not null default false;
create table if not exists public.analytics_events (
 id bigint generated always as identity primary key,
 event_type text not null check(event_type in ('page_view','resource_download','resource_completed')),
 path text not null check(path ~ '^/[a-zA-Z0-9/_-]*$' and length(path)<=160),
 visitor_id uuid not null, user_id uuid references auth.users(id) on delete set null,
 referrer text not null default '' check(length(referrer)<=255),
 created_at timestamptz not null default now()
);
create index if not exists analytics_time_idx on public.analytics_events(created_at desc);
create index if not exists analytics_user_idx on public.analytics_events(user_id,created_at desc);
create index if not exists profiles_time_idx on public.member_profiles(created_at desc);
create table if not exists public.admin_audit_logs (
 id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null,
 action text not null, entity text not null, record_id text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.email_deliveries (
 id uuid primary key default gen_random_uuid(), message_id uuid references public.contact_messages(id) on delete set null,
 recipient_user_id uuid references auth.users(id) on delete set null, recipient text not null,
 subject text not null, body text not null, provider_id text,
 status text not null default 'sending' check(status in ('sending','accepted','failed','unknown')),
 error text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.app_settings (
 id integer primary key default 1 check(id=1), analytics_enabled boolean not null default false,
 retention_days integer not null default 90 check(retention_days between 7 and 365), updated_at timestamptz not null default now()
);
insert into public.app_settings(id) values(1) on conflict do nothing;
create table if not exists public.request_limits (
 key text primary key, hits integer not null, resets_at timestamptz not null
);

-- Uniform admin-only writes; public reads are separate, published-only policies.
do $$ declare t text; begin
 foreach t in array array['project_media','skills','resource_files','social_links','media_assets','communication_preferences','analytics_events','admin_audit_logs','email_deliveries','app_settings','request_limits'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
 foreach t in array array['project_media','skills','resource_files','social_links','media_assets','app_settings'] loop
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('drop policy if exists dashboard_admin on public.%I',t);
  execute format('create policy dashboard_admin on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
 end loop;
 foreach t in array array['analytics_events','admin_audit_logs','email_deliveries'] loop
  execute format('grant select on public.%I to authenticated',t);
  execute format('drop policy if exists dashboard_read on public.%I',t);
  execute format('create policy dashboard_read on public.%I for select to authenticated using(public.is_admin())',t);
 end loop;
end $$;
grant select on public.skills,public.social_links,public.project_media to anon;
drop policy if exists published_skills on public.skills;
create policy published_skills on public.skills for select to anon,authenticated using(published);
drop policy if exists enabled_socials on public.social_links;
create policy enabled_socials on public.social_links for select to anon,authenticated using(enabled);
drop policy if exists published_project_media on public.project_media;
create policy published_project_media on public.project_media for select to anon,authenticated
 using(exists(select 1 from public.projects p where p.id=project_id and p.published and not p.archived));
drop policy if exists "public projects read" on public.projects;
create policy "public projects read" on public.projects for select to anon,authenticated using(published and not archived);
-- Restricted file object paths are never returned in the public resource row.
do $$
declare existing_def text;
        normalized_def text;
begin
 select pg_get_constraintdef(c.oid, true)
 into existing_def
 from pg_constraint c
 join pg_class r on r.oid=c.conrelid
 join pg_namespace n on n.oid=r.relnamespace
 where n.nspname='public'
   and r.relname='resources'
   and c.conname='restricted_file_not_public';

 if existing_def is null then
  alter table public.resources
    add constraint restricted_file_not_public
    check(access_type='free' or (file_url='' and file_path=''));
 else
  normalized_def=regexp_replace(lower(existing_def),'\s+','','g');
  if position('access_type' in normalized_def)=0
     or position('file_url' in normalized_def)=0
     or position('file_path' in normalized_def)=0
     or position('or' in normalized_def)=0
     or position('and' in normalized_def)=0 then
   raise exception 'Existing public.resources.restricted_file_not_public has an unexpected definition: %', existing_def;
  end if;
 end if;
end $$;

-- Profile identities are populated from auth.users, never from browser-supplied email.
create or replace function public.sync_member_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.member_profiles(user_id,email,full_name,avatar_url)
 values(new.id,coalesce(new.email,''),left(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',''),120),
  case when public.valid_web_url(coalesce(new.raw_user_meta_data->>'avatar_url','')) then coalesce(new.raw_user_meta_data->>'avatar_url','') else '' end)
 on conflict(user_id) do update set email=excluded.email;
 return new;
end $$;
drop trigger if exists portfolio_profile_sync on auth.users;
create trigger portfolio_profile_sync after insert or update of email on auth.users for each row execute function public.sync_member_profile();
insert into public.member_profiles(user_id,email,full_name)
 select id,coalesce(email,''),left(coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',''),120) from auth.users
 on conflict(user_id) do nothing;
revoke insert,update on public.member_profiles from authenticated;
grant update(full_name,avatar_url,phone,phone_consent,marketing_opt_in,updated_at) on public.member_profiles to authenticated;
grant select,insert,update on public.communication_preferences to authenticated;
drop policy if exists preference_own on public.communication_preferences;
create policy preference_own on public.communication_preferences for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

-- Remove direct anonymous submission routes. Edge Functions validate and rate-limit.
drop policy if exists "visitor contact submit" on public.contact_messages;
drop policy if exists "visitor view submit" on public.page_views;
revoke insert on public.contact_messages,public.page_views from anon,authenticated;
grant all on public.analytics_events,public.request_limits,public.email_deliveries,public.admin_audit_logs,public.contact_messages,public.resource_files,public.member_profiles,public.app_settings to service_role;
grant usage,select on all sequences in schema public to service_role;

create or replace function public.consume_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer; begin
 if length(p_key)>200 or p_limit<1 or p_limit>1000 or p_seconds<1 or p_seconds>86400 then raise exception 'Invalid rate limit'; end if;
 insert into public.request_limits(key,hits,resets_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set hits=case when request_limits.resets_at<=now() then 1 else request_limits.hits+1 end,
 resets_at=case when request_limits.resets_at<=now() then now()+make_interval(secs=>p_seconds) else request_limits.resets_at end
 returning hits into n;
 return n<=p_limit;
end $$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;

create or replace function public.capture_admin_audit() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if public.is_admin() then
  insert into public.admin_audit_logs(actor_id,action,entity,record_id)
  values(auth.uid(),TG_OP,TG_TABLE_NAME,coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id',''));
 end if;
 if TG_OP='DELETE' then return old; end if; return new;
end $$;
do $$ declare t text; begin
foreach t in array array['projects','project_media','skills','books','resources','resource_files','social_links','media_assets','site_settings','contact_messages','services','offers','learning','app_settings'] loop
  execute format('drop trigger if exists dashboard_audit on public.%I',t);
  execute format('create trigger dashboard_audit after insert or update or delete on public.%I for each row execute function public.capture_admin_audit()',t);
 end loop;
end $$;

create or replace function public.touch_dashboard_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now();return new;end $$;
do $$ declare t text; begin
foreach t in array array['projects','resources','skills','social_links','media_assets','app_settings'] loop
  execute format('drop trigger if exists dashboard_timestamp on public.%I',t);
  execute format('create trigger dashboard_timestamp before update on public.%I for each row execute function public.touch_dashboard_updated_at()',t);
 end loop;
end $$;

-- JSON CMS is deliberately retained for compatible navigation/footer/content editing.
-- Skills normalization uses saved journey rows when present, without replacing newer rows.
insert into public.skills(id,title,category,description,note,status,icon,technologies,position,published)
 select s.value->>'id',s.value->>'title',coalesce(s.value->>'category',''),coalesce(s.value->>'description',''),
 coalesce(s.value->>'note',''),s.value->>'status',s.value->>'icon',coalesce(s.value->'technologies','[]'::jsonb),s.ordinality::integer,true
 from public.site_settings x, lateral jsonb_array_elements(case when jsonb_typeof(x.data->'skillsJourney')='array' then x.data->'skillsJourney' else '[]'::jsonb end) with ordinality s(value,ordinality)
 where s.value->>'id' is not null on conflict(id) do nothing;

-- Asset references are checked at storage-policy time as well as in the UI.
create or replace function public.media_object_in_use(p_bucket text,p_path text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare target text; found boolean; t text; begin
 target='/storage/v1/object/public/'||p_bucket||'/'||p_path;
 if exists(select 1 from public.resource_files where bucket=p_bucket and path=p_path) then return true; end if;
 foreach t in array array['site_settings','projects','project_media','skills','books','resources','social_links','member_profiles'] loop
  execute format('select exists(select 1 from public.%I r where position($1 in to_jsonb(r)::text)>0)',t) into found using target;
  if found then return true; end if;
 end loop;
 return false;
end $$;
revoke all on function public.media_object_in_use(text,text) from public;
grant execute on function public.media_object_in_use(text,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('portfolio-private','portfolio-private',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp','image/avif']) on conflict(id) do nothing;
drop policy if exists "admins upload portfolio media" on storage.objects;
drop policy if exists "admins update portfolio media" on storage.objects;
drop policy if exists "admins delete portfolio media" on storage.objects;
drop policy if exists "admins list portfolio media" on storage.objects;
drop policy if exists dashboard_storage_insert on storage.objects;
drop policy if exists dashboard_storage_read on storage.objects;
drop policy if exists dashboard_storage_delete on storage.objects;
create policy dashboard_storage_insert on storage.objects for insert to authenticated
 with check(bucket_id in ('portfolio-media','portfolio-pdfs','portfolio-private') and name ~ '^uploads/[a-zA-Z0-9._/-]+$' and public.is_admin());
create policy dashboard_storage_read on storage.objects for select to authenticated
 using(bucket_id in ('portfolio-media','portfolio-pdfs','portfolio-private') and public.is_admin());
-- Replacements create a new object: referenced bytes cannot be silently overwritten.
create policy dashboard_storage_delete on storage.objects for delete to authenticated
 using(bucket_id in ('portfolio-media','portfolio-pdfs','portfolio-private') and public.is_admin() and not public.media_object_in_use(bucket_id,name));

create or replace function public.save_resource(p_resource jsonb,p_private_path text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare rid uuid; begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 rid=coalesce((p_resource->>'id')::uuid,gen_random_uuid());
 insert into public.resources(id,title,slug,category,description,file_url,file_path,thumbnail_url,tags,access_type,position,published)
 values(rid,p_resource->>'title',p_resource->>'slug',coalesce(p_resource->>'category',''),coalesce(p_resource->>'description',''),
 case when p_resource->>'access_type'='members' then '' else coalesce(p_resource->>'file_url','') end,
 case when p_resource->>'access_type'='members' then '' else coalesce(p_resource->>'file_path','') end,
 coalesce(p_resource->>'thumbnail_url',''),coalesce(p_resource->'tags','[]'::jsonb),coalesce(p_resource->>'access_type','free'),
 coalesce((p_resource->>'position')::integer,0),coalesce((p_resource->>'published')::boolean,false))
 on conflict(id) do update set title=excluded.title,slug=excluded.slug,category=excluded.category,description=excluded.description,
 file_url=excluded.file_url,file_path=excluded.file_path,thumbnail_url=excluded.thumbnail_url,tags=excluded.tags,access_type=excluded.access_type,position=excluded.position,published=excluded.published;
 if p_resource->>'access_type'='members' then
  if p_private_path is not null and p_private_path<>'' then
   insert into public.resource_files(resource_id,path) values(rid,p_private_path) on conflict(resource_id) do update set path=excluded.path;
  end if;
 else delete from public.resource_files where resource_id=rid; end if;
 return rid;
end $$;
revoke all on function public.save_resource(jsonb,text) from public;
grant execute on function public.save_resource(jsonb,text) to authenticated;

create or replace function public.prune_portfolio_analytics() returns bigint
language plpgsql security definer set search_path='' as $$
declare n bigint; days integer;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 select retention_days into days from public.app_settings where id=1;
 delete from public.analytics_events where created_at<now()-make_interval(days=>days);get diagnostics n=row_count;
 delete from public.request_limits where resets_at<now()-interval '1 day';
 return n;
end $$;
revoke all on function public.prune_portfolio_analytics() from public;
grant execute on function public.prune_portfolio_analytics() to authenticated;
commit;
