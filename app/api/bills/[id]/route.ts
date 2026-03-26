import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: any = {}
    if (body.status) updateData.status = body.status
    if (body.amount) updateData.amount = body.amount
    if (body.description) updateData.description = body.description
    if (body.due_date) updateData.due_date = body.due_date

    if (body.status === 'paid') {
      updateData.paid_date = new Date().toISOString().split('T')[0]
    }

    const { data, error } = await supabaseAdmin
      .from('bills')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data[0] || { success: true }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
