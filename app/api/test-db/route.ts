import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('Testing database connection...')

    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'patients')

    console.log('Tables check:', { tables, tablesError })

    const { data: selectData, error: selectError } = await supabaseAdmin
      .from('patients')
      .select('*')
      .limit(1)

    console.log('Select test:', { selectData, selectError })

    const testData = {
      full_name: 'Test Patient',
      email: 'test@example.com',
      phone: '1234567890'
    }

    console.log('Attempting insert...')
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('patients')
      .insert([testData])
      .select()

    console.log('Insert result:', { insertData, insertError })

    return NextResponse.json({
      tables: tables?.length || 0,
      tablesError: tablesError?.message,
      selectError: selectError?.message,
      insertError: insertError?.message,
      insertData
    })

  } catch (error: any) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
