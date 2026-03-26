import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing staff API endpoint...')
    
    console.log('📊 Test 1: Getting staff count')
    const { data: countData, error: countError } = await supabaseAdmin
      .from('staff')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Count error:', countError)
      return NextResponse.json({
        status: 'error',
        test: 'count',
        error: countError.message,
      }, { status: 400 })
    }

    console.log('✅ Staff table count:', countData)

    console.log('📊 Test 2: Fetching all staff members')
    const { data, error } = await supabaseAdmin
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Fetch error:', error)
      return NextResponse.json({
        status: 'error',
        test: 'fetch',
        error: error.message,
        details: error.details,
        code: error.code,
        hint: error.hint,
      }, { status: 400 })
    }

    console.log('✅ Data fetched:', data)
    console.log('✅ Data length:', data?.length || 0)
    console.log('✅ Data is array:', Array.isArray(data))

    if (!data || data.length === 0) {
      console.warn('⚠️ WARNING: No staff members found in database')
      return NextResponse.json({
        status: 'success',
        message: 'API working but no staff data in database',
        data: [],
        count: 0,
        hint: 'Please add staff members in the Staff tab',
      })
    }

    return NextResponse.json({
      status: 'success',
      message: 'Staff data retrieved successfully',
      data,
      count: data.length,
      columns: Object.keys(data[0] || {}),
    })
  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({
      status: 'error',
      test: 'exception',
      error: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}
