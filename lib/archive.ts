import { PostgrestError } from '@supabase/supabase-js'

type SupabaseLike = {
  from: (table: string) => any
}

export type ArchiveDeleteResult =
  | { success: true }
  | { success: false; error: PostgrestError | { message: string } }

export async function archiveAndDeleteById(
  supabaseAdmin: SupabaseLike,
  sourceTable: string,
  id: string,
  deletedBy?: string | null
): Promise<ArchiveDeleteResult> {
  const existing = await supabaseAdmin
    .from(sourceTable)
    .select('*')
    .eq('id', id)
    .single()

  if (existing.error) {
    return { success: false, error: existing.error }
  }

  const archiveInsert = await supabaseAdmin
    .from('archive_items')
    .insert([
      {
        source_table: sourceTable,
        source_id: id,
        record_data: existing.data,
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy || null,
      },
    ])

  // If archive table doesn't exist yet, gracefully fall back to direct delete.
  if (archiveInsert.error && (
    archiveInsert.error.code === '42P01' ||
    archiveInsert.error.message?.includes('archive_items') ||
    archiveInsert.error.message?.includes('does not exist')
  )) {
    const fallbackDelete = await supabaseAdmin
      .from(sourceTable)
      .delete()
      .eq('id', id)

    if (fallbackDelete.error) {
      return { success: false, error: fallbackDelete.error }
    }

    return { success: true }
  }

  if (archiveInsert.error) {
    if (archiveInsert.error.code === '42501') {
      return {
        success: false,
        error: {
          message: 'Archive table permission denied. Run SQL grant for archive_items in Supabase.',
        },
      }
    }
    return { success: false, error: archiveInsert.error }
  }

  const deleted = await supabaseAdmin
    .from(sourceTable)
    .delete()
    .eq('id', id)

  if (deleted.error) {
    return { success: false, error: deleted.error }
  }

  return { success: true }
}
