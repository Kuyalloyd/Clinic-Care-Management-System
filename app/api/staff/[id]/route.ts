import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { id } = await params

    console.log('📝 [STAFF UPDATE] Attempting to update staff')
    console.log('   ID:', id)
    console.log('   Body:', body)

    if (!id || id === 'undefined') {
      console.error('❌ Invalid ID provided')
      return NextResponse.json(
        { error: 'Invalid staff ID' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('staff')
      .update(body)
      .eq('id', id)
      .select('id, email, full_name, role, phone, specialty, created_at')

    if (error) {
      console.error('❌ Update failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('✅ Staff updated successfully')
    return NextResponse.json(data[0], { status: 200 })
  } catch (error: any) {
    console.error('❌ Exception:', error.message)
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

    const { error } = await supabaseAdmin
      .from('staff')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Staff deleted' }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
