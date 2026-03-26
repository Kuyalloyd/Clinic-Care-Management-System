'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/apiClient'
import { useDashboardData } from '@/lib/DataContext'
import { Appointment, Patient, Staff } from '@/lib/types'
import { Plus, Calendar, Clock, User, Mail, Edit2, Trash2, Search } from 'lucide-react'
import EmailModal from './EmailModal'

export default function AppointmentsList() {
  const { data, refreshAppointments } = useDashboardData()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusChangeId, setStatusChangeId] = useState<string | null>(null)
  const [activeStatus, setActiveStatus] = useState<string>('all')
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setLoading(false)
  }, [])

  const getPatientName = (patientId: string) => {
    return data.patients.find((p) => p.id === patientId)?.full_name || 'Unknown'
  }

  const getDoctorName = (staffId: string) => {
    return data.staff.find((s) => s.id === staffId)?.full_name || 'Unassigned'
  }

  const getStaffInfo = (staffId: string) => {
    const staff = data.staff.find((s) => s.id === staffId)
    if (!staff) return { name: 'Unassigned', role: '' }
    const rolePrefix = staff.role === 'doctor' ? 'Dr.' : staff.role === 'nurse' ? 'Nurse' : staff.role.charAt(0).toUpperCase() + staff.role.slice(1)
    return { name: staff.full_name, role: rolePrefix }
  }

  const handleDeleteAppointment = async (appointmentId: string, patientName: string) => {
    if (!confirm(`Are you sure you want to delete the appointment for ${patientName}? This action cannot be undone.`)) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete appointment')
      }

      alert('Appointment deleted successfully!')
      setShowDeleteModal(null)
      refreshAppointments()
    } catch (error: any) {
      console.error('Failed to delete appointment:', error)
      alert('Failed to delete appointment')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'no-show':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredAppointments = (activeStatus === 'all'
    ? data.appointments
    : data.appointments.filter(apt => apt.status === activeStatus)
  ).filter(apt => {
    const patientName = getPatientName(apt.patient_id).toLowerCase()
    const doctorName = getDoctorName(apt.staff_id).toLowerCase()
    const reason = apt.reason.toLowerCase()
    const query = searchQuery.toLowerCase()
    
    return patientName.includes(query) || 
           doctorName.includes(query) || 
           reason.includes(query)
  })

  const statusTabs = [
    { label: 'All', value: 'all', count: data.appointments.length },
    { label: 'Scheduled', value: 'scheduled', count: data.appointments.filter(a => a.status === 'scheduled').length },
    { label: 'Completed', value: 'completed', count: data.appointments.filter(a => a.status === 'completed').length },
    { label: 'No Show', value: 'no-show', count: data.appointments.filter(a => a.status === 'no-show').length },
    { label: 'Cancelled', value: 'cancelled', count: data.appointments.filter(a => a.status === 'cancelled').length },
  ]

  if (loading) {
    return <div className="text-center py-8">Loading appointments...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Appointments</h2>
          <p className="text-gray-600 text-sm">Manage clinic appointments and schedules</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary btn-lg"
        >
          <Plus size={20} />
          New Appointment
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <AppointmentForm
            patients={data.patients}
            onSuccess={() => {
              setShowForm(false)
              setTimeout(() => {
                refreshAppointments()
              }, 500)
            }}
            onClose={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600" size={20} />
              <input
                type="text"
                placeholder="Search by patient name, doctor name, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {statusTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveStatus(tab.value)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeStatus === tab.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No {activeStatus !== 'all' ? activeStatus : ''} appointments found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredAppointments.map((apt) => {
                const patient = data.patients.find((p) => p.id === apt.patient_id)
                return (
                  <div
                    key={apt.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getPatientName(apt.patient_id)}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{apt.reason}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}
                      >
                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User size={16} className="text-gray-400" />
                        <span key={apt.id}>{getStaffInfo(apt.staff_id).role && `${getStaffInfo(apt.staff_id).role} `}{getStaffInfo(apt.staff_id).name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={16} className="text-gray-400" />
                        <span>{new Date(apt.appointment_date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={16} className="text-gray-400" />
                        <span>{apt.appointment_time}</span>
                      </div>
                    </div>

                    {apt.notes && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 mb-1">Notes:</p>
                        <p className="text-sm text-gray-700">{apt.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(apt.id)}
                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium transition"
                      >
                        Edit
                      </button>
                      {patient && patient.email && apt.status === 'scheduled' && (
                        <button
                          onClick={() => {
                            setSelectedAppointment(apt)
                            setShowEmailModal(true)
                          }}
                          className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium transition flex items-center justify-center gap-1"
                        >
                          <Mail size={14} />
                          Email
                        </button>
                      )}
                      <button
                        onClick={() => setStatusChangeId(apt.id)}
                        className="flex-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium transition"
                      >
                        Change Status
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(apt.id)}
                        className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium transition flex items-center justify-center gap-1"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showEmailModal && selectedAppointment && (
        <EmailModal
          patientEmail={data.patients.find((p: Patient) => p.id === selectedAppointment.patient_id)?.email || ''}
          patientName={getPatientName(selectedAppointment.patient_id)}
          appointmentDate={new Date(selectedAppointment.appointment_date).toLocaleDateString()}
          appointmentTime={selectedAppointment.appointment_time}
          onClose={() => {
            setShowEmailModal(false)
            setSelectedAppointment(null)
          }}
          onSend={async (subject, message) => {
            try {
              const email = data.patients.find((p: Patient) => p.id === selectedAppointment.patient_id)?.email
              if (!email) throw new Error('Patient email not found')
              await apiClient.sendEmail({
                to: email,
                subject: subject,
                htmlContent: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap; word-wrap: break-word;">${message}</pre>`,
                textContent: message,
              })
            } catch (error: any) {
              throw new Error(error.message || 'Failed to send email')
            }
          }}
        />
      )}

      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <AssignDoctorForm
            appointment={data.appointments.find(a => a.id === editingId)!}
            onSuccess={() => {
              refreshAppointments()
              setEditingId(null)
            }}
            onClose={() => setEditingId(null)}
          />
        </div>
      )}

      {statusChangeId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <ChangeStatusForm
            appointment={data.appointments.find(a => a.id === statusChangeId)!}
            onSuccess={() => {
              refreshAppointments()
              setStatusChangeId(null)
            }}
            onClose={() => setStatusChangeId(null)}
          />
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Appointment</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this appointment? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const appointment = data.appointments.find(a => a.id === showDeleteModal)
                  if (appointment) {
                    handleDeleteAppointment(appointment.id, getPatientName(appointment.patient_id))
                  }
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AppointmentForm({
  patients,
  onSuccess,
  onClose,
}: {
  patients: Patient[]
  onSuccess: () => void
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    patient_id: '',
    staff_id: '',
    appointment_date: '',
    appointment_time: '',
    reason: '',
    status: 'scheduled',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setError(null)
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!formData.patient_id) {
        setError('Please select a patient')
        setLoading(false)
        return
      }
      if (!formData.appointment_date) {
        setError('Please select a date')
        setLoading(false)
        return
      }
      if (!formData.appointment_time) {
        setError('Please select a time')
        setLoading(false)
        return
      }

      const appointmentData: any = {
        patient_id: formData.patient_id,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        reason: formData.reason || '',
        status: formData.status,
      }
      
      if (formData.staff_id) {
        appointmentData.staff_id = formData.staff_id
      }

      console.log('📝 Creating appointment with data:', appointmentData)
      const response = await apiClient.createAppointment(appointmentData)
      console.log('✅ Appointment created successfully:', response.data)
      
      onSuccess()
      setLoading(false)
    } catch (error: any) {
      console.error('❌ Failed to create appointment:', error)
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create appointment'
      setError(errorMsg)
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Schedule New Appointment</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          ×
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Patient <span className="text-red-500">*</span></label>
            <select
              name="patient_id"
              value={formData.patient_id}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="">Select Patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              name="appointment_date"
              value={formData.appointment_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time <span className="text-red-500">*</span></label>
            <input
              type="time"
              name="appointment_time"
              value={formData.appointment_time}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Visit</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Scheduling...' : 'Schedule Appointment'}
          </button>
        </div>
      </form>
    </div>
  )
}

function AssignDoctorForm({
  appointment,
  onSuccess,
  onClose,
}: {
  appointment: Appointment
  onSuccess: () => void
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [staff, setStaff] = useState<Staff[]>([])
  const [staffLoading, setStaffLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [staffId, setStaffId] = useState(appointment.staff_id || '')
  const { data } = useDashboardData()

  const getStaffInfo = (staffId: string) => {
    const staffMember = staff.find((s) => s.id === staffId) || data.staff.find((s) => s.id === staffId)
    if (!staffMember) return { name: 'Unassigned', role: '' }
    let rolePrefix = ''
    if (staffMember.role === 'doctor') rolePrefix = 'Dr.'
    else if (staffMember.role === 'nurse') rolePrefix = 'Nurse'
    else rolePrefix = staffMember.role.charAt(0).toUpperCase() + staffMember.role.slice(1)
    return { name: staffMember.full_name, role: rolePrefix }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      console.log('📝 Fetching staff members for doctor assignment')
      const response = await apiClient.getAllStaff()
      console.log('✅ Staff response:', response)
      
      if (!response.data) {
        console.warn('⚠️ No data in response, setting empty array')
        setStaff([])
      } else if (Array.isArray(response.data)) {
        console.log('✅ Staff data is array, setting:', response.data)
        setStaff(response.data.filter(s => s.role !== 'admin'))
      } else {
        console.warn('⚠️ Staff data is not array, received:', typeof response.data)
        setStaff([])
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch staff:', error)
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })
      setError('Failed to load doctors. Please try again.')
    } finally {
      setStaffLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const updateData: any = {
        staff_id: staffId ? staffId : null,
      }

      console.log('📝 Assigning staff to appointment:', updateData)
      await apiClient.updateAppointment(appointment.id, updateData)
      console.log('✅ Staff assigned successfully')
      // Force a small delay to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 500))
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('❌ Failed to assign staff:', error)
      const errorMsg = error.response?.data?.error || error.message || 'Failed to assign staff'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Assign Doctor/Nurse</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          ×
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">Date:</span> {new Date(appointment.appointment_date).toLocaleDateString()}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Currently Assigned:</span> {getStaffInfo(appointment.staff_id || '').role && `${getStaffInfo(appointment.staff_id || '').role} `}{getStaffInfo(appointment.staff_id || '').name}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Doctor/Nurse (Optional)</label>
          {staffLoading ? (
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-500 bg-gray-50">
              ⏳ Loading staff...
            </div>
          ) : staff.length === 0 ? (
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-600 bg-yellow-50">
              ⚠️ No doctors/nurses available. Please add staff first.
            </div>
          ) : (
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="">-- Unassigned --</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.role})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || staffLoading}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Assigning...' : 'Assign'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function ChangeStatusForm({
  appointment,
  onSuccess,
  onClose,
}: {
  appointment: Appointment
  onSuccess: () => void
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<'scheduled' | 'completed' | 'cancelled' | 'no-show'>(appointment.status as 'scheduled' | 'completed' | 'cancelled' | 'no-show')
  const { data } = useDashboardData()

  const getDoctorName = (staffId: string) => {
    return data.staff.find((s) => s.id === staffId)?.full_name || 'Unassigned'
  }

  const getStaffInfo = (staffId: string) => {
    const staff = data.staff.find((s) => s.id === staffId)
    if (!staff) return { name: 'Unassigned', role: '' }
    const rolePrefix = staff.role === 'doctor' ? 'Dr.' : staff.role === 'nurse' ? 'Nurse' : staff.role.charAt(0).toUpperCase() + staff.role.slice(1)
    return { name: staff.full_name, role: rolePrefix }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      console.log('📝 Changing appointment status to:', newStatus)
      await apiClient.updateAppointment(appointment.id, { status: newStatus })
      console.log('✅ Appointment status changed successfully')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('❌ Failed to change status:', error)
      const errorMsg = error.response?.data?.error || error.message || 'Failed to change status'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const getPatientName = (patientId: string) => {
    return data.patients.find((p) => p.id === patientId)?.full_name || 'Unknown'
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Change Status</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          ×
        </button>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-600 mb-1">
          <span className="font-medium">Patient:</span> {getPatientName(appointment.patient_id)}
        </p>
        <p className="text-sm text-gray-600 mb-1">
          <span className="font-medium">Assigned To:</span> {getStaffInfo(appointment.staff_id).role} {getStaffInfo(appointment.staff_id).name}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Current Status:</span> 
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
            {appointment.status}
          </span>
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Update Status</label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {['scheduled', 'completed', 'no-show', 'cancelled'].map((status) => (
              <label key={status} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                <input
                  type="radio"
                  name="status"
                  value={status}
                  checked={newStatus === status}
                  onChange={(e) => setNewStatus(e.target.value as 'scheduled' | 'completed' | 'cancelled' | 'no-show')}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900 text-sm">
                    {status === 'scheduled' && 'Scheduled'}
                    {status === 'completed' && 'Completed'}
                    {status === 'no-show' && 'No Show'}
                    {status === 'cancelled' && 'Cancelled'}
                  </span>
                  <p className="text-xs text-gray-500">
                    {status === 'scheduled' && 'Appointment is scheduled'}
                    {status === 'completed' && 'Appointment was completed'}
                    {status === 'no-show' && 'Patient did not show up'}
                    {status === 'cancelled' && 'Appointment was cancelled'}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || newStatus === appointment.status}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Updating...' : 'Update Status'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
