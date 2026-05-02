import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getRequestAuth, requireRole } from '@/lib/auth'
import { isValidMedicineUnit, normalizeMedicineUnit } from '@/lib/medicine'

function parseNonNegativeInteger(value: unknown) {
  if (value === undefined) return undefined
  if (value === null || value === '') return 0

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()
    const updatePayload: Record<string, unknown> = {}

    if (body.name !== undefined) {
      const name = String(body.name || '').trim()
      if (!name) {
        return NextResponse.json({ error: 'Medicine name is required' }, { status: 400 })
      }
      updatePayload.name = name
    }

    if (body.category !== undefined) updatePayload.category = String(body.category || '').trim() || null
    if (body.unit !== undefined) {
      const unitInput = String(body.unit || '')
      if (!isValidMedicineUnit(unitInput)) {
        return NextResponse.json(
          { error: 'Unit must be a text label like pcs, tablets, bottles, or boxes' },
          { status: 400 }
        )
      }
      updatePayload.unit = normalizeMedicineUnit(unitInput)
    }
    if (body.supplier !== undefined) updatePayload.supplier = String(body.supplier || '').trim() || null
    if (body.expiry_date !== undefined) updatePayload.expiry_date = body.expiry_date || null
    if (body.notes !== undefined) updatePayload.notes = String(body.notes || '').trim() || null

    const quantity = parseNonNegativeInteger(body.quantity)
    if (quantity === null) {
      return NextResponse.json({ error: 'Quantity must be a non-negative number' }, { status: 400 })
    }
    if (quantity !== undefined) updatePayload.quantity = quantity

    const reorderLevel = parseNonNegativeInteger(body.reorder_level)
    if (reorderLevel === null) {
      return NextResponse.json({ error: 'Reorder level must be a non-negative number' }, { status: 400 })
    }
    if (reorderLevel !== undefined) updatePayload.reorder_level = reorderLevel

    const { data, error } = await supabaseAdmin
      .from('medicines')
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update medicine' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    const { error } = await supabaseAdmin.from('medicines').delete().eq('id', id)

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

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete medicine' },
      { status: 500 }
    )
  }
}
