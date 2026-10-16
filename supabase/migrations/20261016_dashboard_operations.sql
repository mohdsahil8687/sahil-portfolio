begin;
create or replace function public.save_project(p_project jsonb,p_media jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare pid uuid;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if jsonb_typeof(p_media)<>'array' or jsonb_array_length(p_media)>30 then raise exception 'Use up to 30 screenshots';end if;
 pid=coalesce((p_project->>'id')::uuid,gen_random_uuid());
 insert into public.projects(id,title,category,description,detailed_description,tech,image_url,video_url,repo_url,url,status,featured,seo_title,seo_description,archived,position,published)
 values(pid,p_project->>'title',coalesce(p_project->>'category',''),coalesce(p_project->>'description',''),coalesce(p_project->>'detailed_description',''),coalesce(p_project->>'tech',''),
 coalesce(p_project->>'image_url',''),coalesce(p_project->>'video_url',''),coalesce(p_project->>'repo_url',''),coalesce(p_project->>'url',''),coalesce(p_project->>'status','IN PROGRESS'),
 coalesce((p_project->>'featured')::boolean,false),coalesce(p_project->>'seo_title',''),coalesce(p_project->>'seo_description',''),coalesce((p_project->>'archived')::boolean,false),
 coalesce((p_project->>'position')::integer,0),coalesce((p_project->>'published')::boolean,false))
 on conflict(id) do update set title=excluded.title,category=excluded.category,description=excluded.description,detailed_description=excluded.detailed_description,tech=excluded.tech,
 image_url=excluded.image_url,video_url=excluded.video_url,repo_url=excluded.repo_url,url=excluded.url,status=excluded.status,featured=excluded.featured,seo_title=excluded.seo_title,
 seo_description=excluded.seo_description,archived=excluded.archived,position=excluded.position,published=excluded.published;
 delete from public.project_media where project_id=pid;
 insert into public.project_media(project_id,url,position) select pid,value,ordinality::integer from jsonb_array_elements_text(p_media) with ordinality;
 return pid;
end $$;
revoke all on function public.save_project(jsonb,jsonb) from public;
grant execute on function public.save_project(jsonb,jsonb) to authenticated;

create or replace function public.reorder_content(p_table text,p_first text,p_second text) returns void
language plpgsql security definer set search_path='' as $$
declare a integer;b integer;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if p_table not in ('projects','skills','resources','social_links','books') or p_first=p_second then raise exception 'Invalid reorder';end if;
 -- Lock the pair in a consistent order; swapping ties assigns distinct adjacent positions.
 execute format('select position from public.%I where id::text=$1 for update',p_table) into a using least(p_first,p_second);
 execute format('select position from public.%I where id::text=$1 for update',p_table) into b using greatest(p_first,p_second);
 execute format('select position from public.%I where id::text=$1',p_table) into a using p_first;
 execute format('select position from public.%I where id::text=$1',p_table) into b using p_second;
 if a is null or b is null then raise exception 'Entry no longer exists';end if;
 if a=b then b=a+1;end if;
 execute format('update public.%I set position=case when id::text=$1 then $4 else $3 end where id::text in ($1,$2)',p_table) using p_first,p_second,a,b;
end $$;
revoke all on function public.reorder_content(text,text,text) from public;
grant execute on function public.reorder_content(text,text,text) to authenticated;

create or replace function public.dashboard_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 return jsonb_build_object(
  'users',(select count(*) from public.member_profiles),
  'new_today',(select count(*) from public.member_profiles where created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),
  'new_month',(select count(*) from public.member_profiles where created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC'),
  'projects',(select count(*) from public.projects), 'published_projects',(select count(*) from public.projects where published and not archived),
  'skills',(select count(*) from public.skills), 'books',(select count(*) from public.books),
  'resources',(select count(*) from public.resources where published),
  'views',(select count(*) from public.analytics_events where event_type='page_view'),
  'visitors',(select count(distinct visitor_id) from public.analytics_events where event_type='page_view'),
  'legacy_views',(select count(*) from public.page_views),
  'unread_messages',(select count(*) from public.contact_messages where read_at is null and not archived));
end $$;
revoke all on function public.dashboard_summary() from public;
grant execute on function public.dashboard_summary() to authenticated;

create or replace function public.dashboard_analytics(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare start_at timestamptz;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if p_days<1 or p_days>365 then raise exception 'Choose 1–365 days';end if;
 start_at=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'-make_interval(days=>p_days-1);
 return jsonb_build_object(
 'daily',(select coalesce(jsonb_agg(to_jsonb(d) order by d."day"),'[]') from (
  select to_char(gs.day_start,'YYYY-MM-DD') AS "day", count(e.id) AS views, count(distinct e.visitor_id) AS sessions
  from generate_series(start_at,now(),interval '1 day') AS gs(day_start)
  left join public.analytics_events AS e on e.event_type='page_view' and e.created_at>=gs.day_start and e.created_at<gs.day_start+interval '1 day'
  group by gs.day_start) AS d),
 'popular',(select coalesce(jsonb_agg(to_jsonb(d)),'[]') from (select ae.path AS path, count(*) AS views from public.analytics_events AS ae where ae.created_at>=start_at and ae.event_type='page_view' group by ae.path order by count(*) desc limit 20) AS d),
 'downloads',(select coalesce(jsonb_agg(to_jsonb(d)),'[]') from (select ae.path AS path, ae.event_type AS event_type, count(*) AS events from public.analytics_events AS ae where ae.created_at>=start_at and ae.event_type<>'page_view' group by ae.path, ae.event_type order by count(*) desc limit 20) AS d),
 'sources',(select coalesce(jsonb_agg(to_jsonb(d)),'[]') from (select coalesce(nullif(ae.referrer,''),'Direct / unavailable') AS source, count(*) AS views from public.analytics_events AS ae where ae.created_at>=start_at and ae.event_type='page_view' group by ae.referrer order by count(*) desc limit 20) AS d),
 'registrations',(select coalesce(jsonb_agg(to_jsonb(d) order by d."day"),'[]') from (select to_char(mp.created_at at time zone 'UTC','YYYY-MM-DD') AS "day", count(*) AS registrations from public.member_profiles AS mp where mp.created_at>=start_at group by to_char(mp.created_at at time zone 'UTC','YYYY-MM-DD')) AS d),
 'active_members',(select count(distinct user_id) from public.analytics_events where created_at>=start_at and user_id is not null));
end $$;
revoke all on function public.dashboard_analytics(integer) from public;
grant execute on function public.dashboard_analytics(integer) to authenticated;

-- Validate future URL writes without rejecting historical rows during migration.
alter table public.projects add constraint project_safe_urls check(public.valid_web_url(image_url) and public.valid_web_url(video_url) and public.valid_web_url(repo_url) and public.valid_web_url(url)) not valid;
alter table public.resources add constraint resource_safe_urls check(public.valid_web_url(thumbnail_url) and public.valid_web_url(file_url)) not valid;
alter table public.member_profiles add constraint profile_safe_avatar check(public.valid_web_url(avatar_url)) not valid;

-- Realtime is optional on a self-hosted project; never publish private/admin tables.
do $$ declare t text;begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach t in array array['site_settings','projects','skills','books','resources','social_links','services','offers','learning'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
    execute format('alter publication supabase_realtime add table public.%I',t);
   end if;
  end loop;
 end if;
end $$;
commit;
