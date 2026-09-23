-- Employee records are the source of recurring office birthday entries.
begin;

alter table public.employees add column if not exists birth_date date;

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
    'birthday-' || employees.id::text || '-' || years.year::text,
    concat_ws(' ', employees.first_name, employees.middle_name, employees.last_name, employees.suffix) || ' - Birthday',
    'Birthday generated from the employee record.',
    categories.id,
    make_date(
      years.year,
      extract(month from employees.birth_date)::integer,
      least(
        extract(day from employees.birth_date)::integer,
        extract(day from (
          make_date(years.year, extract(month from employees.birth_date)::integer, 1)
          + interval '1 month - 1 day'
        ))::integer
      )
    ),
    null::date,
    null::time,
    null::time,
    true,
    ''::text,
    employees.id,
    null::uuid,
    'confirmed'::text,
    'office'::text
  from public.employees
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
  where employees.active
    and employees.birth_date is not null;
$$;
revoke all on function public.get_recurring_birthday_events() from public;
grant execute on function public.get_recurring_birthday_events() to anon, authenticated;

commit;
