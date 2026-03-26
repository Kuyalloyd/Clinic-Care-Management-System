import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('📝 [STAFF API] Fetching all staff members')
    
    const { data, error } = await supabaseAdmin
      .from('staff')
      .select('id, email, full_name, role, phone, specialty, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Query failed:', error.message, '(code:', error.code + ')')
      return NextResponse.json(
        { 
          error: 'FETCH_FAILED',
          message: error.message,
          code: error.code
        },
        { status: 400 }
      )
    }

    console.log('✅ [STAFF API] Success:', data?.length || 0, 'staff members')
    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('❌ [STAFF API] Exception:', error.message)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const staffData = {
      email: body.email,
      full_name: body.full_name,
      phone: body.phone,
      role: body.role || 'doctor',
      specialty: body.specialty || null
    }

    console.log('📝 Creating staff member:', staffData)

    const { data, error } = await supabaseAdmin
      .from('staff')
      .insert([staffData])
      .select()

    if (error) {
      console.error('❌ Staff creation error:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: error.details || '',
          code: error.code || '',
        }, 
        { status: 400 }
      )
    }

    console.log('✅ Staff member created successfully:', data[0])
    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    console.error('❌ Internal server error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

