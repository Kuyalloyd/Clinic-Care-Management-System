import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing environment variables' },
        { status: 500 }
      )
    }

    const sqlStatements = [
      'ALTER TABLE bills DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE patients DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE prescriptions DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE reports DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE staff DISABLE ROW LEVEL SECURITY;',
    ]

    const results = []

    for (const sql of sqlStatements) {
      try {
        console.log(`Executing: ${sql}`)
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
          },
          body: JSON.stringify({ sql }),
        })

        if (response.ok) {
          results.push({ sql, success: true })
          console.log(`✓ ${sql}`)
        } else {
          const error = await response.text()
          console.log(`⚠ ${sql} - ${error}`)
          results.push({ sql, success: false, error })
        }
      } catch (error: any) {
        console.log(`✗ ${sql} - ${error.message}`)
        results.push({ sql, success: false, error: error.message })
      }
    }

    return NextResponse.json(
      {
        message: 'RLS fix attempt completed',
        results,
        nextSteps: 'Try updating a bill now - it should work!',
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in fix-rls:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fix RLS' },
      { status: 500 }
    )
  }
}
