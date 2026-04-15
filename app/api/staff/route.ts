import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getRequestAuth, requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!

    console.log('📝 [STAFF API] Fetching all staff members')
    
    const { data, error } = await supabaseAdmin
      .from('staff')
      .select('id, email, full_name, role, phone, specialty, is_on_duty, created_at')
      .order('created_at', { ascending: false })

    if (error && (error.message?.includes('is_on_duty') || error.code === '42703')) {
      const fallback = await supabaseAdmin
        .from('staff')
        .select('id, email, full_name, role, phone, specialty, created_at')
        .order('created_at', { ascending: false })

      if (fallback.error) {
        return NextResponse.json(
          {
            error: 'FETCH_FAILED',
            message: fallback.error.message,
            code: fallback.error.code,
          },
          { status: 400 }
        )
      }

      const today = new Date().toISOString().slice(0, 10)
      const todaysAppointments = await supabaseAdmin
        .from('appointments')
        .select('staff_id')
        .eq('appointment_date', today)
        .neq('status', 'cancelled')

      const inferredDutyIds = new Set((todaysAppointments.data || []).map((a: any) => a.staff_id).filter(Boolean))
      const withDefaultDuty = (fallback.data || []).map((row: any) => ({
        ...row,
        is_on_duty: inferredDutyIds.has(row.id),
      }))
      return NextResponse.json(withDefaultDuty)
    }

    if (error) {
      console.error('❌ Query failed:', error.message, '(code:', error.code + ')')
      return NextResponse.json(
        { 
          error: 'FETCH_FAILED',
          message: error.message,
          code: error.code
        },
        { status: 400 }
      )
    }

    console.log('✅ [STAFF API] Success:', data?.length || 0, 'staff members')
    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('❌ [STAFF API] Exception:', error.message)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!
    const roleError = requireRole(auth, ['admin'])
    if (roleError) return roleError

    const body = await request.json()
    const email = (body.email || '').trim().toLowerCase()
    const password = (body.password || '').trim()

    if (!email || !body.full_name) {
      return NextResponse.json({ error: 'Email and full name are required' }, { status: 400 })
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password is required and must be at least 6 characters' }, { status: 400 })
    }

    if (body.role === 'receptionist') {
      return NextResponse.json({ error: 'Receptionist role is no longer supported' }, { status: 400 })
    }

    const existingStaff = await supabaseAdmin
      .from('staff')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingStaff.error) {
      return NextResponse.json({ error: existingStaff.error.message }, { status: 400 })
    }

    if (existingStaff.data?.id) {
      return NextResponse.json({ error: 'Staff with this email already exists' }, { status: 409 })
    }

    const usersResult = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (usersResult.error) {
      return NextResponse.json({ error: usersResult.error.message }, { status: 400 })
    }

    let authUser = (usersResult.data.users || []).find((u: any) => (u.email || '').toLowerCase() === email)

    if (!authUser) {
      const createdUser = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (createdUser.error || !createdUser.data.user) {
        return NextResponse.json(
          { error: createdUser.error?.message || 'Failed to create login account for staff' },
          { status: 400 }
        )
      }

      authUser = createdUser.data.user
    } else {
      const updatedUser = await supabaseAdmin.auth.admin.updateUserById(authUser.id, { password })
      if (updatedUser.error) {
        return NextResponse.json({ error: updatedUser.error.message }, { status: 400 })
      }
    }

    const staffData = {
      id: authUser.id,
      email,
      full_name: body.full_name,
      phone: body.phone,
      role: body.role || 'doctor',
      specialty: body.specialty || null,
      is_on_duty: body.is_on_duty === true,
    }

    console.log('📝 Creating staff member:', staffData)

    const { data, error } = await supabaseAdmin
      .from('staff')
      .insert([staffData])
      .select()

    if (error) {
      console.error('❌ Staff creation error:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: error.details || '',
          code: error.code || '',
        }, 
        { status: 400 }
      )
    }

    console.log('✅ Staff member created successfully:', data[0])
    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    console.error('❌ Internal server error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

