import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getRequestAuth, requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!
    const roleError = requireRole(auth, ['admin'])
    if (roleError) return roleError

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patient_id')

    let query = supabaseAdmin.from('bills').select('*')

    if (patientId) query = query.eq('patient_id', patientId)

    const { data, error } = await query.order('created_at', {
      ascending: false,
    })

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

export async function POST(request: NextRequest) {
  try {
    const { auth, errorResponse } = await getRequestAuth(request)
    if (errorResponse || !auth) return errorResponse!
    const roleError = requireRole(auth, ['admin'])
    if (roleError) return roleError

    const body = await request.json()

    if (!body.patient_id || !body.amount || !body.due_date) {
      return NextResponse.json(
        { error: 'Missing required fields: patient_id, amount, due_date' },
        { status: 400 }
      )
    }

    if (isNaN(body.amount) || body.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a valid positive number' },
        { status: 400 }
      )
    }

    const billData = {
      patient_id: body.patient_id,
      amount: parseFloat(body.amount),
      description: body.description || 'Medical Services',
      due_date: body.due_date,
      status: body.status || 'pending',
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('bills')
      .insert([billData])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create bill' },
        { status: 400 }
      )
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    console.error('Bill creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
