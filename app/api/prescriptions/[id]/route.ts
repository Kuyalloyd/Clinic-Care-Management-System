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
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('prescriptions')
      .select('id, staff_id')
      .eq('id', id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: existingError?.message || 'Prescription not found' }, { status: 404 })
    }

    let updatePayload: Record<string, unknown> = {}

    if (auth.role === 'doctor') {
      if (existing.staff_id !== auth.staffId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      updatePayload = { ...body }
      delete updatePayload.staff_id
      delete updatePayload.is_completed
    } else if (auth.role === 'nurse') {
      const requestedKeys = Object.keys(body)
      if (
        requestedKeys.length !== 1 ||
        !requestedKeys.includes('is_completed') ||
        typeof body.is_completed !== 'boolean'
      ) {
        return NextResponse.json(
          { error: 'Nurses can only update the prescription completion status' },
          { status: 403 }
        )
      }

      updatePayload = { is_completed: body.is_completed }
    } else {
      const roleError = requireRole(auth, ['doctor', 'nurse'])
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

    const roleError = requireRole(auth, ['doctor'])
    if (roleError) return roleError

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
