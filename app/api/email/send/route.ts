import { NextRequest, NextResponse } from 'next/server'
import { sendEmailViaGmail } from '@/lib/gmail'

export async function POST(request: NextRequest) {
  try {
    const { to, subject, htmlContent, textContent } = await request.json()

    if (!to || !subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Missing email recipient, subject, or content' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    console.log('📧 Email API Route: Sending email to:', to)
    console.log('📧 Subject:', subject)
    
    const result = await sendEmailViaGmail(to, subject, htmlContent, textContent)

    if (!result.success) {
      console.error('❌ Email API Route: Send failed:', result.error)
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    console.log('✅ Email API Route: Email sent successfully')
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId,
      to: to,
      subject: subject,
      status: 'sent',
    })
  } catch (error: any) {
    console.error('❌ Email API Route: Unexpected error:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}
