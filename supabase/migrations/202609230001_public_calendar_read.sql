-- Public, read-only office calendar display for shared office screens.
-- Writing continues to require an authenticated calendar administrator.
begin;

grant select on public.events, public.event_categories, public.employee_leave_details, public.holiday_details to anon;

create policy events_public_calendar_read on public.events
  for select to anon using (visibility = 'office');
create policy categories_public_calendar_read on public.event_categories
  for select to anon using (true);
create policy leaves_public_calendar_read on public.employee_leave_details
  for select to anon using (
    exists (
      select 1 from public.events
      where events.id = event_id and events.visibility = 'office'
    )
  );
create policy holidays_public_calendar_read on public.holiday_details
  for select to anon using (
    exists (
      select 1 from public.events
      where events.id = event_id and events.visibility = 'office'
    )
  );

-- The public calendar needs employee display names, not the employee directory.
-- This does not return email addresses, employee numbers, job details, or departments.
create function public.get_public_calendar_employees()
returns table (
  id uuid,
  employee_number text,
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  "position" text,
  department text,
  email text,
  active boolean
)
language sql stable security definer set search_path = '' as $$
  select id, ''::text, first_name, middle_name, last_name, suffix,
    ''::text, ''::text, ''::text, active
  from public.employees;
$$;
revoke all on function public.get_public_calendar_employees() from public;
grant execute on function public.get_public_calendar_employees() to anon;

commit;
