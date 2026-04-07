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

const TYPE_DEPENDENCIES: Record<string, Array<{ field: string; type: string }>> = {
  patients: [],
  staff: [],
  appointments: [
    { field: 'patient_id', type: 'patients' },
    { field: 'staff_id', type: 'staff' },
  ],
  prescriptions: [
    { field: 'patient_id', type: 'patients' },
    { field: 'staff_id', type: 'staff' },
  ],
  bills: [
    { field: 'patient_id', type: 'patients' },
  ],
  reports: [
    { field: 'patient_id', type: 'patients' },
    { field: 'staff_id', type: 'staff' },
  ],
}

type RestoreResult =
  | { success: true; data?: any }
  | { success: false; error: any; status?: number }

function dbErrorResponse(error: any) {
  return {
    message: error?.message || 'Database operation failed',
    code: error?.code || '',
    details: error?.details || '',
    hint: error?.hint || '',
  }
}

function restoreConflictMessage(type: string, error: any) {
  const details = error?.details || ''
  const match = details.match(/Key \((.+?)\)=\((.+?)\) already exists\./)
  const field = match?.[1]
  const value = match?.[2]

  if (field && value) {
    return `${type.slice(0, -1)} restore blocked: another active record already uses ${field} = ${value}. Remove the duplicate record first, then try again.`
  }

  return `${type.slice(0, -1)} restore blocked by a duplicate value in the target table. Remove the conflicting record first, then try again.`
}

function getConflictFieldAndValue(error: any) {
  const details = error?.details || ''
  const match = details.match(/Key \((.+?)\)=\((.+?)\) already exists\./)

  if (!match) return null

  return {
    field: match[1],
    value: match[2],
  }
}

async function restoreArchivedItemById(
  id: string,
  type: string,
  visited = new Set<string>()
): Promise<RestoreResult> {
  const visitKey = `${type}:${id}`
  if (visited.has(visitKey)) {
    return {
      success: false,
      error: {
        message: 'Circular archive dependency detected',
      },
    }
  }

  visited.add(visitKey)

  const archived = await supabaseAdmin
    .from('archive_items')
    .select('*')
    .eq('id', id)
    .single()

  if (archived.error || !archived.data) {
    return {
      success: false,
      error: archived.error?.message || 'Archived item not found',
    }
  }

  const sourceTable = TYPE_TO_TABLE[type]
  if (!sourceTable || archived.data.source_table !== sourceTable) {
    return {
      success: false,
      error: 'Archive type does not match selected item',
    }
  }

  const recordData = archived.data.record_data || {}
  const dependencies = TYPE_DEPENDENCIES[type] || []

  for (const dependency of dependencies) {
    const dependencyId = recordData[dependency.field]
    if (!dependencyId) {
      continue
    }

    const existingDependency = await supabaseAdmin
      .from(TYPE_TO_TABLE[dependency.type])
      .select('id')
      .eq('id', dependencyId)
      .maybeSingle()

    if (!existingDependency.data) {
      const dependencyArchive = await supabaseAdmin
        .from('archive_items')
        .select('id')
        .eq('source_table', TYPE_TO_TABLE[dependency.type])
        .eq('source_id', dependencyId)
        .maybeSingle()

      if (!dependencyArchive.data) {
        return {
          success: false,
          error: `Missing archived dependency for ${dependency.field}`,
        }
      }

      const dependencyResult = await restoreArchivedItemById(dependencyArchive.data.id, dependency.type, visited)
      if (!dependencyResult.success) {
        return dependencyResult
      }
    }
  }

  const payload = {
    ...recordData,
    id: archived.data.source_id,
  }

  const existing = await supabaseAdmin
    .from(sourceTable)
    .select('id')
    .eq('id', archived.data.source_id)
    .maybeSingle()

  const writeResult = existing.data
    ? await supabaseAdmin
        .from(sourceTable)
        .update(payload)
        .eq('id', archived.data.source_id)
        .select()
    : await supabaseAdmin
        .from(sourceTable)
        .insert([payload])
        .select()

  const { data, error } = writeResult

  if (error) {
    if (error.code === '23505') {
      const conflict = getConflictFieldAndValue(error)

      if (conflict && ['patients', 'staff'].includes(sourceTable) && conflict.field === 'email') {
        const { id: _ignoredId, ...restoredFields } = recordData
        const updateResult = await supabaseAdmin
          .from(sourceTable)
          .update({
            ...restoredFields,
          })
          .eq('email', conflict.value)
          .select()

        if (!updateResult.error && updateResult.data?.length) {
          const archiveDelete = await supabaseAdmin
            .from('archive_items')
            .delete()
            .eq('id', id)

          if (archiveDelete.error) {
            return {
              success: false,
              error: dbErrorResponse(archiveDelete.error),
            }
          }

          return {
            success: true,
            data: updateResult.data[0],
          }
        }
      }

      return {
        success: false,
        error: {
          ...dbErrorResponse(error),
          message: restoreConflictMessage(type, error),
        },
        status: 409,
      }
    }

    return {
      success: false,
      error: dbErrorResponse(error),
      status: 400,
    }
  }

  const archiveDelete = await supabaseAdmin
    .from('archive_items')
    .delete()
    .eq('id', id)

  if (archiveDelete.error) {
    return {
      success: false,
      error: dbErrorResponse(archiveDelete.error),
      status: 400,
    }
  }

  return {
    success: true,
    data: data?.[0],
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const restoreResult = await restoreArchivedItemById(id, type)

    if (!restoreResult.success) {
      return NextResponse.json(
        { error: restoreResult.error },
        { status: restoreResult.status || 400 }
      )
    }

    return NextResponse.json({
      message: `${type.slice(0, -1)} restored successfully from archive`,
      data: restoreResult.data,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
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
      return NextResponse.json({ error: dbErrorResponse(error) }, { status: 400 })
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
