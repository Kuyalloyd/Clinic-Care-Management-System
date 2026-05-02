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

export async function GET(request: NextRequest) {
  try {
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!
    const roleError = requireRole(auth, ['admin', 'doctor', 'nurse'])
    if (roleError) return roleError

    let query = supabaseAdmin.from('staff_messages').select('*')

    if (auth.role !== 'admin') {
      query = query.or(`sender_staff_id.eq.${auth.staffId},recipient_staff_id.eq.${auth.staffId}`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

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

    return NextResponse.json(data || [])
  } catch (error: any) {
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
    const roleError = requireRole(auth, ['doctor', 'nurse'])
    if (roleError) return roleError

    const body = await request.json()
    const recipientStaffId = String(body.recipient_staff_id || '').trim()
    const subject = String(body.subject || '').trim()
    const messageBody = String(body.message_body || '').trim()
    const patientId = typeof body.patient_id === 'string' && body.patient_id.trim() ? body.patient_id.trim() : null

    if (!recipientStaffId) {
      return NextResponse.json({ error: 'Recipient is required' }, { status: 400 })
    }

    if (recipientStaffId === auth.staffId) {
      return NextResponse.json({ error: 'You cannot send a message to yourself' }, { status: 400 })
    }

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }

    if (!messageBody) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }

    const allowedRecipientRole = auth.role === 'doctor' ? 'nurse' : 'doctor'
    const recipientLookup = await supabaseAdmin
      .from('staff')
      .select('id, role')
      .eq('id', recipientStaffId)
      .maybeSingle()

    if (recipientLookup.error) {
      return NextResponse.json({ error: recipientLookup.error.message }, { status: 400 })
    }

    if (!recipientLookup.data?.id || recipientLookup.data.role !== allowedRecipientRole) {
      return NextResponse.json(
        { error: `You can only send messages to ${allowedRecipientRole}s from this panel` },
        { status: 400 }
      )
    }

    if (patientId) {
      const patientLookup = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('id', patientId)
        .maybeSingle()

      if (patientLookup.error) {
        return NextResponse.json({ error: patientLookup.error.message }, { status: 400 })
      }

      if (!patientLookup.data?.id) {
        return NextResponse.json({ error: 'Selected patient was not found' }, { status: 400 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('staff_messages')
      .insert([
        {
          sender_staff_id: auth.staffId,
          recipient_staff_id: recipientStaffId,
          patient_id: patientId,
          subject,
          message_body: messageBody,
          is_read: false,
        },
      ])
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

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
