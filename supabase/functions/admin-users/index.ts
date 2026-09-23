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
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'admin')
    return Response.json(
      { error: 'Administrator access is required.' },
      { status: 403, headers: corsHeaders },
    )

  const body = await request.json()
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const fullName =
    typeof body.full_name === 'string' ? body.full_name.trim() : ''
  const role = body.role === 'admin' ? 'admin' : 'staff'
  if (!email || !fullName || password.length < 6)
    return Response.json(
      {
        error:
          'Name, email, and a password of at least 6 characters are required.',
      },
      { status: 400, headers: corsHeaders },
    )

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (error || !data.user)
    return Response.json(
      { error: error?.message || 'Unable to create this user.' },
      { status: 400, headers: corsHeaders },
    )
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({ id: data.user.id, full_name: fullName, role })
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
