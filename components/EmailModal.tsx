'use client'

import { useState } from 'react'
import { Mail, Send, X } from 'lucide-react'

interface EmailModalProps {
  patientEmail: string
  patientName: string
  appointmentDate: string
  appointmentTime: string
  onClose: () => void
  onSend: (subject: string, message: string) => Promise<void>
}

export default function EmailModal({
  patientEmail,
  patientName,
  appointmentDate,
  appointmentTime,
  onClose,
  onSend,
}: EmailModalProps) {
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState(
    `Appointment Reminder - Clinic Care Management System`
  )
  const [message, setMessage] = useState(
    `Hi ${patientName},\n\nYour appointment has been scheduled at Clinic Care Management System.\n\nDate: ${appointmentDate}\nTime: ${appointmentTime}\n\nPlease reply to this email to confirm your attendance.\n\nThank you!`
  )
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSend = async () => {
    setLoading(true)
    setError('')
    try {
      console.log('📧 EmailModal: Sending email to:', patientEmail)
      await onSend(subject, message)
      console.log('✅ EmailModal: Email sent successfully')
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: any) {
      console.error('❌ EmailModal: Send error:', err)
      const errorMsg = err.message || 'Failed to send email'
      
      // Provide specific guidance based on error
      let displayError = errorMsg
      if (errorMsg.includes('500')) {
        displayError = 'Email service error. Please try again or contact support.'
      } else if (errorMsg.includes('Gmail')) {
        displayError = 'Gmail configuration issue. Please contact administrator.'
      }
      
      setError(displayError)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-green-100 p-3 rounded-full">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Email Sent Successfully!</h3>
          <p className="text-gray-600">
            Appointment reminder sent to {patientEmail}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Mail size={20} className="text-blue-600" />
            Send Appointment Reminder
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">To:</label>
          <p className="text-gray-900 font-medium break-all">{patientEmail}</p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Message:</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
            rows={6}
          />
          <p className="text-xs text-gray-500">{message.length} characters</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send size={18} />
            {loading ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  )
}
