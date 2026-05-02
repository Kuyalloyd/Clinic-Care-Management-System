import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { archiveAndDeleteById } from '@/lib/archive'
import { getRequestAuth, requireRole } from '@/lib/auth'

const allowedGenders = new Set(['M', 'F', 'Other'])
const patientIntakeColumns = ['recommended_doctor_id', 'intake_notes', 'created_by_staff_id', 'updated_by_staff_id']

function isMissingPatientIntakeColumnError(error: any) {
  const code = String(error?.code || '')
  const message = String(error?.message || '')

  return (
    code === '42703' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    patientIntakeColumns.some((column) => new RegExp(`\\b${column}\\b`, 'i').test(message)) &&
      (/schema cache/i.test(message) || /column/i.test(message))
  )
}

function isMissingRegionColumnError(error: any) {
  const code = String(error?.code || '')
  const message = String(error?.message || '')

  return (
    code === '42703' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    /\bregion\b/i.test(message) && (/schema cache/i.test(message) || /column/i.test(message))
  )
}

function withLegacyStatePayload<T extends Record<string, any>>(payload: T) {
  const { region, ...rest } = payload
  return {
    ...rest,
    state: region ?? null,
  }
}

function normalizePatientRecord<T extends Record<string, any>>(patient: T) {
  if (!patient) return patient
  if ((patient.region === undefined || patient.region === null || patient.region === '') && patient.state) {
    return {
      ...patient,
      region: patient.state,
    }
  }

  return patient
}

function normalizeText(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function normalizePatientPayload(body: any) {
  const gender = normalizeText(body.gender)
  if (gender && !allowedGenders.has(gender)) {
    throw new Error('Invalid gender value')
  }

  const email = normalizeText(body.email)

  return {
    full_name: normalizeText(body.full_name),
    email: email ? email.toLowerCase() : null,
    phone: normalizeText(body.phone),
    date_of_birth: normalizeText(body.date_of_birth),
    gender,
    address: normalizeText(body.address),
    city: normalizeText(body.city),
    region: normalizeText(body.region),
    zip_code: normalizeText(body.zip_code),
    symptoms: normalizeText(body.symptoms),
    intake_notes: normalizeText(body.intake_notes),
    emergency_contact_name: normalizeText(body.emergency_contact_name),
    emergency_contact_phone: normalizeText(body.emergency_contact_phone),
    recommended_doctor_id: normalizeText(body.recommended_doctor_id),
  }
}

async function validateRecommendedDoctor(recommendedDoctorId: string | null) {
  if (!recommendedDoctorId) {
    return null
  }

  const lookup = await supabaseAdmin
    .from('staff')
    .select('id')
    .eq('id', recommendedDoctorId)
    .eq('role', 'doctor')
    .maybeSingle()

  if (lookup.error) {
    return lookup.error.message
  }

  if (!lookup.data?.id) {
    return 'Recommended doctor not found'
  }

  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!

    const { id } = await params
    
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('id', id)
      .is('archived_at', null)
      .single()

    if (error && (error.message?.includes('archived_at') || error.code === '42703')) {
      const fallback = await supabaseAdmin
        .from('patients')
        .select('*')
        .eq('id', id)
        .single()

      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 400 })
      }

      return NextResponse.json(normalizePatientRecord(fallback.data))
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(normalizePatientRecord(data))
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
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!
    const roleError = requireRole(auth, ['admin', 'nurse', 'doctor'])
    if (roleError) return roleError

    const { id } = await params
    const body = await request.json()
    const payload = normalizePatientPayload(body)

    if (!payload.full_name) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    const doctorError = await validateRecommendedDoctor(payload.recommended_doctor_id)
    if (doctorError) {
      return NextResponse.json({ error: doctorError }, { status: 400 })
    }

    if (payload.email) {
      const { data: existingPatient, error: checkError } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('email', payload.email)
        .neq('id', id)
        .maybeSingle()

      if (checkError) {
        return NextResponse.json({ error: checkError.message }, { status: 400 })
      }

      if (existingPatient) {
        return NextResponse.json(
          { error: `Patient with email "${payload.email}" already exists` },
          { status: 409 }
        )
      }
    }

    const updatePayload = {
      ...payload,
      updated_by_staff_id: auth.staffId,
    }

    let { data, error } = await supabaseAdmin
      .from('patients')
      .update(updatePayload)
      .eq('id', id)
      .select()

    if (error && isMissingRegionColumnError(error)) {
      const legacyUpdate = await supabaseAdmin
        .from('patients')
        .update(withLegacyStatePayload(updatePayload))
        .eq('id', id)
        .select()

      data = legacyUpdate.data
      error = legacyUpdate.error
    }

    if (error && isMissingPatientIntakeColumnError(error)) {
      return NextResponse.json(
        { error: 'Patient intake fields are not ready yet. Run the patient intake migration and reload the Supabase schema cache.' },
        { status: 503 }
      )
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(normalizePatientRecord(data?.[0]))
  } catch (error: any) {
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
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!
    const roleError = requireRole(auth, ['admin'])
    if (roleError) return roleError

    const { id } = await params

    const archived = await archiveAndDeleteById(supabaseAdmin, 'patients', id)
    if (!archived.success) {
      const err = archived.error?.message || 'Failed to archive patient'
      return NextResponse.json({ error: err }, { status: 400 })
    }

    return NextResponse.json({ message: 'Patient moved to archive' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
