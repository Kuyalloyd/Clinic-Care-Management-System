import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Authentication failed' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({
      user: data.user,
      session: data.session,
    })

    if (data.session) {
      response.cookies.set('auth-token', data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 604800,
      })
    }

    const staffLookup = await supabaseAdmin
      .from('staff')
      .select('id')
      .or(`id.eq.${data.user.id},email.eq.${(data.user.email || '').toLowerCase()}`)
      .maybeSingle()

    if (staffLookup.data?.id) {
      await supabaseAdmin
        .from('staff')
        .update({ is_on_duty: true })
        .eq('id', staffLookup.data.id)
    }

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
