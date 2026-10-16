-- Apply after setup.sql. Adds only the reading archive; existing resources are untouched.
begin;

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 250),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  author text not null check (char_length(author) between 1 and 200),
  category text not null default '',
  description text not null default '',
  focus text not null default '',
  isbn text not null default '' check (isbn = '' or isbn ~ '^[0-9]{13}$'),
  cover_image_url text not null default '' check (cover_image_url = '' or cover_image_url ~ '^https://'),
  theme text not null default 'ivory' check (theme in ('ivory','plum','clay','navy','stone','ochre','forest','wine')),
  reading_status text not null default 'Reading' check (reading_status in ('Read','Reading','Up Next')),
  key_ideas jsonb not null default '[]'::jsonb check (jsonb_typeof(key_ideas) = 'array'),
  personal_reflection text not null default '',
  practical_applications jsonb not null default '[]'::jsonb check (jsonb_typeof(practical_applications) = 'array'),
  related_interests jsonb not null default '[]'::jsonb check (jsonb_typeof(related_interests) = 'array'),
  related_resources jsonb not null default '[]'::jsonb check (jsonb_typeof(related_resources) = 'array'),
  position integer not null default 99,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_published_position_idx on public.books (published, position);
grant select on public.books to anon, authenticated;
grant insert, update, delete on public.books to authenticated;
alter table public.books enable row level security;

drop policy if exists "public books read" on public.books;
create policy "public books read" on public.books for select to anon, authenticated using (published);
drop policy if exists "admin books draft read" on public.books;
create policy "admin books draft read" on public.books for select to authenticated using (public.is_admin());
drop policy if exists "admin books insert" on public.books;
create policy "admin books insert" on public.books for insert to authenticated with check (public.is_admin());
drop policy if exists "admin books update" on public.books;
create policy "admin books update" on public.books for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin books delete" on public.books;
create policy "admin books delete" on public.books for delete to authenticated using (public.is_admin());

create or replace function public.touch_book_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists books_updated_at on public.books;
create trigger books_updated_at before update on public.books
for each row execute function public.touch_book_updated_at();

-- Curated seed follows. Conflicts never overwrite administrator edits.

