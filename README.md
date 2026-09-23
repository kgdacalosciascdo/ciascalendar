# CIAS CALENDAR

A shared internal office calendar built on the existing React + TypeScript + Vite template. Includes month/week/day calendars, upcoming entries, employee records, configurable categories, employee leaves, holidays, and an administrator login.

## Run locally

```sh
npm install
npm run dev
```

The default page is the shared, read-only office calendar. On the same network, open the Vite **Network** address shown in the terminal (for example `http://192.168.1.25:5173`) from another office device. Select **Sign in** to manage calendar data. For a lasting office deployment, serve the built `dist/` folder through Laragon/Apache and make that computer's local address available to the network.

Without Supabase environment values, the login screen offers **Open admin demo** and **Preview as read-only staff**. These are explicitly labeled local previews, not authenticated production accounts. Demo changes persist in this browser's local storage; the selected demo role persists in the tab session. There is no hardcoded admin password. Supplying credentials for your existing Supabase project removes the demo entry points entirely.

## Connect Supabase and enable real login

1. Use your existing Supabase project; no additional project is required.
2. Run `supabase/migrations/202609220001_calendar.sql`, then `supabase/migrations/202609230001_public_calendar_read.sql`, then `supabase/migrations/202609230002_event_participants.sql`, then `supabase/migrations/202609230003_recurring_birthdays.sql`, then `supabase/migrations/202609230004_inactive_user_accounts.sql`, then `supabase/migrations/202609230005_employee_birthdays.sql`, in that project's Supabase SQL Editor, or apply them with the Supabase CLI. The first creates the calendar tables, policies, functions, profile trigger, audit triggers, and the ten default categories. The second enables the read-only office calendar shown before sign-in. The third adds multiple employee participants to each event. The fourth adds profile birthdays and generates office-visible Birthday entries every year. The fifth adds the inactive-account status safeguard. The sixth makes the Employee birthday field the source of automatic Birthday entries. Review the first migration if your project already has a `public.profiles` table, since the calendar uses `profiles.id`, `full_name`, and `role`.
3. In **Authentication → Providers / Sign In**, disable public email sign-ups. Do not enable anonymous sign-ins. The app has no registration screen; this project setting also blocks direct API registration.
4. In **Authentication → Users**, use your existing user accounts or manually add an administrator with an email and password. The calendar shows a standard **Email address / Password** form and signs in directly with the supplied email. Set `full_name` in user metadata if desired. The profile trigger creates every new account as `staff`; metadata cannot grant admin access.
5. In the SQL Editor, promote your chosen account using its actual email:

   ```sql
   update public.profiles
   set role = 'admin', full_name = 'CIAS Administrator'
   where id = (select id from auth.users where email = 'your-admin@your-office.gov.ph');
   ```

6. Copy `.env.example` to `.env.local` and enter the project URL and public anon/publishable key:

   ```dotenv
   VITE_SUPABASE_URL=https://your-existing-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-public-client-key
   ```

   Never use a service-role or secret key in frontend environment variables.

7. Restart Vite, then sign in with the email and password from your account. Additional users created through Supabase receive staff access by default. Existing auth users also receive staff profiles when the migration runs.

   To add a login without an Edge Function, open **Authentication → Users** in Supabase Dashboard and choose **Add user**. Enter the employee email and a temporary password such as `cias2026`, then create the matching employee record in CIAS CALENDAR using the same email. The profile trigger gives new Auth users `staff` access by default. Use the SQL command in step 5 when an account needs administrator access.

8. To create the CIAS employee accounts and employee records, copy `.env.seed.example` to `.env.seed`, enter the existing project's service-role key, then run:

   ```sh
   npm run seed:users
   ```

   This creates the nine supplied City Internal Audit Services accounts if missing, confirms their email addresses, gives them staff access by default, and upserts matching employee records. **Daphny Roa** (`roadaphny@gmail.com`) and **Sherlyn Mae Lasacar** (`sherlynlasacar21@gmail.com`) are assigned calendar administrator access automatically. Existing Auth users are preserved and their passwords are not reset. Existing administrator roles are preserved; set `SEED_ADMIN_EMAILS` only if you later need additional administrators. The service-role key is used only by this local script and must never be placed in a `VITE_` variable or deployed with the site.

   The seed defaults newly created accounts to the requested temporary password `cias2026`; set `SEED_PASSWORD` to replace it. Have every user change this shared password after their first sign-in.

