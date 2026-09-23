import { createClient } from '@supabase/supabase-js'

const temporaryPassword = 'cias2026'

function json(body: unknown, status = 200) {
  return Response.json(body, { status })
}

export async function POST(request: Request) {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey)
    return json(
      { error: 'The server is missing its Supabase configuration.' },
      500,
    )

  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer '))
    return json({ error: 'Sign in is required.' }, 401)

  let employee: Record<string, unknown>
  try {
    employee = await request.json()
  } catch {
    return json({ error: 'Invalid employee details.' }, 400)
  }
  const employeeNumber =
    typeof employee.employee_number === 'string'
      ? employee.employee_number.trim()
      : ''
  const firstName =
    typeof employee.first_name === 'string' ? employee.first_name.trim() : ''
  const lastName =
    typeof employee.last_name === 'string' ? employee.last_name.trim() : ''
  const email =
    typeof employee.email === 'string'
      ? employee.email.trim().toLowerCase()
      : ''
  if (!employeeNumber || !firstName || !lastName || !email)
    return json(
      { error: 'Employee number, name, and email address are required.' },
      400,
    )

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const token = authorization.slice('Bearer '.length)
  const {
    data: { user: caller },
    error: callerError,
  } = await admin.auth.getUser(token)
  if (callerError || !caller)
    return json({ error: 'Your session is no longer valid.' }, 401)
  const { data: profile } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', caller.id)
    .maybeSingle()
  if (profile?.role !== 'admin' || !profile.active)
    return json({ error: 'Administrator access is required.' }, 403)

  const { data: userList, error: usersError } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (usersError) return json({ error: usersError.message }, 500)
  let account = userList.users.find(
    (user) => user.email?.toLowerCase() === email,
  )
  let createdAccount = false
  if (!account) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: `${firstName} ${lastName}` },
    })
    if (error || !data.user)
      return json(
        { error: error?.message || 'Unable to create the login account.' },
        400,
      )
    account = data.user
    createdAccount = true
  }

  const { error: employeeError } = await admin.from('employees').insert({
    employee_number: employeeNumber,
    first_name: firstName,
    middle_name:
      typeof employee.middle_name === 'string'
        ? employee.middle_name.trim()
        : '',
    last_name: lastName,
    suffix: typeof employee.suffix === 'string' ? employee.suffix.trim() : '',
    position:
      typeof employee.position === 'string' ? employee.position.trim() : '',
    department:
      typeof employee.department === 'string' ? employee.department.trim() : '',
    email,
    birth_date:
      typeof employee.birth_date === 'string' && employee.birth_date
        ? employee.birth_date
        : null,
    active: employee.active !== false,
  })
  if (employeeError) {
    if (createdAccount) await admin.auth.admin.deleteUser(account.id)
    return json({ error: employeeError.message }, 400)
  }
  return json(
    {
      message: createdAccount
        ? `Employee and login created. Temporary password: ${temporaryPassword}`
        : 'Employee created. The matching login account already existed.',
    },
    201,
  )
}
