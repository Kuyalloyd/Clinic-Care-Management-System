import { NextRequest, NextResponse } from 'next/server'
import { sendEmailViaGmail } from '@/lib/gmail'

export async function POST(request: NextRequest) {
  let requestBody = null
  try {
    requestBody = await request.json()
    const { to, subject, htmlContent, textContent } = requestBody

    console.log('📧 Email send request received')
    console.log('To:', to)
    console.log('Subject:', subject)

    // Validation
    if (!to || !subject || !htmlContent) {
      console.error('❌ Validation failed - missing required fields')
      return NextResponse.json(
        { error: 'Missing email recipient, subject, or content' },
        { status: 400 }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      console.error('❌ Invalid email format:', to)
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      )
    }

    // Environment check
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Gmail credentials not configured')
      console.error('GMAIL_USER:', process.env.GMAIL_USER ? 'Set' : 'NOT SET')
      console.error('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'Set' : 'NOT SET')
      return NextResponse.json(
        { error: 'Email service not properly configured. Please contact administrator.' },
        { status: 503 }
      )
    }

    console.log('✅ Validation passed')
    console.log('📤 Sending email via Gmail...')
    
    const result = await sendEmailViaGmail(to, subject, htmlContent, textContent)

    if (!result.success) {
      console.error('❌ Email send failed:', result.error)
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    console.log('✅ Email sent successfully with messageId:', result.messageId)
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId,
      to: to,
      subject: subject,
      status: 'sent',
    })
  } catch (error: any) {
    console.error('❌ Email API Error:', error)
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    
    if (error instanceof SyntaxError) {
      console.error('❌ JSON parse error - invalid request body')
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to send email. Please try again.' },
      { status: 500 }
    )
  }
}
