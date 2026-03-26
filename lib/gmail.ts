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
    console.warn('Gmail credentials not configured in environment variables')
    return {
      success: false,
      error: 'Gmail credentials not configured',
    }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    })

    const mailOptions = {
      from: `Clinic Care ${GMAIL_USER}`,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent || htmlContent,
    }

    const info = await transporter.sendMail(mailOptions)

    return {
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
    }
  } catch (error: any) {
    console.error('Gmail send error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send email via Gmail',
    }
  }
}
