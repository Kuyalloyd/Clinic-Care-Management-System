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
    const roleError = requireRole(auth, ['admin'])
    if (roleError) return roleError

    const body = await request.json()
    const { id } = await params

    console.log('📝 [STAFF UPDATE] Attempting to update staff')
    console.log('   ID:', id)
    console.log('   Body:', body)

    if (!id || id === 'undefined') {
      console.error('❌ Invalid ID provided')
      return NextResponse.json(
        { error: 'Invalid staff ID' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('staff')
      .update(body)
      .eq('id', id)
      .select('id, email, full_name, role, phone, specialty, is_on_duty, created_at')

    if (error) {
      console.error('❌ Update failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('✅ Staff updated successfully')
    return NextResponse.json(data[0], { status: 200 })
  } catch (error: any) {
    console.error('❌ Exception:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const archived = await archiveAndDeleteById(supabaseAdmin, 'staff', id)
    if (!archived.success) {
      const err = archived.error?.message || 'Failed to archive staff member'
      return NextResponse.json({ error: err }, { status: 400 })
    }

    return NextResponse.json({ message: 'Staff moved to archive' }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
