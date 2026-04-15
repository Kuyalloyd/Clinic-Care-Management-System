import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getRequestAuth, requireRole } from '@/lib/auth'

function isMissingDutyTableError(error: any) {
  const code = String(error?.code || '')
  const message = String(error?.message || '')
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    /schema cache/i.test(message) && /duty_assignments/i.test(message) ||
    /relation\s+"?public\.duty_assignments"?\s+does not exist/i.test(message)
  )
}

function isPermissionError(error: any) {
  const code = String(error?.code || '')
  const message = String(error?.message || '')
  return code === '42501' || /permission denied/i.test(message)
}

function normalizeDateKey(value: string) {
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateOnly) {
    return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`
  }

  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY for duty records API.' },
        { status: 500 }
      )
    }

    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!

    const { searchParams } = new URL(request.url)
    const dutyDate = searchParams.get('duty_date')
    const month = searchParams.get('month')

    let query = supabaseAdmin.from('duty_assignments').select('*')

    if (dutyDate) {
      query = query.eq('duty_date', normalizeDateKey(dutyDate))
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [yearString, monthString] = month.split('-')
      const year = Number(yearString)
      const monthIndex = Number(monthString)
      const startDate = new Date(year, monthIndex - 1, 1)
      const endDate = new Date(year, monthIndex, 1)
      const startKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`
      const endKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-01`
      query = query.gte('duty_date', startKey).lt('duty_date', endKey)
    }

    const { data, error } = await query.order('duty_date', { ascending: false }).order('created_at', { ascending: false })

    if (error && isMissingDutyTableError(error)) {
      return NextResponse.json([])
    }

    if (error && isPermissionError(error)) {
      return NextResponse.json(
        { error: 'Permission denied for duty records. Verify service role key and grants.' },
        { status: 403 }
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
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY for duty records API.' },
        { status: 500 }
      )
    }

    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!
    const roleError = requireRole(auth, ['admin'])
    if (roleError) return roleError

    const body = await request.json()
    const dutyDate = normalizeDateKey(body.duty_date || '')
    const staffIds: string[] = Array.isArray(body.staff_ids)
      ? Array.from(
          new Set(
            body.staff_ids.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
          )
        )
      : []

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dutyDate)) {
      return NextResponse.json({ error: 'duty_date is required' }, { status: 400 })
    }

    if (staffIds.length === 0) {
      const clearResult = await supabaseAdmin.from('duty_assignments').delete().eq('duty_date', dutyDate)
      if (clearResult.error && isMissingDutyTableError(clearResult.error)) {
        return NextResponse.json(
          { error: 'Duty records table is not ready yet. Apply latest migrations and reload schema.' },
          { status: 503 }
        )
      }
      if (clearResult.error && isPermissionError(clearResult.error)) {
        return NextResponse.json(
          { error: 'Permission denied for duty records. Verify service role key and grants.' },
          { status: 403 }
        )
      }
      return NextResponse.json({ duty_date: dutyDate, staff_ids: [] })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('duty_assignments')
      .delete()
      .eq('duty_date', dutyDate)

    if (deleteError && isMissingDutyTableError(deleteError)) {
      return NextResponse.json(
        { error: 'Duty records table is not ready yet. Apply latest migrations and reload schema.' },
        { status: 503 }
      )
    }

    if (deleteError && isPermissionError(deleteError)) {
      return NextResponse.json(
        { error: 'Permission denied for duty records. Verify service role key and grants.' },
        { status: 403 }
      )
    }

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    const dutyRows = staffIds.map((staffId: string) => ({
      duty_date: dutyDate,
      staff_id: staffId,
      assigned_by: auth.staffId,
    }))

    const { data, error } = await supabaseAdmin
      .from('duty_assignments')
      .insert(dutyRows)
      .select('*')

    if (error && isMissingDutyTableError(error)) {
      return NextResponse.json(
        { error: 'Duty records table is not ready yet. Apply latest migrations and reload schema.' },
        { status: 503 }
      )
    }

    if (error && isPermissionError(error)) {
      return NextResponse.json(
        { error: 'Permission denied for duty records. Verify service role key and grants.' },
        { status: 403 }
      )
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data || [], { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
