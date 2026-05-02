'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/apiClient'
import { useDashboardData } from '@/lib/DataContext'
import { StaffMessage } from '@/lib/types'
import { CheckCheck, CornerUpLeft, Loader2, Send } from 'lucide-react'
import ActionToast from './ActionToast'

type StaffRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | null
type ReplyContext = {
  recipientStaffId: string
  patientId: string
  subject: string
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function StaffMessagesPanel({
  onUnreadCountChange,
}: {
  onUnreadCountChange?: (count: number) => void
}) {
  const { data } = useDashboardData()
  const [messages, setMessages] = useState<StaffMessage[]>([])
  const [currentRole, setCurrentRole] = useState<StaffRole>(null)
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [replyContext, setReplyContext] = useState<ReplyContext | null>(null)
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    type: 'info',
  })
  const [formData, setFormData] = useState({
    recipient_staff_id: '',
    patient_id: '',
    subject: '',
    message_body: '',
  })

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ open: true, message, type })
    setTimeout(() => {
      setToast((current) => ({ ...current, open: false }))
    }, 2600)
  }

  const loadMessages = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getMessages()
      setMessages(response.data || [])
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to load messages'
      setError(message)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const storedRole = localStorage.getItem('user_role')
    const userEmail = (localStorage.getItem('user_email') || '').toLowerCase()
    const userId = localStorage.getItem('user_id') || ''

    const staffMember = data.staff.find(
      (member) => member.id === userId || member.email?.toLowerCase() === userEmail
    )

    if (staffMember?.role) {
      setCurrentRole(staffMember.role)
      setCurrentStaffId(staffMember.id)
      return
    }

    if (
      storedRole === 'admin' ||
      storedRole === 'doctor' ||
      storedRole === 'nurse' ||
      storedRole === 'receptionist'
    ) {
      setCurrentRole(storedRole)
      setCurrentStaffId(userId || null)
      return
    }

    setCurrentRole(null)
    setCurrentStaffId(null)
  }, [data.staff])

  useEffect(() => {
    if (currentRole === 'doctor' || currentRole === 'nurse') {
      loadMessages()
      return
    }

    setLoading(false)
  }, [currentRole])

  const recipientOptions = useMemo(() => {
    if (currentRole === 'doctor') {
      return [...data.staff]
        .filter((member) => member.role === 'nurse')
        .sort((a, b) => Number(b.is_on_duty) - Number(a.is_on_duty) || a.full_name.localeCompare(b.full_name))
    }

    if (currentRole === 'nurse') {
      return [...data.staff]
        .filter((member) => member.role === 'doctor')
        .sort((a, b) => Number(b.is_on_duty) - Number(a.is_on_duty) || a.full_name.localeCompare(b.full_name))
    }

    return []
  }, [currentRole, data.staff])

  const inboxMessages = useMemo(
    () =>
      [...messages]
        .filter((message) => message.recipient_staff_id === currentStaffId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [messages, currentStaffId]
  )

  const sentMessages = useMemo(
    () =>
      [...messages]
        .filter((message) => message.sender_staff_id === currentStaffId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [messages, currentStaffId]
  )

  const unreadCount = inboxMessages.filter((message) => !message.is_read).length
  const selectedReplyDoctor = replyContext ? data.staff.find((member) => member.id === replyContext.recipientStaffId) : null

  useEffect(() => {
    onUnreadCountChange?.(currentRole === 'doctor' || currentRole === 'nurse' ? unreadCount : 0)
  }, [currentRole, onUnreadCountChange, unreadCount])

  const getStaffLabel = (staffId: string) => {
    const staffMember = data.staff.find((member) => member.id === staffId)
    if (!staffMember) return 'Unknown staff'
    if (staffMember.role === 'doctor') {
      return `Dr. ${staffMember.full_name}`
    }
    if (staffMember.role === 'nurse') {
      return `Nurse ${staffMember.full_name}`
    }
    return staffMember.full_name
  }

  const getPatientLabel = (patientId?: string | null) => {
    if (!patientId) return 'No patient linked'
    return data.patients.find((patient) => patient.id === patientId)?.full_name || 'Unknown patient'
  }

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleStartReply = (message: StaffMessage) => {
    const replySubject = message.subject.toLowerCase().startsWith('re:') ? message.subject : `Re: ${message.subject}`

    setReplyContext({
      recipientStaffId: message.sender_staff_id,
      patientId: message.patient_id || '',
      subject: replySubject,
    })
    setFormData({
      recipient_staff_id: message.sender_staff_id,
      patient_id: message.patient_id || '',
      subject: replySubject,
      message_body: '',
    })
  }

  const handleCancelReply = () => {
    setReplyContext(null)
    setFormData({
      recipient_staff_id: '',
      patient_id: '',
      subject: '',
      message_body: '',
    })
  }

  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (currentRole === 'nurse' && !replyContext) {
      showToast('Open a doctor message first, then tap Reply.', 'error')
      return
    }

    if (!formData.recipient_staff_id) {
      showToast('Please select who should receive the message.', 'error')
      return
    }

    if (!formData.subject.trim()) {
      showToast('Please add a short subject.', 'error')
      return
    }

    if (!formData.message_body.trim()) {
      showToast('Please write your message first.', 'error')
      return
    }

    try {
      setSending(true)
      const response = await apiClient.createMessage({
        recipient_staff_id: formData.recipient_staff_id,
        patient_id: formData.patient_id || null,
        subject: formData.subject.trim(),
        message_body: formData.message_body.trim(),
      })

      setMessages((current) => [response.data, ...current])
      setFormData({
        recipient_staff_id: '',
        patient_id: '',
        subject: '',
        message_body: '',
      })
      setReplyContext(null)
      showToast('Message sent successfully.', 'success')
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to send message'
      showToast(message, 'error')
    } finally {
      setSending(false)
    }
  }

  const handleMarkRead = async (messageId: string) => {
    try {
      setMarkingId(messageId)
      await apiClient.markMessageRead(messageId)
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                is_read: true,
                read_at: new Date().toISOString(),
              }
            : message
        )
      )
      showToast('Message marked as read.', 'success')
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to update message'
      showToast(message, 'error')
    } finally {
      setMarkingId(null)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading messages...</div>
  }

  if (currentRole !== 'doctor' && currentRole !== 'nurse') {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
        Messages are available for doctor and nurse accounts only.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
              <p className="text-sm text-gray-600 mt-1">
                {currentRole === 'doctor'
                  ? 'Send a message to a nurse and include a patient if the handoff is about a specific case.'
                  : 'Read doctor messages here and reply back to the doctor when you need to update the care handoff.'}
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {unreadCount} unread
            </span>
          </div>

          <form onSubmit={handleSendMessage} className="space-y-4">
            {currentRole === 'doctor' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Send To Nurse</label>
                  <select
                    name="recipient_staff_id"
                    value={formData.recipient_staff_id}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{recipientOptions.length === 0 ? 'No staff available' : 'Select recipient'}</option>
                    {recipientOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        Nurse {member.full_name}
                        {member.specialty ? ` - ${member.specialty}` : ''}
                        {member.is_on_duty ? ' (On Duty)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Related Patient</label>
                  <select
                    name="patient_id"
                    value={formData.patient_id}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No patient linked</option>
                    {data.patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                {replyContext ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-900">
                        Replying to {selectedReplyDoctor ? `Dr. ${selectedReplyDoctor.full_name}` : 'doctor'}
                      </p>
                      <p className="mt-1 text-sm text-blue-700">
                        Patient: {getPatientLabel(replyContext.patientId || undefined)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelReply}
                      className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Cancel Reply
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Reply-only messaging</p>
                    <p className="mt-1 text-sm text-blue-700">
                      Nurses cannot start a new message here. Open a doctor message below and tap Reply.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Brief handoff summary"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                name="message_body"
                value={formData.message_body}
                onChange={handleChange}
                placeholder="Write the message for the care team..."
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={sending || (currentRole === 'nurse' && !replyContext)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {sending ? 'Sending...' : currentRole === 'nurse' ? 'Send Reply' : 'Send Message'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">Messages are unavailable right now</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Inbox</h3>
                <p className="text-xs text-slate-500 mt-1">Messages sent to you</p>
              </div>
              <span className="text-xs font-semibold rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                {inboxMessages.length}
              </span>
            </div>

            {inboxMessages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No messages in your inbox yet.
              </div>
            ) : (
              <div className="space-y-3">
                {inboxMessages.map((message) => (
                  <div key={message.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">{message.subject}</p>
                          {!message.is_read && (
                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              Unread
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          From {getStaffLabel(message.sender_staff_id)} • {formatDateTime(message.created_at)}
                        </p>
                      </div>
                      {!message.is_read && (
                        <div className="flex flex-wrap items-center gap-2">
                          {currentRole === 'nurse' && (
                            <button
                              type="button"
                              onClick={() => handleStartReply(message)}
                              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                            >
                              <CornerUpLeft size={14} />
                              Reply
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleMarkRead(message.id)}
                            disabled={markingId === message.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            {markingId === message.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
                            Mark Read
                          </button>
                        </div>
                      )}
                      {message.is_read && currentRole === 'nurse' && (
                        <button
                          type="button"
                          onClick={() => handleStartReply(message)}
                          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          <CornerUpLeft size={14} />
                          Reply
                        </button>
                      )}
                    </div>

                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <p className="text-xs text-slate-500">Patient: {getPatientLabel(message.patient_id)}</p>
                      <p className="whitespace-pre-line">{message.message_body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Sent</h3>
                <p className="text-xs text-slate-500 mt-1">Messages you have sent</p>
              </div>
              <span className="text-xs font-semibold rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                {sentMessages.length}
              </span>
            </div>

            {sentMessages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No sent messages yet.
              </div>
            ) : (
              <div className="space-y-3">
                {sentMessages.slice(0, 8).map((message) => (
                  <div key={message.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{message.subject}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          To {getStaffLabel(message.recipient_staff_id)} • {formatDateTime(message.created_at)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          message.is_read ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {message.is_read ? 'Seen' : 'Sent'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <p className="text-xs text-slate-500">Patient: {getPatientLabel(message.patient_id)}</p>
                      <p className="whitespace-pre-line">{message.message_body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ActionToast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
      />
    </div>
  )
}
