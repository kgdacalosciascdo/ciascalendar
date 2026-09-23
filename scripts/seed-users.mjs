import { createClient } from '@supabase/supabase-js'

const employees = [
  ['roadaphny@gmail.com', 'Daphny', 'Roa'],
  ['sherlynlasacar21@gmail.com', 'Sherlyn Mae', 'Lasacar'],
  ['michelledampog.cias@gmail.com', 'Michelle', 'Dampog'],
  ['charrymaybagg.cias@gmail.com', 'Charry May', 'Bagongon'],
  ['marissabarcelona.cias@gmail.com', 'Marissa', 'Barcelona'],
  ['kristineyare.cias@gmail.com', 'Kristine Jeremy', 'Yare'],
  ['hlee.cias@gmail.com', 'Honolito', 'Lee'],
  ['kyledacalos318@gmail.com', 'Kyle Czepano', 'Dacalos'],
  ['jhonelmira@gmail.com', 'Jhonel', 'Mira'],
]

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.SEED_PASSWORD || 'cias2026'
const defaultAdminEmails = new Set([
  'roadaphny@gmail.com',
  'sherlynlasacar21@gmail.com',
])
const additionalAdminEmails = new Set(
  (process.env.SEED_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
)

if (!url || !serviceRoleKey) {
  throw new Error(
    'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.seed before running this script.',
  )
}

if (password.length < 6) {
  throw new Error(
    'Supabase requires passwords of at least six characters by default. Use a temporary password such as cias2026, or change your project password policy before running this script.',
  )
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserByEmail(email) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    })
    if (error) throw error
    const user = data.users.find((item) => item.email?.toLowerCase() === email)
    if (user) return user
    if (data.users.length < 1000) return null
  }
}

for (const [index, [email, firstName, lastName]] of employees.entries()) {
  const fullName = `${firstName} ${lastName}`
  let user = await findUserByEmail(email)

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (error) throw new Error(`${email}: ${error.message}`)
    user = data.user
    console.log(`Created Auth user: ${email}`)
  } else {
    console.log(`Existing Auth user kept: ${email}`)
  }

  const isAdmin =
    defaultAdminEmails.has(email) || additionalAdminEmails.has(email)
  const { data: existingProfile, error: profileReadError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profileReadError) throw new Error(`${email}: ${profileReadError.message}`)
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      full_name: fullName,
      // Never silently downgrade an existing administrator on a later seed run.
      role: isAdmin ? 'admin' : existingProfile?.role || 'staff',
    },
    { onConflict: 'id' },
  )
  if (profileError) throw new Error(`${email}: ${profileError.message}`)

  const { error: employeeError } = await supabase.from('employees').upsert(
    {
      employee_number: `CIAS-${String(index + 1).padStart(3, '0')}`,
      first_name: firstName,
      middle_name: '',
      last_name: lastName,
      suffix: '',
      position: '',
      department: 'City Internal Audit Services',
      email,
      active: true,
    },
    { onConflict: 'employee_number' },
  )
  if (employeeError) throw new Error(`${email}: ${employeeError.message}`)
}

console.log(`Seed complete: ${employees.length} employees.`)
console.log('Calendar administrators: Daphny Roa and Sherlyn Mae Lasacar.')
