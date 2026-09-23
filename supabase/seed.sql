-- Optional development data. Run after the migration in a DEVELOPMENT project only.
begin;
insert into public.employees(employee_number,first_name,last_name,position,department,email) values
('CIAS-001','Daphny','Roa','','City Internal Audit Services','roadaphny@gmail.com'),
('CIAS-002','Sherlyn Mae','Lasacar','','City Internal Audit Services','sherlynlasacar21@gmail.com'),
('CIAS-003','Michelle','Dampog','','City Internal Audit Services','michelledampog.cias@gmail.com'),
('CIAS-004','Charry May','Bagongon','','City Internal Audit Services','charrymaybagg.cias@gmail.com'),
('CIAS-005','Marissa','Barcelona','','City Internal Audit Services','marissabarcelona.cias@gmail.com'),
('CIAS-006','Kristine Jeremy','Yare','','City Internal Audit Services','kristineyare.cias@gmail.com'),
('CIAS-007','Honolito','Lee','','City Internal Audit Services','hlee.cias@gmail.com'),
('CIAS-008','Kyle Czepano','Dacalos','','City Internal Audit Services','kyledacalos318@gmail.com'),
('CIAS-009','Jhonel','Mira','','City Internal Audit Services','jhonelmira@gmail.com')
on conflict(employee_number) do nothing;
insert into public.events(title,category_id,start_date,end_date,all_day,start_time,end_time,location,description)
select v.title,c.id,current_date + v.offset_days,current_date + v.offset_days,true,null,null,'CIAS Office','Development sample — replace with real office information.'
from (values ('Monthly Office Meeting','Meeting',0),('Quarterly Compliance Review','Deadline',2),('Office Wellness Activity','Office Activity',5),('Staff Training','Training / Seminar',1),('Report Submission Deadline','Deadline',6),('Maria Santos — Birthday','Birthday',3)) as v(title,category,offset_days)
join public.event_categories c on c.name=v.category;
with added as (
  insert into public.events(title,category_id,start_date,end_date,employee_id)
  select 'Daphny Roa — Vacation Leave',c.id,current_date+3,current_date+5,e.id from public.event_categories c cross join public.employees e where c.name='Employee Leave' and e.employee_number='CIAS-001' returning id,employee_id
) insert into public.employee_leave_details(event_id,employee_id,leave_type,leave_status) select id,employee_id,'Vacation Leave','approved' from added;
with added as (
  insert into public.events(title,category_id,start_date) select 'Office Holiday (sample)',id,current_date+8 from public.event_categories where name='Holiday' returning id
) insert into public.holiday_details(event_id,holiday_type) select id,'Office Holiday' from added;
commit;
