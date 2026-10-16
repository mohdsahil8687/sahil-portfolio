-- Apply once to an existing portfolio database before using the updated inquiry form.
alter table public.contact_messages
  add column if not exists contact_number text not null default '',
  add column if not exists status text not null default 'new';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contact_messages_contact_number_length_check'
      and conrelid = 'public.contact_messages'::regclass
  ) then
    alter table public.contact_messages
      add constraint contact_messages_contact_number_length_check
      check (char_length(contact_number) <= 40);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'contact_messages_status_check'
      and conrelid = 'public.contact_messages'::regclass
  ) then
    alter table public.contact_messages
      add constraint contact_messages_status_check
      check (status in ('new','contacted','closed'));
  end if;
end $$;

grant select, insert, update, delete on public.contact_messages to authenticated;

drop policy if exists "visitor contact submit" on public.contact_messages;
create policy "visitor contact submit" on public.contact_messages
  for insert to anon, authenticated
  with check (status = 'new');

drop policy if exists "admin contact update" on public.contact_messages;
create policy "admin contact update" on public.contact_messages
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
