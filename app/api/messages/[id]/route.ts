import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getRequestAuth, requireRole } from '@/lib/auth'

function isMissingMessagesTableError(error: any) {
  const code = String(error?.code || '')
  const message = String(error?.message || '')

  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    (/schema cache/i.test(message) && /staff_messages/i.test(message)) ||
    /relation\s+"?public\.staff_messages"?\s+does not exist/i.test(message)
  )
}

function isStaffMessagesPermissionError(error: any) {
  const code = String(error?.code || '')
  const message = String(error?.message || '')

  return code === '42501' || /permission denied/i.test(message) && /staff_messages/i.test(message)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!
    const roleError = requireRole(auth, ['admin', 'doctor', 'nurse'])
    if (roleError) return roleError

    const { id } = await params
    const body = await request.json()

    if (body?.is_read !== true) {
      return NextResponse.json({ error: 'Only mark-as-read updates are supported' }, { status: 400 })
    }

    const existing = await supabaseAdmin
      .from('staff_messages')
      .select('id, recipient_staff_id, is_read')
      .eq('id', id)
      .maybeSingle()

    if (existing.error && isMissingMessagesTableError(existing.error)) {
      return NextResponse.json(
        { error: 'Messages table is not ready yet. Apply the staff messages migration and reload the Supabase schema cache.' },
        { status: 503 }
      )
    }

    if (existing.error && isStaffMessagesPermissionError(existing.error)) {
      return NextResponse.json(
        { error: 'Messages permissions are not ready yet. Apply the staff messages permissions migration and reload the Supabase schema cache.' },
        { status: 503 }
      )
    }

    if (existing.error) {
      return NextResponse.json({ error: existing.error.message }, { status: 400 })
    }

    if (!existing.data?.id) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (auth.role !== 'admin' && existing.data.recipient_staff_id !== auth.staffId) {
      return NextResponse.json({ error: 'Only the recipient can mark this message as read' }, { status: 403 })
    }

    if (existing.data.is_read) {
      return NextResponse.json({ success: true, already_read: true })
    }

    const { data, error } = await supabaseAdmin
      .from('staff_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error && isMissingMessagesTableError(error)) {
      return NextResponse.json(
        { error: 'Messages table is not ready yet. Apply the staff messages migration and reload the Supabase schema cache.' },
        { status: 503 }
      )
    }

    if (error && isStaffMessagesPermissionError(error)) {
      return NextResponse.json(
        { error: 'Messages permissions are not ready yet. Apply the staff messages permissions migration and reload the Supabase schema cache.' },
        { status: 503 }
      )
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update message' },
      { status: 500 }
    )
  }
}
