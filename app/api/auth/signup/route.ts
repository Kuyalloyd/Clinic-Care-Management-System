import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('staff')
        .insert({
          id: authData.user.id,
          email,
          full_name: fullName,
          role: 'doctor',
        })

      if (profileError) {
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      message: 'Signup successful. Please verify your email.',
      user: authData.user,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
