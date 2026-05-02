import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getRequestAuth, requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patient_id')

    let query = supabaseAdmin.from('prescriptions').select('*')

    if (patientId) query = query.eq('patient_id', patientId)
    if (auth.role === 'doctor') {
      query = query.eq('staff_id', auth.staffId)
    }

    const { data, error } = await query.order('prescribed_date', {
      ascending: false,
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
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!
    const roleError = requireRole(auth, ['doctor'])
    if (roleError) return roleError

    const body = await request.json()

    const requiredFields = ['patient_id', 'medication_name', 'dosage', 'unit', 'frequency', 'duration', 'prescribed_date', 'expiry_date']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    const prescriptionData = {
      patient_id: body.patient_id,
      staff_id: auth.staffId,
      medication_name: body.medication_name,
      dosage: body.dosage,
      unit: body.unit,
      frequency: body.frequency,
      duration: body.duration,
      prescribed_date: body.prescribed_date,
      expiry_date: body.expiry_date,
      instructions: body.instructions || 'No special instructions',
      refills: body.refills || 0,
      updated_at: new Date().toISOString(),
      updated_by: auth.staffId,
    }

    const { data, error } = await supabaseAdmin
      .from('prescriptions')
      .insert([prescriptionData])
      .select()

    if (error) {
      console.error('Supabase prescription error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('Prescription creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