9. `supabase/seed.sql` remains an optional **development-only** seed for the employee directory and sample calendar entries. Event seed inserts are not idempotent; run it once. Sample holidays are explicitly labeled and are not an authoritative holiday list.

Supabase Auth still stores password hashes and handles the session securely; the calendar does not store passwords in `profiles` or any calendar table. Real credentials and a remote project are not included. Authentication and network connectivity require the above configuration; local tests exercise the SQL migration and permission policies in embedded PostgreSQL, not a live Supabase project.

## Features

- A public, read-only calendar landing page with the upcoming list visible before sign-in. It includes office-visible events and employee display names; it does not expose the employee directory, email addresses, admin-only events, or write controls.
- Protected management routes, persistent Supabase sessions, sign-out, user profile, admin/staff roles.
- Signed-in users can change their password from Settings by entering their current password and a confirmed replacement.
- FullCalendar month, week, and day views with navigation and clickable entries.
- Admin create, edit, and confirmed delete; staff read-only access.
- Inclusive multi-day dates, timed events, all-day events, locations, descriptions, and employee associations.
- Conditional leave type/status and holiday type fields; holidays are all-day.
- Category toggles, employee/status/date filters, and search across dates, titles, employees, descriptions, and locations.
- Upcoming entries grouped by today, tomorrow, this week, and later.
- Employee creation, editing, search, and deactivation without destroying history.
- Multiple employee participants per calendar event, with individual and Select all controls. Employee leave remains linked to exactly one employee.
- Each employee has a birthday; Birthday entries are generated automatically each year from the employee record.
- Category creation, color/icon configuration, and deactivation. The system names `Employee Leave` and `Holiday` are fixed because they determine conditional fields.
- Database-generated activity history, notifications, loading/error/empty states, keyboard-accessible dialogs, and responsive navigation.

## Data and permissions

`profiles`, `employees`, `event_categories`, `events`, `employee_leave_details`, `holiday_details`, and `activity_logs` all have RLS enabled. Anonymous users receive no table access. Staff can read office-visible entries and reference records; admin-only events and related details are hidden. Only admins can write calendar data. Staff cannot promote themselves. Employee/category deletion is intentionally unavailable: use deactivation. Audit records are generated by triggers and cannot be inserted, changed, or deleted by frontend users.

The `save_calendar_event` RPC saves the event and its conditional details in a single transaction. Invalid details roll back the whole operation; changing category removes stale detail records. The original creator is retained during edits. Client-side validation complements PostgreSQL constraints and RLS.

Dates are stored as office calendar dates and local wall-clock times, not UTC instants. Use **Asia/Manila (UTC+8)** consistently. End dates in forms are inclusive; the FullCalendar adapter adds one day to all-day end dates for its exclusive-end convention. A calendar entry's general status is separate from the recorded leave status; pending leaves are visually subdued. This is a recording tool, not a leave approval workflow. Refresh the page to fetch changes made by other users; live subscriptions are not included.

## Checks

```sh
npm run build
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
```

Unit tests cover validation, dates, inclusive all-day mapping, leave mapping, filters, and role helpers. Embedded PostgreSQL tests execute the real migration and seed, exercise atomic saves, and verify RLS as admin, staff, and anonymous roles. Browser tests cover event CRUD/persistence, filters, leave/holiday forms, employee/category management, navigation, staff permissions, and mobile width. Browser tests expect the local demo environment (no Supabase variables).

## Deployment

`npm run build` outputs `dist/`. Configure your host to serve `index.html` for client-side routes such as `/calendar` and `/login`. Set the Supabase variables **before building**, enable HTTPS, set your Supabase Auth site URL to the deployed origin, and disable public sign-ups. Vite's development server is separate from Laragon's PHP/Apache server; run the Vite URL during development. For Apache production hosting, configure a history fallback to `index.html`.

## Structure

```text
src/components/     Calendar UI, event dialogs, layout, shared controls
src/features/auth/ Session and profile handling
src/hooks/         Calendar data state and mutations
src/lib/           Supabase client and local demo adapter
src/pages/         Calendar, upcoming, employees, categories, settings, login
src/services/      Supabase queries and persistence
src/types/         Shared domain types
src/utils/         Date mapping, filtering, validation, permissions
supabase/          SQL migration and optional development seed
tests/             Logic, PostgreSQL permissions, and browser tests
```

Reference documentation: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), and [FullCalendar event date semantics](https://fullcalendar.io/docs/event-parsing).
