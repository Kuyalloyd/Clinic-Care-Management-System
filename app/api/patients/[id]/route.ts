import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { archiveAndDeleteById } from '@/lib/archive'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

      return NextResponse.json(fallback.data)
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
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
    const { id } = await params
    const body = await request.json()

    if (body.email) {
      const { data: existingPatient, error: checkError } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('email', body.email)
        .neq('id', id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing patient:', checkError)
        return NextResponse.json({ error: checkError.message }, { status: 400 })
      }

      if (existingPatient) {
        return NextResponse.json(
          { error: `Patient with email "${body.email}" already exists` },
          { status: 409 }
        )
      }
    }

    const { data, error } = await supabaseAdmin
      .from('patients')
      .update(body)
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data[0])
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