insert into public.books (id, position, reading_status, published, cover_image_url, personal_reflection, related_resources, slug, title, author, isbn, category, theme, description, focus, key_ideas, practical_applications, related_interests) values
('10000000-0000-4000-8000-000000000001', 1, 'Read', true, '', '', '[]'::jsonb, 'atomic-habits', 'Atomic Habits', 'James Clear', '9780735211292', 'Habits, Systems & Consistency', 'ivory', 'A starting point for thinking about habits as repeatable systems, shaped by small actions and the environment around them.', 'Building consistency through small, repeatable habits.', '["Small improvements can accumulate over time.","Systems can be more sustainable than motivation alone.","Environment influences behavior.","Consistency develops through repeated actions."]'::jsonb, '["What is a small coding habit that would be realistic to repeat?","Which distractions could be removed from a learning environment?"]'::jsonb, '["Consistent practice","Learning to code","Digital habits"]'::jsonb),
('10000000-0000-4000-8000-000000000002', 2, 'Read', true, '', '', '[]'::jsonb, 'rich-dad-poor-dad', 'Rich Dad Poor Dad', 'Robert T. Kiyosaki', '9781612680194', 'Financial Thinking', 'plum', 'An invitation to examine assumptions about money and financial education. Its frameworks are perspectives to question, not universally accepted financial advice.', 'Developing curiosity about money, assets and long-term financial thinking.', '["Financial education matters.","Distinguishing assets and liabilities can be useful.","Income alone does not determine financial security.","Financial assumptions deserve critical examination."]'::jsonb, '["Which financial terms need more careful research?","How could a spending decision be examined from more than one perspective?"]'::jsonb, '["Financial literacy","Long-term thinking","Critical reading"]'::jsonb),
('10000000-0000-4000-8000-000000000003', 3, 'Read', true, '', '', '[]'::jsonb, 'the-alchemist', 'The Alchemist', 'Paulo Coelho', '9780061122415', 'Purpose & Personal Growth', 'clay', 'A fictional journey that offers a way to reflect on ambition, uncertainty and the experiences encountered while pursuing a meaningful goal.', 'The journey can change the person pursuing the goal.', '["Meaningful ambitions can provide direction.","Uncertainty can create opportunities to learn.","Opportunities may require attention and curiosity.","The journey itself can have value."]'::jsonb, '["What makes a learning goal personally meaningful?","What could an uncertain project teach, even before it succeeds?"]'::jsonb, '["Curiosity","Creative exploration","Personal direction"]'::jsonb),
('10000000-0000-4000-8000-000000000004', 4, 'Read', true, '', '', '[]'::jsonb, 'the-7-habits-of-highly-effective-people', 'The 7 Habits of Highly Effective People', 'Stephen R. Covey', '9781982137274', 'Personal Effectiveness', 'navy', 'A framework for considering personal responsibility, priorities, relationships and the direction behind everyday decisions.', 'Thinking about priorities, decisions and personal responsibility.', '["Consider where proactive action is possible.","Work with clear priorities.","Think about long-term direction.","Listen and develop effective relationships.","Make space for continuous self-improvement."]'::jsonb, '["Which tasks matter most for the next learning milestone?","How could clearer communication improve a collaborative project?"]'::jsonb, '["Planning","Communication","Personal discipline"]'::jsonb),
('10000000-0000-4000-8000-000000000005', 5, 'Read', true, '', '', '[]'::jsonb, 'buy-back-your-time', 'Buy Back Your Time', 'Dan Martell', '9780593422977', 'Productivity & Time Management', 'stone', 'A prompt to examine where time goes, which tasks deserve attention and when a repeatable process might make work easier.', 'Thinking about where time goes and which repetitive processes can be improved.', '["Notice the value and use of time.","Prioritize important work.","Identify repetitive tasks.","Consider delegation and systems when appropriate.","Create room for meaningful activities."]'::jsonb, '["Which repeated workflow could first be documented, then simplified?","Would automating a task save enough time to justify maintaining it?"]'::jsonb, '["Workflow automation","Process design","Time management"]'::jsonb),
('10000000-0000-4000-8000-000000000006', 6, 'Read', true, '', '', '[]'::jsonb, 'thinking-fast-and-slow', 'Thinking, Fast and Slow', 'Daniel Kahneman', '9780374533557', 'Psychology & Decision-Making', 'ochre', 'A lens for examining intuitive and analytical thinking, cognitive bias and the uncertainty involved in making decisions.', 'Questioning assumptions and thinking more carefully about decisions.', '["Intuitive and analytical thinking operate differently.","Cognitive biases can influence judgment.","Confidence is not the same as accuracy.","Decisions often involve uncertainty.","First impressions can be worth questioning."]'::jsonb, '["What evidence would challenge a first technical assumption?","Could a debugging decision be influenced by overconfidence or confirmation bias?"]'::jsonb, '["Problem-solving","Technical decisions","Critical thinking"]'::jsonb),
('10000000-0000-4000-8000-000000000007', 7, 'Read', true, '', '', '[]'::jsonb, 'deep-work', 'Deep Work', 'Cal Newport', '9781455586691', 'Focus & Concentration', 'forest', 'A discussion of focused attention and the conditions that may support demanding learning and meaningful technical work.', 'Creating time for meaningful, distraction-free learning and technical work.', '["Focused attention supports demanding tasks.","Distractions can fragment concentration.","Deliberate practice takes effort.","Protect time for cognitively demanding work.","Concentration is a capacity to develop."]'::jsonb, '["What would a realistic distraction-free programming session look like?","How could a learning session have a clear stopping point and purpose?"]'::jsonb, '["Programming practice","Focused learning","Attention"]'::jsonb),
('10000000-0000-4000-8000-000000000008', 8, 'Read', true, '', '', '[]'::jsonb, 'think-and-grow-rich', 'Think and Grow Rich', 'Napoleon Hill', '9781585424337', 'Goals & Personal Development', 'wine', 'A historical success-oriented perspective to read critically, considering its ideas about ambition and persistence without treating them as guarantees.', 'Clarifying ambitions and considering the persistence needed to keep progressing.', '["Clear goals can help direct effort.","Persistence is a theme worth examining.","Personal initiative can shape action.","Long-term motivation needs reflection.","Success narratives deserve critical evaluation."]'::jsonb, '["How could a broad ambition become a concrete next step?","When should persistence be balanced with changing direction?"]'::jsonb, '["Goal setting","Initiative","Critical reflection"]'::jsonb)
on conflict do nothing;

commit;
