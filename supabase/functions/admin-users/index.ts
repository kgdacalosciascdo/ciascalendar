import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST')
    return Response.json(
      { error: 'Method not allowed.' },
      { status: 405, headers: corsHeaders },
    )

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer '))
    return Response.json(
      { error: 'Sign in is required.' },
      { status: 401, headers: corsHeaders },
    )

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const token = authorization.slice('Bearer '.length)
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token)
  if (userError || !user)
    return Response.json(
      { error: 'Your session is no longer valid.' },
      { status: 401, headers: corsHeaders },
    )

  const { data: profile } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'admin' || !profile.active)
    return Response.json(
      { error: 'Administrator access is required.' },
      { status: 403, headers: corsHeaders },
    )

  const body = await request.json()
  if (body.action === 'list') {
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, full_name, role, birth_date, active')
      .order('full_name')
    if (profilesError)
      return Response.json(
        { error: profilesError.message },
        { status: 500, headers: corsHeaders },
      )
    const users = []
    for (let page = 1; ; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 1000,
      })
      if (error)
        return Response.json(
          { error: error.message },
          { status: 500, headers: corsHeaders },
        )
      users.push(...data.users)
      if (data.users.length < 1000) break
    }
    const emails = new Map(users.map((account) => [account.id, account.email]))
    return Response.json(
      {
        users: (profiles || []).map((account) => ({
          ...account,
          email: emails.get(account.id) || '',
        })),
      },
      { headers: corsHeaders },
    )
  }
  if (body.action === 'set-active') {
    const targetId = typeof body.user_id === 'string' ? body.user_id : ''
    const active = typeof body.active === 'boolean' ? body.active : null
    if (!targetId || active === null)
      return Response.json(
        { error: 'User and active status are required.' },
        { status: 400, headers: corsHeaders },
      )
    if (targetId === user.id && !active)
      return Response.json(
        { error: 'You cannot deactivate your own account.' },
        { status: 400, headers: corsHeaders },
      )
    const { data: target, error: targetError } =
      await admin.auth.admin.getUserById(targetId)
    if (targetError || !target.user)
      return Response.json(
        { error: targetError?.message || 'User not found.' },
        { status: 404, headers: corsHeaders },
      )
    const { error: authError } = await admin.auth.admin.updateUserById(
      targetId,
      {
        ban_duration: active ? 'none' : '876000h',
      },
    )
    if (authError)
      return Response.json(
        { error: authError.message },
        { status: 500, headers: corsHeaders },
      )
    const { error: activeError } = await admin
      .from('profiles')
      .update({ active })
      .eq('id', targetId)
    if (activeError)
      return Response.json(
        { error: activeError.message },
        { status: 500, headers: corsHeaders },
      )
    if (target.user.email) {
      const { error: employeeError } = await admin
        .from('employees')
        .update({ active })
        .ilike('email', target.user.email)
      if (employeeError)
        return Response.json(
          { error: employeeError.message },
          { status: 500, headers: corsHeaders },
        )
    }
    return Response.json({ id: targetId, active }, { headers: corsHeaders })
  }
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const fullName =
    typeof body.full_name === 'string' ? body.full_name.trim() : ''
  const birthDate =
    typeof body.birth_date === 'string' ? body.birth_date.trim() : ''
  const role = body.role === 'admin' ? 'admin' : 'staff'
  if (
    !email ||
    !fullName ||
    !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ||
    password.length < 6
  )
    return Response.json(
      {
        error:
          'Name, email, birthday, and a password of at least 6 characters are required.',
      },
      { status: 400, headers: corsHeaders },
    )

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, birth_date: birthDate },
  })
  if (error || !data.user)
    return Response.json(
      { error: error?.message || 'Unable to create this user.' },
      { status: 400, headers: corsHeaders },
    )
  const { error: profileError } = await admin.from('profiles').upsert({
    id: data.user.id,
    full_name: fullName,
    birth_date: birthDate,
    active: true,
    role,
  })
  if (profileError)
    return Response.json(
      { error: profileError.message },
      { status: 500, headers: corsHeaders },
    )
  return Response.json(
    { id: data.user.id, email },
    { status: 201, headers: corsHeaders },
  )
})
