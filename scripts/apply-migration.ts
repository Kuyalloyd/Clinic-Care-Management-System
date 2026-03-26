import { supabaseAdmin } from '../lib/supabase'

async function applyMigration() {
  try {
    const { error } = await supabaseAdmin
      .from('prescriptions')
      .select('is_completed')
      .limit(1)

    if (error && error.message.includes('is_completed')) {
      console.log('is_completed column does not exist yet')
      console.log('Please add it manually via Supabase dashboard SQL editor')
      return
    }
    
    console.log('✓ is_completed column exists')
  } catch (err) {
    console.error('Error:', err)
  }
}

applyMigration()
