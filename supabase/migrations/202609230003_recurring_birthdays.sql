-- Birthdays are stored on the user profile and projected onto the calendar each year.
begin;

alter table public.profiles add column if not exists birth_date date;

create or replace function public.get_recurring_birthday_events()
returns table(
  id text,
  title text,
  description text,
  category_id uuid,
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  all_day boolean,
  location text,
  employee_id uuid,
  created_by uuid,
  status text,
  visibility text
)
language sql stable security definer set search_path = '' as $$
  select
    'birthday-' || profiles.id::text || '-' || years.year::text,
    profiles.full_name || ' - Birthday',
    'Birthday generated from the user account profile.',
    categories.id,
    make_date(
      years.year,
      extract(month from profiles.birth_date)::integer,
      least(
        extract(day from profiles.birth_date)::integer,
        extract(day from (
          make_date(years.year, extract(month from profiles.birth_date)::integer, 1)
          + interval '1 month - 1 day'
        ))::integer
      )
    ),
    null::date,
    null::time,
    null::time,
    true,
    ''::text,
    null::uuid,
    null::uuid,
    'confirmed'::text,
    'office'::text
  from public.profiles
  cross join generate_series(
    extract(year from current_date)::integer - 1,
    extract(year from current_date)::integer + 1
  ) as years(year)
  cross join lateral (
    select id
    from public.event_categories
    where name = 'Birthday'
    limit 1
  ) as categories
  where profiles.birth_date is not null
    and length(trim(profiles.full_name)) > 0;
$$;

revoke all on function public.get_recurring_birthday_events() from public;
grant execute on function public.get_recurring_birthday_events() to anon, authenticated;

commit;
