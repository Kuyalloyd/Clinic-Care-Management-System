import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { archiveAndDeleteById } from '@/lib/archive'
import { getRequestAuth, requireRole } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!

    const { id } = await params
    const body = await request.json()
    const updatePayload = { ...body }

    if (auth.role === 'doctor') {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('prescriptions')
        .select('id, staff_id')
        .eq('id', id)
        .single()

      if (existingError || !existing) {
        return NextResponse.json({ error: existingError?.message || 'Prescription not found' }, { status: 404 })
      }

      if (existing.staff_id !== auth.staffId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Doctors can update their own prescription details but cannot reassign ownership.
      delete updatePayload.staff_id
    } else {
      const roleError = requireRole(auth, ['admin'])
      if (roleError) return roleError
    }

    const { data, error } = await supabaseAdmin
      .from('prescriptions')
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
        updated_by: auth.staffId,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update prescription' },
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

    const { id } = await params

    if (auth.role === 'doctor') {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('prescriptions')
        .select('id, staff_id')
        .eq('id', id)
        .single()

      if (existingError || !existing) {
        return NextResponse.json({ error: existingError?.message || 'Prescription not found' }, { status: 404 })
      }

      if (existing.staff_id !== auth.staffId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      const roleError = requireRole(auth, ['admin'])
      if (roleError) return roleError
    }

    const archived = await archiveAndDeleteById(supabaseAdmin, 'prescriptions', id)
    if (!archived.success) {
      const err = archived.error?.message || 'Failed to archive prescription'
      return NextResponse.json({ error: err }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Prescription moved to archive' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete prescription' },
      { status: 500 }
    )
  }
}
