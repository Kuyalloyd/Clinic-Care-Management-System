import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const TYPE_TO_TABLE: Record<string, string> = {
  patients: 'patients',
  appointments: 'appointments',
  prescriptions: 'prescriptions',
  bills: 'bills',
  reports: 'reports',
  staff: 'staff',
}

export async function POST(request: NextRequest, props: any) {
  try {
    const { id } = props.params
    const { type } = await request.json()

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID are required' },
        { status: 400 }
      )
    }

    const sourceTable = TYPE_TO_TABLE[type]
    if (!sourceTable) {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      )
    }

    const archived = await supabaseAdmin
      .from('archive_items')
      .select('*')
      .eq('id', id)
      .single()

    if (archived.error || !archived.data) {
      return NextResponse.json(
        { error: archived.error?.message || 'Archived item not found' },
        { status: 400 }
      )
    }

    if (archived.data.source_table !== sourceTable) {
      return NextResponse.json(
        { error: 'Archive type does not match selected item' },
        { status: 400 }
      )
    }

    const payload = archived.data.record_data
    const { data, error } = await supabaseAdmin
      .from(sourceTable)
      .upsert([payload], { onConflict: 'id' })
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await supabaseAdmin
      .from('archive_items')
      .delete()
      .eq('id', id)

    return NextResponse.json({
      message: `${type.slice(0, -1)} restored successfully from archive`,
      data: data?.[0],
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, props: any) {
  try {
    const { id } = props.params
    if (!id) {
      return NextResponse.json(
        { error: 'Archive item ID is required' },
        { status: 400 }
      )
    }

    // Permanently delete archive record only.
    const { error } = await supabaseAdmin
      .from('archive_items')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      message: 'Archived item permanently deleted',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
