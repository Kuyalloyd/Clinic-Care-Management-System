import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { archiveAndDeleteById } from '@/lib/archive'
import { getRequestAuth, requireRole } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!

    const { id } = await params

    let query = supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', id)

    if (auth.role === 'doctor' || auth.role === 'nurse') {
      query = query.eq('staff_id', auth.staffId)
    }

    const { data, error } = await query.single()

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!

    const { id } = await params
    const body = await request.json()

    const updateData: any = {}
    
    if (body.hasOwnProperty('appointment_date')) {
      updateData.appointment_date = body.appointment_date
    }
    if (body.hasOwnProperty('appointment_time')) {
      updateData.appointment_time = body.appointment_time
    }
    if (body.hasOwnProperty('reason')) {
      updateData.reason = body.reason
    }
    if (body.hasOwnProperty('status')) {
      updateData.status = body.status
    }
    if (body.hasOwnProperty('staff_id')) {
      updateData.staff_id = body.staff_id || null
    }

    if (auth.role === 'doctor' || auth.role === 'nurse') {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('appointments')
        .select('id, staff_id')
        .eq('id', id)
        .single()

      if (existingError || !existing) {
        return NextResponse.json({ error: existingError?.message || 'Appointment not found' }, { status: 404 })
      }

      if (existing.staff_id !== auth.staffId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Doctor/nurse can update status and notes-like fields, but cannot reassign or reschedule.
      delete updateData.staff_id
      delete updateData.appointment_date
      delete updateData.appointment_time
    } else {
      const roleError = requireRole(auth, ['admin'])
      if (roleError) return roleError
    }

    console.log('📝 Updating appointment:', { id, updateData })

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      console.error('❌ Appointment update error:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: error.details || '',
          code: error.code || '',
        }, 
        { status: 400 }
      )
    }

    console.log('✅ Appointment updated successfully:', data[0])
    return NextResponse.json(data[0])
  } catch (error: any) {
    console.error('❌ Internal server error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!
    const roleError = requireRole(auth, ['admin'])
    if (roleError) return roleError

    const { id } = await params

    const archived = await archiveAndDeleteById(supabaseAdmin, 'appointments', id)
    if (!archived.success) {
      const err = archived.error?.message || 'Failed to archive appointment'
      return NextResponse.json({ error: err }, { status: 400 })
    }

    return NextResponse.json({ message: 'Appointment moved to archive' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
