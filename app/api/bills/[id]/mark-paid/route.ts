import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('=== Marking bill as paid ===')
    console.log('Bill ID:', id)

    const today = new Date().toISOString() // Full ISO timestamp to match other endpoints
    console.log('Today date:', today)

    const { data, error } = await supabaseAdmin
      .from('bills')
      .update({
        status: 'paid',
        paid_date: today,
      })
      .eq('id', id)
      .select()

    console.log('Update response:', { dataCount: data?.length, error })

    if (error) {
      console.error('❌ Supabase error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      return NextResponse.json(
        { error: error.message || 'Failed to mark bill as paid' },
        { status: 400 }
      )
    }

    if (!data || data.length === 0) {
      console.error('❌ No bill found with ID:', id)
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      )
    }

    console.log('✅ Bill marked as paid:', data[0])
    return NextResponse.json(
      { 
        success: true, 
        message: 'Bill marked as paid',
        data: data[0] 
      }, 
      { status: 200 }
    )
  } catch (error: any) {
    console.error('❌ Error marking bill as paid:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
