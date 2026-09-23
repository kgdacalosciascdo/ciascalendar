import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const db = new PGlite()
const adminId = '00000000-0000-4000-8000-000000000001'
const staffId = '00000000-0000-4000-8000-000000000002'
const eventId = '00000000-0000-4000-8000-000000000003'
let categoryId: string
let leaveCategoryId: string
let employeeId: string
async function actAs(id: string, role = 'authenticated') {
  await db.exec(`reset role; set role ${role};`)
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id])
}
async function save(overrides: Record<string, unknown> = {}) {
  return db.query('select public.save_calendar_event($1::jsonb)', [
    JSON.stringify({
      id: eventId,
      title: 'Test meeting',
      description: '',
      category_id: categoryId,
      start_date: '2026-09-22',
      end_date: '2026-09-22',
      all_day: true,
      location: '',
      employee_id: null,
      status: 'confirmed',
      visibility: 'office',
      ...overrides,
    }),
  ])
}
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;`)
  await db.exec(
    readFileSync('supabase/migrations/202609220001_calendar.sql', 'utf8'),
  )
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)', [
    adminId,
    'admin@example.com',
    staffId,
    'staff@example.com',
  ])
  await db.query("update public.profiles set role='admin' where id=$1", [
    adminId,
  ])
  categoryId = (
    await db.query<{ id: string }>(
      "select id from public.event_categories where name='Meeting'",
    )
  ).rows[0].id
  leaveCategoryId = (
    await db.query<{ id: string }>(
      "select id from public.event_categories where name='Employee Leave'",
    )
  ).rows[0].id
  await db.exec(readFileSync('supabase/seed.sql', 'utf8'))
  employeeId = (
    await db.query<{ id: string }>('select id from public.employees limit 1')
  ).rows[0].id
})
afterAll(async () => {
  await db.close()
})
describe('PostgreSQL migration, atomic saves, and RLS', () => {
  it('creates staff profiles and permits an admin to create an audited event', async () => {
    await actAs(adminId)
    await save()
    expect(
      (
        await db.query<{ role: string }>(
          'select role from profiles where id=$1',
          [staffId],
        )
      ).rows[0].role,
    ).toBe('staff')
    expect(
      (await db.query('select * from events where id=$1', [eventId])).rows,
    ).toHaveLength(1)
    expect(
      (
        await db.query('select * from activity_logs where entity_id=$1', [
          eventId,
        ])
      ).rows,
    ).toHaveLength(1)
  })
  it('atomically creates leave details, preserves creator, and updates the employee link', async () => {
    await save({
      category_id: leaveCategoryId,
      employee_id: employeeId,
      employee_leave_details: {
        leave_type: 'Vacation Leave',
        leave_status: 'approved',
      },
    })
    expect(
      (
        await db.query<{ employee_id: string }>(
          'select employee_id from employee_leave_details where event_id=$1',
          [eventId],
        )
      ).rows[0].employee_id,
    ).toBe(employeeId)
    expect(
      (
        await db.query<{ created_by: string }>(
          'select created_by from events where id=$1',
          [eventId],
        )
      ).rows[0].created_by,
    ).toBe(adminId)
  })
  it('rolls back event changes when detail validation fails', async () => {
    await expect(
      save({
        title: 'Must roll back',
        category_id: leaveCategoryId,
        employee_id: employeeId,
        employee_leave_details: {
          leave_type: 'INVALID',
          leave_status: 'approved',
        },
      }),
    ).rejects.toThrow()
    expect(
      (
        await db.query<{ title: string }>(
          'select title from events where id=$1',
          [eventId],
        )
      ).rows[0].title,
    ).toBe('Test meeting')
  })
  it('allows staff reads but prevents writes, role escalation, and audit tampering', async () => {
    await actAs(staffId)
    expect(
      (await db.query('select * from events where id=$1', [eventId])).rows,
    ).toHaveLength(1)
    await expect(save({ title: 'Unauthorized' })).rejects.toThrow(
      'Administrator access',
    )
    await expect(
      db.query(
        "insert into employees(employee_number,first_name,last_name) values('NO','No','Access')",
      ),
    ).rejects.toThrow()
    await db.query("update profiles set role='admin' where id=$1", [staffId])
    expect(
      (
        await db.query<{ role: string }>(
          'select role from profiles where id=$1',
          [staffId],
        )
      ).rows[0].role,
    ).toBe('staff')
    await db.query('delete from events where id=$1', [eventId])
    expect(
      (await db.query('select * from events where id=$1', [eventId])).rows,
    ).toHaveLength(1)
    expect((await db.query('select * from activity_logs')).rows).toHaveLength(0)
    await expect(
      db.query(
        "insert into activity_logs(action,entity_type,entity_id,description) values('FAKE','event',$1,'fake')",
        [eventId],
      ),
    ).rejects.toThrow()
  })
  it('hides admin-only events and their leave details from staff', async () => {
    await actAs(adminId)
    await save({
      visibility: 'admin',
      category_id: leaveCategoryId,
      employee_id: employeeId,
      employee_leave_details: {
        leave_type: 'Sick Leave',
        leave_status: 'pending',
      },
    })
    await actAs(staffId)
    expect(
      (await db.query('select * from events where id=$1', [eventId])).rows,
    ).toHaveLength(0)
    expect(
      (
        await db.query(
          'select * from employee_leave_details where event_id=$1',
          [eventId],
        )
      ).rows,
    ).toHaveLength(0)
  })
  it('removes stale conditional details and normalizes holidays to all-day', async () => {
    await actAs(adminId)
    const holiday = (
      await db.query<{ id: string }>(
        "select id from event_categories where name='Holiday'",
      )
    ).rows[0].id
    await save({
      category_id: holiday,
      all_day: false,
      start_time: '09:00',
      end_time: '10:00',
      holiday_details: { holiday_type: 'Office Holiday' },
    })
    expect(
      (
        await db.query(
          'select * from employee_leave_details where event_id=$1',
          [eventId],
        )
      ).rows,
    ).toHaveLength(0)
    expect(
      (
        await db.query<{ all_day: boolean; start_time: null }>(
          'select all_day,start_time from events where id=$1',
          [eventId],
        )
      ).rows[0],
    ).toEqual({ all_day: true, start_time: null })
    expect(
      (
        await db.query('select * from holiday_details where event_id=$1', [
          eventId,
        ])
      ).rows,
    ).toHaveLength(1)
  })
  it('protects system category names and uses employee deactivation', async () => {
    await expect(
      db.query(
        "update event_categories set name='Renamed' where name='Employee Leave'",
      ),
    ).rejects.toThrow('System category')
    await expect(
      db.query('delete from employees where id=$1', [employeeId]),
    ).rejects.toThrow()
    await db.query('update employees set active=false where id=$1', [
      employeeId,
    ])
    expect(
      (
        await db.query<{ active: boolean }>(
          'select active from employees where id=$1',
          [employeeId],
        )
      ).rows[0].active,
    ).toBe(false)
  })
  it('cascades event deletion and denies anonymous data access', async () => {
    await db.query('delete from events where id=$1', [eventId])
    expect(
      (
        await db.query('select * from holiday_details where event_id=$1', [
          eventId,
        ])
      ).rows,
    ).toHaveLength(0)
    await actAs('', 'anon')
    await expect(db.query('select * from events')).rejects.toThrow()
    await expect(save()).rejects.toThrow()
  })
  it('enables anonymous users to read only the office calendar after the public-display migration', async () => {
    await db.exec('reset role')
    await db.exec(
      readFileSync(
        'supabase/migrations/202609230001_public_calendar_read.sql',
        'utf8',
      ),
    )
    await actAs('', 'anon')
    expect(
      (await db.query('select * from events')).rows.length,
    ).toBeGreaterThan(0)
    expect(
      (await db.query('select * from event_categories')).rows.length,
    ).toBeGreaterThan(0)
    const publicEmployees = await db.query<{ email: string }>(
      'select * from get_public_calendar_employees()',
    )
    expect(publicEmployees.rows.length).toBeGreaterThan(0)
    expect(
      publicEmployees.rows.every((employee) => employee.email === ''),
    ).toBe(true)
    await expect(
      db.query(
        "insert into event_categories(name,color) values('No','#ffffff')",
      ),
    ).rejects.toThrow()
  })
  it('stores multiple event participants and exposes only their links in the public calendar', async () => {
    await db.exec('reset role')
    await db.exec(
      readFileSync(
        'supabase/migrations/202609230002_event_participants.sql',
        'utf8',
      ),
    )
    const secondEmployeeId = (
      await db.query<{ id: string }>(
        'select id from employees where id <> $1 limit 1',
        [employeeId],
      )
    ).rows[0].id
    await actAs(adminId)
    await save({ employee_ids: [employeeId, secondEmployeeId] })
    expect(
      (
        await db.query(
          'select * from event_employees where event_id=$1 order by employee_id',
          [eventId],
        )
      ).rows,
    ).toHaveLength(2)
    await actAs('', 'anon')
    expect(
      (
        await db.query('select * from event_employees where event_id=$1', [
          eventId,
        ])
      ).rows,
    ).toHaveLength(2)
    await expect(
      db.query(
        'insert into event_employees(event_id,employee_id) values($1,$2)',
        [eventId, employeeId],
      ),
    ).rejects.toThrow()
  })

  it('generates recurring public birthday events from user profiles', async () => {
    await db.exec('reset role')
    await db.exec(
      readFileSync(
        'supabase/migrations/202609230003_recurring_birthdays.sql',
        'utf8',
      ),
    )
    await db.query(
      "update public.profiles set full_name='Calendar Birthday User', birth_date='1992-02-29' where id=$1",
      [adminId],
    )
    await actAs('', 'anon')
    const birthdays = await db.query<{ title: string; start_date: string }>(
      "select title, start_date::text from public.get_recurring_birthday_events() where title like 'Calendar Birthday User%' order by start_date",
    )
    expect(birthdays.rows).toHaveLength(3)
    expect(
      birthdays.rows.every((birthday) => birthday.title.includes('Birthday')),
    ).toBe(true)
    expect(
      birthdays.rows.some((birthday) => birthday.start_date.endsWith('-02-28')),
    ).toBe(true)
  })

  it('keeps history while excluding inactive accounts from recurring birthdays', async () => {
    await db.exec('reset role')
    await db.exec(
      readFileSync(
        'supabase/migrations/202609230004_inactive_user_accounts.sql',
        'utf8',
      ),
    )
    const eventCount = (await db.query('select * from events')).rows.length
    await db.query('update public.profiles set active=false where id=$1', [
      adminId,
    ])
    expect((await db.query('select * from events')).rows).toHaveLength(
      eventCount,
    )
    await actAs('', 'anon')
    expect(
      (
        await db.query(
          "select * from public.get_recurring_birthday_events() where title like 'Calendar Birthday User%'",
        )
      ).rows,
    ).toHaveLength(0)
  })
})
