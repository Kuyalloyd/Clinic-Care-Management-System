import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getRequestAuth, requireRole } from '@/lib/auth'
import { isValidMedicineUnit, normalizeMedicineUnit } from '@/lib/medicine'

function parseNonNegativeInteger(value: unknown, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return Math.floor(parsed)
}

function isMissingMedicinesTableError(error: any) {
  const code = String(error?.code || '')
  const message = String(error?.message || '')
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    (/schema cache/i.test(message) && /medicines/i.test(message)) ||
    /relation\s+"?public\.medicines"?\s+does not exist/i.test(message)
  )
}

function isPermissionError(error: any) {
  const code = String(error?.code || '')
  const message = String(error?.message || '')
  return code === '42501' || /permission denied/i.test(message)
}

export async function GET(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY for medicines API.' },
        { status: 500 }
      )
    }

    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!

    const { data, error } = await supabaseAdmin
      .from('medicines')
      .select('*')
      .order('name', { ascending: true })

    if (error && isMissingMedicinesTableError(error)) {
      return NextResponse.json(
        { error: 'Medicines table is not ready yet. Apply the latest medicines migrations and reload schema.' },
        { status: 503 }
      )
    }

    if (error && isPermissionError(error)) {
      return NextResponse.json(
        { error: 'Permission denied for medicines. Apply the medicines permissions migration and verify the service role key.' },
        { status: 403 }
      )
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY for medicines API.' },
        { status: 500 }
      )
    }

    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!

    const roleError = requireRole(auth, ['admin'])
    if (roleError) return roleError

    const body = await request.json()
    const name = (body.name || '').trim()
    const unitInput = String(body.unit || '')
    const unit = normalizeMedicineUnit(unitInput)
    const quantity = parseNonNegativeInteger(body.quantity, 0)
    const reorderLevel = parseNonNegativeInteger(body.reorder_level, 0)

    if (!name) {
      return NextResponse.json({ error: 'Medicine name is required' }, { status: 400 })
    }

    if (!isValidMedicineUnit(unitInput)) {
      return NextResponse.json(
        { error: 'Unit must be a text label like pcs, tablets, bottles, or boxes' },
        { status: 400 }
      )
    }

    if (quantity === null || reorderLevel === null) {
      return NextResponse.json(
        { error: 'Quantity and reorder level must be non-negative numbers' },
        { status: 400 }
      )
    }

    const medicineData = {
      name,
      category: body.category?.trim() || null,
      quantity,
      unit,
      reorder_level: reorderLevel,
      supplier: body.supplier?.trim() || null,
      expiry_date: body.expiry_date || null,
      notes: body.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('medicines')
      .insert([medicineData])
      .select()
      .single()

    if (error && isMissingMedicinesTableError(error)) {
      return NextResponse.json(
        { error: 'Medicines table is not ready yet. Apply the latest medicines migrations and reload schema.' },
        { status: 503 }
      )
    }

    if (error && isPermissionError(error)) {
      return NextResponse.json(
        { error: 'Permission denied for medicines. Apply the medicines permissions migration and verify the service role key.' },
        { status: 403 }
      )
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
