import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from './supabase'

export type StaffRole = 'admin' | 'doctor' | 'nurse' | 'receptionist'

export interface RequestAuth {
  userId: string
  email: string
  staffId: string
  role: StaffRole
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim()
  }

  const cookieToken = request.cookies.get('auth-token')?.value
  if (cookieToken) {
    return cookieToken
  }

  return null
}

export async function getRequestAuth(request: NextRequest): Promise<{ auth: RequestAuth | null; errorResponse: NextResponse | null }> {
  const token = getBearerToken(request)
  if (!token) {
    return {
      auth: null,
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user?.email || !userData.user?.id) {
    return {
      auth: null,
      errorResponse: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }),
    }
  }

  const email = userData.user.email.toLowerCase()

  const staffLookups = [
    supabaseAdmin.from('staff').select('id, role, email').eq('id', userData.user.id).maybeSingle(),
    supabaseAdmin.from('staff').select('id, role, email').eq('email', email).maybeSingle(),
  ]

  const lookupResults = await Promise.all(staffLookups)
  const staffRecord = lookupResults.find((result) => result.data?.id)
  const staffError = lookupResults.every((result) => result.error) ? lookupResults[0].error : null

  if (staffError || !staffRecord?.data?.id || !staffRecord.data.role) {
    return {
      auth: null,
      errorResponse: NextResponse.json({ error: 'Staff profile not found' }, { status: 403 }),
    }
  }

  return {
    auth: {
      userId: userData.user.id,
      email,
      staffId: staffRecord.data.id,
      role: staffRecord.data.role as StaffRole,
    },
    errorResponse: null,
  }
}

export function requireRole(auth: RequestAuth, allowedRoles: StaffRole[]) {
  if (allowedRoles.includes(auth.role)) {
    return null
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
