import { NextRequest, NextResponse } from 'next/server'
import { sendEmailViaGmail } from '@/lib/gmail'

export async function GET(request: NextRequest) {
  try {
    console.log('📧 Email Test Endpoint: Testing Gmail configuration...')
    
    // Check environment variables
    const gmailUser = process.env.GMAIL_USER
    const gmailPassword = process.env.GMAIL_APP_PASSWORD

    console.log('🔍 Environment Check:')
    console.log('GMAIL_USER:', gmailUser ? '✅ Set' : '❌ NOT SET')
    console.log('GMAIL_APP_PASSWORD:', gmailPassword ? '✅ Set' : '❌ NOT SET')

    if (!gmailUser || !gmailPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gmail credentials are missing',
          details: {
            GMAIL_USER: gmailUser ? 'Set' : 'NOT SET',
            GMAIL_APP_PASSWORD: gmailPassword ? 'Set' : 'NOT SET',
          },
        },
        { status: 400 }
      )
    }

    // Try sending a test email
    console.log('📤 Attempting to send test email...')
    const result = await sendEmailViaGmail(
      gmailUser,
      'Clinic Care - Email Test',
      '<p>This is a test email from Clinic Care Management System</p>',
      'This is a test email from Clinic Care Management System'
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email test successful!',
      details: {
        messageId: result.messageId,
        sentTo: gmailUser,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('❌ Email Test Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
