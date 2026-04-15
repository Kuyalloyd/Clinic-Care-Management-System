import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getRequestAuth, requireRole } from '@/lib/auth'

export async function DELETE(request: NextRequest, props: any) {
  try {
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!

    const reportId = props.params.id

    if (auth.role === 'doctor' || auth.role === 'nurse') {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('reports')
        .select('id, staff_id')
        .eq('id', reportId)
        .single()

      if (existingError || !existing) {
        return NextResponse.json({ error: existingError?.message || 'Report not found' }, { status: 404 })
      }

      if (existing.staff_id !== auth.staffId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      const roleError = requireRole(auth, ['admin'])
      if (roleError) return roleError
    }

    const { error } = await supabaseAdmin
      .from('reports')
      .delete()
      .eq('id', reportId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
