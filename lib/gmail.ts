import nodemailer from 'nodemailer'

const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD

interface EmailResponse {
  success: boolean
  message?: string
  messageId?: string
  error?: string
}

export async function sendEmailViaGmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<EmailResponse> {
  if (!to || !subject || !htmlContent) {
    return {
      success: false,
      error: 'Email recipient, subject, and content are required',
    }
  }

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error('❌ Gmail credentials missing:')
    console.error('GMAIL_USER:', GMAIL_USER ? 'Set' : 'NOT SET')
    console.error('GMAIL_APP_PASSWORD:', GMAIL_APP_PASSWORD ? 'Set' : 'NOT SET')
    return {
      success: false,
      error: 'Gmail credentials not configured. Please check environment variables.',
    }
  }

  try {
    console.log('🔐 Creating Gmail transporter...')
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    })

    console.log('✅ Transporter created successfully')
    console.log('📧 Preparing email payload...')
    console.log('To:', to)
    console.log('Subject:', subject)

    const mailOptions = {
      from: `Clinic Care <${GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent || htmlContent,
    }

    console.log('📤 Sending email...')
    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Email sent successfully with messageId:', info.messageId)

    return {
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
    }
  } catch (error: any) {
    console.error('❌ Gmail send error:', error)
    console.error('Error code:', error.code)
    console.error('Error response:', error.response)
    
    let friendlyError = error.message || 'Failed to send email via Gmail'
    
    if (error.code === 'EAUTH') {
      friendlyError = 'Gmail authentication failed. Check your app password.'
    } else if (error.message?.includes('Invalid login')) {
      friendlyError = 'Invalid Gmail credentials. Please verify your app password.'
    } else if (error.message?.includes('Too many login attempts')) {
      friendlyError = 'Too many login attempts. Please try again later.'
    }
    
    return {
      success: false,
      error: friendlyError,
    }
  }
}
