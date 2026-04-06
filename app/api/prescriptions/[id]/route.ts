import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { archiveAndDeleteById } from '@/lib/archive'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data, error } = await supabaseAdmin
      .from('prescriptions')
      .update(body)
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
    const { id } = await params

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
