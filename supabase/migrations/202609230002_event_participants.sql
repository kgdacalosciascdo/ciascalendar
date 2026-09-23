begin;

create table public.event_employees (
  event_id uuid not null references public.events(id) on delete cascade,
  employee_id uuid not null references public.employees(id),
  created_at timestamptz not null default now(),
  primary key (event_id, employee_id)
);
create index event_employees_employee_idx on public.event_employees(employee_id);
insert into public.event_employees(event_id, employee_id)
  select id, employee_id from public.events where employee_id is not null
  on conflict do nothing;

alter table public.event_employees enable row level security;
revoke all on public.event_employees from anon, authenticated;
grant select, insert, delete on public.event_employees to authenticated;
create policy event_employees_read on public.event_employees
  for select to authenticated using (exists(select 1 from public.events where id = event_id));
create policy event_employees_insert on public.event_employees
  for insert to authenticated with check ((select public.is_admin()));
create policy event_employees_delete on public.event_employees
  for delete to authenticated using ((select public.is_admin()));
grant select on public.event_employees to anon;
create policy event_employees_public_read on public.event_employees
  for select to anon using (
    exists(select 1 from public.events where id = event_id and visibility = 'office')
  );

create or replace function public.save_calendar_event(payload jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_event_id uuid;
  category_name text;
  is_all_day boolean;
  target_employee uuid;
  participant_ids uuid[] := array[]::uuid[];
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;
  v_event_id := (payload->>'id')::uuid;
  select name into category_name from public.event_categories where id = (payload->>'category_id')::uuid;
  if category_name is null then raise exception 'Category does not exist.'; end if;
  is_all_day := category_name = 'Holiday' or coalesce((payload->>'all_day')::boolean, true);
  select coalesce(array_agg(distinct value::uuid), array[]::uuid[]) into participant_ids
  from jsonb_array_elements_text(
    case when jsonb_typeof(payload->'employee_ids') = 'array' then payload->'employee_ids' else '[]'::jsonb end
  ) as value;
  if cardinality(participant_ids) = 0 and nullif(payload->>'employee_id', '') is not null then
    participant_ids := array[(payload->>'employee_id')::uuid];
  end if;
  if category_name = 'Employee Leave' then
    if cardinality(participant_ids) <> 1 or payload->'employee_leave_details' is null or payload->'employee_leave_details' = 'null'::jsonb then
      raise exception 'One employee and leave details are required.';
    end if;
  end if;
  if category_name = 'Holiday' and (payload->'holiday_details' is null or payload->'holiday_details' = 'null'::jsonb) then
    raise exception 'Holiday details are required.';
  end if;
  target_employee := participant_ids[1];
  insert into public.events(id,title,description,category_id,start_date,end_date,start_time,end_time,all_day,location,employee_id,status,visibility,created_by)
  values(v_event_id,trim(payload->>'title'),coalesce(payload->>'description',''),(payload->>'category_id')::uuid,(payload->>'start_date')::date,nullif(payload->>'end_date','')::date,
    case when is_all_day then null else (payload->>'start_time')::time end,case when is_all_day then null else (payload->>'end_time')::time end,is_all_day,coalesce(payload->>'location',''),target_employee,payload->>'status',payload->>'visibility',auth.uid())
  on conflict(id) do update set title=excluded.title,description=excluded.description,category_id=excluded.category_id,start_date=excluded.start_date,end_date=excluded.end_date,start_time=excluded.start_time,end_time=excluded.end_time,all_day=excluded.all_day,location=excluded.location,employee_id=excluded.employee_id,status=excluded.status,visibility=excluded.visibility;
  delete from public.event_employees where event_id = v_event_id;
  insert into public.event_employees(event_id, employee_id)
    select v_event_id, employee_id from unnest(participant_ids) as employee_id;
  if category_name = 'Employee Leave' then
    insert into public.employee_leave_details(event_id,employee_id,leave_type,leave_status,notes)
    values(v_event_id,target_employee,payload->'employee_leave_details'->>'leave_type',payload->'employee_leave_details'->>'leave_status',coalesce(payload->'employee_leave_details'->>'notes',''))
    on conflict(event_id) do update set employee_id=excluded.employee_id,leave_type=excluded.leave_type,leave_status=excluded.leave_status,notes=excluded.notes;
  else delete from public.employee_leave_details where event_id = v_event_id; end if;
  if category_name = 'Holiday' then
    insert into public.holiday_details(event_id,holiday_type) values(v_event_id,payload->'holiday_details'->>'holiday_type')
    on conflict(event_id) do update set holiday_type=excluded.holiday_type;
  else delete from public.holiday_details where event_id = v_event_id; end if;
  return v_event_id;
end;
$$;
revoke all on function public.save_calendar_event(jsonb) from public;
grant execute on function public.save_calendar_event(jsonb) to authenticated;

commit;
