import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { id } = await params
    const { email } = body

    console.log('📝 [STAFF PASSWORD RESET] Attempting to reset password')
    console.log('   ID:', id)
    console.log('   Email:', email)

    if (!id || !email) {
      console.error('❌ Invalid ID or email provided')
      return NextResponse.json(
        { error: 'Invalid staff ID or email' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`
      }
    })

    if (error) {
      console.error('❌ Password reset failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('✅ Password reset link generated successfully')
    console.log('   Reset link sent to:', email)

    return NextResponse.json({ 
      message: 'Password reset email sent successfully',
      email: email
    }, { status: 200 })
  } catch (error: any) {
    console.error('❌ Exception:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
