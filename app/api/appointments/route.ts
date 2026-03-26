import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patient_id')
    const staffId = searchParams.get('staff_id')
    const date = searchParams.get('date')

    let query = supabaseAdmin.from('appointments').select('*')

    if (patientId) query = query.eq('patient_id', patientId)
    if (staffId) query = query.eq('staff_id', staffId)
    if (date) query = query.eq('appointment_date', date)

    const { data, error } = await query.order('appointment_date', {
      ascending: true,
    })

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.patient_id) {
      return NextResponse.json({ error: 'patient_id is required' }, { status: 400 })
    }
    if (!body.appointment_date) {
      return NextResponse.json({ error: 'appointment_date is required' }, { status: 400 })
    }
    if (!body.appointment_time) {
      return NextResponse.json({ error: 'appointment_time is required' }, { status: 400 })
    }

    const appointmentData = {
      patient_id: body.patient_id,
      appointment_date: body.appointment_date,
      appointment_time: body.appointment_time,
      reason: body.reason || '',
      status: body.status || 'scheduled',
      ...(body.staff_id && { staff_id: body.staff_id }),
    }

    console.log('📝 Creating appointment with data:', appointmentData)

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .insert([appointmentData])
      .select()

    if (error) {
      console.error('❌ Appointment creation error:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: error.details || '',
          code: error.code || '',
        }, 
        { status: 400 }
      )
    }

    console.log('✅ Appointment created successfully:', data[0])
    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    console.error('❌ Internal server error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
