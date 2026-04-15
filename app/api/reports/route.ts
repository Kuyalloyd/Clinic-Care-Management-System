import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getRequestAuth, requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patient_id')

    let query = supabaseAdmin.from('reports').select('*')

    if (patientId) query = query.eq('patient_id', patientId)
    if (auth.role === 'doctor' || auth.role === 'nurse') {
      query = query.eq('staff_id', auth.staffId)
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!
    const roleError = requireRole(auth, ['admin', 'doctor', 'nurse'])
    if (roleError) return roleError

    const body = await request.json()

    const payload = {
      ...body,
      staff_id: auth.staffId,
    }

    const { data, error } = await supabaseAdmin
      .from('reports')
      .insert([payload])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
