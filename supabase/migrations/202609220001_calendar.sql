begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_number text not null unique check (length(trim(employee_number)) > 0),
  first_name text not null check (length(trim(first_name)) > 0),
  middle_name text not null default '', last_name text not null check (length(trim(last_name)) > 0),
  suffix text not null default '', position text not null default '', department text not null default '',
  email text not null default '', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.event_categories (
  id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) > 0),
  description text not null default '', color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  icon text not null default 'CalendarDays', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index event_categories_name_unique on public.event_categories(lower(name));
create table public.events (
  id uuid primary key default gen_random_uuid(), title varchar(200) not null check (length(trim(title)) > 0),
  description text not null default '', category_id uuid not null references public.event_categories(id),
  start_date date not null, end_date date, start_time time, end_time time,
  all_day boolean not null default true, location text not null default '',
  employee_id uuid references public.employees(id), created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  status text not null default 'confirmed' check (status in ('confirmed', 'pending', 'cancelled')),
  visibility text not null default 'office' check (visibility in ('office', 'admin')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check ((all_day and start_time is null and end_time is null) or (not all_day and start_time is not null and end_time is not null and (coalesce(end_date, start_date) > start_date or end_time > start_time)))
);
create index events_dates_idx on public.events(start_date, end_date);
create index events_category_idx on public.events(category_id);
create index events_employee_idx on public.events(employee_id);
create table public.employee_leave_details (
  id uuid primary key default gen_random_uuid(), event_id uuid not null unique references public.events(id) on delete cascade,
  employee_id uuid not null references public.employees(id),
  leave_type text not null check (leave_type in ('Vacation Leave', 'Sick Leave', 'Special Privilege Leave', 'Mandatory / Forced Leave', 'Maternity Leave', 'Paternity Leave', 'Solo Parent Leave', 'Study Leave', 'Rehabilitation Leave', 'Other')),
  leave_status text not null check (leave_status in ('approved', 'pending', 'cancelled')), notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.holiday_details (
  id uuid primary key default gen_random_uuid(), event_id uuid not null unique references public.events(id) on delete cascade,
  holiday_type text not null check (holiday_type in ('Regular Holiday', 'Special Non-Working Holiday', 'Local Holiday', 'Office Holiday', 'Other')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete set null,
  action text not null, entity_type text not null, entity_id uuid not null, description text not null,
  created_at timestamptz not null default now()
);
create index activity_logs_created_idx on public.activity_logs(created_at desc);

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, role) values(new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Office user'), 'staff');
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- Existing Supabase accounts also receive staff profiles; promotion is a separate privileged step.
insert into public.profiles(id, full_name) select id, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'Office user') from auth.users on conflict(id) do nothing;

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create function public.protect_system_category() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.name in ('Employee Leave', 'Holiday') and new.name <> old.name then raise exception 'System category names cannot be changed.'; end if;
  return new;
end;
$$;
create trigger protect_system_category before update on public.event_categories for each row execute function public.protect_system_category();

create function public.log_calendar_action() returns trigger language plpgsql security definer set search_path = '' as $$
declare record_data jsonb; actor text; label text;
begin
  record_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  select full_name into actor from public.profiles where id = auth.uid();
  label := coalesce(record_data->>'title', record_data->>'name', concat_ws(' ', record_data->>'first_name', record_data->>'last_name'));
  insert into public.activity_logs(user_id, action, entity_type, entity_id, description)
  values(auth.uid(), tg_op, tg_table_name, (record_data->>'id')::uuid, coalesce(actor, 'System') || ' ' || lower(tg_op) || ' ' || tg_table_name || ': ' || label);
  if tg_op = 'DELETE' then return old; end if; return new;
end;
$$;
revoke all on function public.log_calendar_action() from public;

do $$ declare t text; begin
  foreach t in array array['profiles','employees','event_categories','events','employee_leave_details','holiday_details'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
  foreach t in array array['employees','event_categories','events'] loop
    execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.log_calendar_action()', t);
  end loop;
  foreach t in array array['profiles','employees','event_categories','events','employee_leave_details','holiday_details','activity_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

grant select on public.profiles to authenticated;
grant update(full_name, role) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_admin_update on public.profiles for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

grant select, insert, update on public.employees, public.event_categories to authenticated;
create policy employees_read on public.employees for select to authenticated using (true);
create policy employees_insert on public.employees for insert to authenticated with check ((select public.is_admin()));
create policy employees_update on public.employees for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy categories_read on public.event_categories for select to authenticated using (true);
create policy categories_insert on public.event_categories for insert to authenticated with check ((select public.is_admin()));
create policy categories_update on public.event_categories for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

grant select, insert, update, delete on public.events, public.employee_leave_details, public.holiday_details to authenticated;
create policy events_read on public.events for select to authenticated using (visibility = 'office' or (select public.is_admin()));
create policy events_insert on public.events for insert to authenticated with check ((select public.is_admin()) and created_by = (select auth.uid()));
create policy events_update on public.events for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy events_delete on public.events for delete to authenticated using ((select public.is_admin()));
create policy leaves_read on public.employee_leave_details for select to authenticated using (exists(select 1 from public.events where id = event_id));
create policy leaves_write on public.employee_leave_details for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy holidays_read on public.holiday_details for select to authenticated using (exists(select 1 from public.events where id = event_id));
create policy holidays_write on public.holiday_details for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
grant select on public.activity_logs to authenticated;
create policy logs_read on public.activity_logs for select to authenticated using ((select public.is_admin()));

-- One transaction saves the event and its conditional details. RLS also applies inside this invoker function.
create function public.save_calendar_event(payload jsonb) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_event_id uuid; category_name text; is_all_day boolean; target_employee uuid;
begin
  if not public.is_admin() then raise exception 'Administrator access is required.' using errcode = '42501'; end if;
  v_event_id := (payload->>'id')::uuid;
  select name into category_name from public.event_categories where id = (payload->>'category_id')::uuid;
  if category_name is null then raise exception 'Category does not exist.'; end if;
  is_all_day := category_name = 'Holiday' or coalesce((payload->>'all_day')::boolean, true);
  target_employee := nullif(payload->>'employee_id','')::uuid;
  if category_name = 'Employee Leave' and (target_employee is null or payload->'employee_leave_details' is null or payload->'employee_leave_details' = 'null'::jsonb) then raise exception 'Employee and leave details are required.'; end if;
  if category_name = 'Holiday' and (payload->'holiday_details' is null or payload->'holiday_details' = 'null'::jsonb) then raise exception 'Holiday details are required.'; end if;
  insert into public.events(id,title,description,category_id,start_date,end_date,start_time,end_time,all_day,location,employee_id,status,visibility,created_by)
  values(v_event_id,trim(payload->>'title'),coalesce(payload->>'description',''),(payload->>'category_id')::uuid,(payload->>'start_date')::date,nullif(payload->>'end_date','')::date,
    case when is_all_day then null else (payload->>'start_time')::time end,case when is_all_day then null else (payload->>'end_time')::time end,is_all_day,coalesce(payload->>'location',''),target_employee,payload->>'status',payload->>'visibility',auth.uid())
  on conflict(id) do update set title=excluded.title,description=excluded.description,category_id=excluded.category_id,start_date=excluded.start_date,end_date=excluded.end_date,start_time=excluded.start_time,end_time=excluded.end_time,all_day=excluded.all_day,location=excluded.location,employee_id=excluded.employee_id,status=excluded.status,visibility=excluded.visibility;
  if category_name = 'Employee Leave' then
    insert into public.employee_leave_details(event_id,employee_id,leave_type,leave_status,notes)
    values(v_event_id,target_employee,payload->'employee_leave_details'->>'leave_type',payload->'employee_leave_details'->>'leave_status',coalesce(payload->'employee_leave_details'->>'notes',''))
    on conflict(event_id) do update set employee_id=excluded.employee_id,leave_type=excluded.leave_type,leave_status=excluded.leave_status,notes=excluded.notes;
  else delete from public.employee_leave_details where employee_leave_details.event_id = v_event_id; end if;
  if category_name = 'Holiday' then
    insert into public.holiday_details(event_id,holiday_type) values(v_event_id,payload->'holiday_details'->>'holiday_type')
    on conflict(event_id) do update set holiday_type=excluded.holiday_type;
  else delete from public.holiday_details where holiday_details.event_id = v_event_id; end if;
  return v_event_id;
end;
$$;
revoke all on function public.save_calendar_event(jsonb) from public;
grant execute on function public.save_calendar_event(jsonb) to authenticated;

insert into public.event_categories(name,description,color,icon) values
('Office Activity','Shared office activities and programs.','#347a68','CalendarDays'),
('Meeting','Team meetings and coordination.','#4169c1','Users'),
('Employee Leave','Recorded employee absences.','#c68b35','Briefcase'),
('Holiday','Official and office holidays.','#bd5b67','Flag'),
('Training / Seminar','Learning and professional development.','#8b63b8','GraduationCap'),
('Deadline','Reports, submissions, and compliance dates.','#d36b44','Clock'),
('Official Travel','Office-related travel.','#3291a0','Plane'),
('Birthday','Team member birthdays.','#bf669c','Cake'),
('Office Celebration','Office milestones and celebrations.','#709149','PartyPopper'),
('Other','Other important office dates.','#74818d','CalendarDays');
commit;
