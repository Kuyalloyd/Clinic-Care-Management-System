import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getRequestAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { auth } = await getRequestAuth(request)
    if (auth) {
      await supabaseAdmin
        .from('staff')
        .update({ is_on_duty: false })
        .eq('id', auth.staffId)
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const response = NextResponse.json({ message: 'Logged out successfully' })
    response.cookies.delete('auth-token')
    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
