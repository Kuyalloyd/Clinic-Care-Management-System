import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: any = {}
    
    if (body.hasOwnProperty('appointment_date')) {
      updateData.appointment_date = body.appointment_date
    }
    if (body.hasOwnProperty('appointment_time')) {
      updateData.appointment_time = body.appointment_time
    }
    if (body.hasOwnProperty('reason')) {
      updateData.reason = body.reason
    }
    if (body.hasOwnProperty('status')) {
      updateData.status = body.status
    }
    if (body.hasOwnProperty('staff_id')) {
      updateData.staff_id = body.staff_id || null
    }

    console.log('📝 Updating appointment:', { id, updateData })

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      console.error('❌ Appointment update error:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: error.details || '',
          code: error.code || '',
        }, 
        { status: 400 }
      )
    }

    console.log('✅ Appointment updated successfully:', data[0])
    return NextResponse.json(data[0])
  } catch (error: any) {
    console.error('❌ Internal server error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
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
    
    const { error } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Appointment deleted' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
