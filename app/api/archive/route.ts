import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED_TYPES = ['patients', 'appointments', 'prescriptions', 'bills', 'reports', 'staff']
const TYPE_TO_TABLE: Record<string, string> = {
  patients: 'patients',
  appointments: 'appointments',
  prescriptions: 'prescriptions',
  bills: 'bills',
  reports: 'reports',
  staff: 'staff',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'patients', 'appointments', 'prescriptions', 'bills', 'reports'

    if (!type) {
      return NextResponse.json(
        { error: 'Type parameter is required' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid archive type' },
        { status: 400 }
      )
    }

    const sourceTable = TYPE_TO_TABLE[type]

    // Fetch archived records from a dedicated archive table.
    const { data, error } = await supabaseAdmin
      .from('archive_items')
      .select('*')
      .eq('source_table', sourceTable)
      .order('deleted_at', { ascending: false })

    // If archive table is not created yet, return empty archive instead of hard error.
    if (error && (
      error.message?.includes('archive_items') ||
      error.message?.includes('does not exist') ||
      error.code === '42703' ||
      error.code === '42P01'
    )) {
      return NextResponse.json({
        type,
        count: 0,
        data: [],
      })
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      type,
      count: data?.length || 0,
      data: data || [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
