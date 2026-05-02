'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/apiClient'
import { useDashboardData } from '@/lib/DataContext'
import { Prescription, Patient } from '@/lib/types'
import { Plus, FileText, Printer, Edit2, Trash2, Loader2 } from 'lucide-react'
import ActionToast from './ActionToast'

export default function PrescriptionsList() {
  const { data, refreshPrescriptions } = useDashboardData()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [currentRole, setCurrentRole] = useState<'admin' | 'doctor' | 'nurse' | ''>('')
  const [togglingRxId, setTogglingRxId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    type: 'info',
  })

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ open: true, message, type })
    setTimeout(() => {
      setToast((current) => ({ ...current, open: false }))
    }, 2600)
  }

  useEffect(() => {
    const email = localStorage.getItem('user_email') || ''
    const staffMember = data.staff.find((s) => s.email?.toLowerCase() === email.toLowerCase())
    if (staffMember?.role === 'admin' || staffMember?.role === 'doctor' || staffMember?.role === 'nurse') {
      setCurrentRole(staffMember.role)
    } else {
      setCurrentRole('')
    }
    setLoading(false)
  }, [data.staff])

  const getPatientName = (patientId: string) => {
    return data.patients.find((p) => p.id === patientId)?.full_name || 'Unknown'
  }

  const getStaffInfo = (staffId: string) => {
    const staff = data.staff.find((s) => s.id === staffId)
    if (!staff) return { name: 'Unassigned', role: '' }
    let rolePrefix = ''
    if (staff.role === 'doctor') rolePrefix = 'Dr.'
    else if (staff.role === 'nurse') rolePrefix = 'Nurse'
    else rolePrefix = staff.role.charAt(0).toUpperCase() + staff.role.slice(1)
    return { name: staff.full_name, role: rolePrefix }
  }

  const getPatientData = (patientId: string) => {
    return data.patients.find((p) => p.id === patientId)
  }

  const getPrescriptionReason = (patientId: string) => {
    const patient = getPatientData(patientId)
    if (patient?.symptoms?.trim()) {
      return patient.symptoms.trim()
    }

    const latestAppointment = [...data.appointments]
      .filter((appointment) => appointment.patient_id === patientId)
      .sort((a, b) => {
        const aTime = new Date(`${a.appointment_date}T${a.appointment_time || '00:00'}`).getTime()
        const bTime = new Date(`${b.appointment_date}T${b.appointment_time || '00:00'}`).getTime()
        return bTime - aTime
      })[0]

    return latestAppointment?.reason?.trim() || ''
  }

  const handleDeletePrescription = async (prescriptionId: string, patientName: string) => {
    if (!confirm(`Are you sure you want to delete the prescription for ${patientName}? This action cannot be undone.`)) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete prescription')
      }

      showToast('Prescription deleted successfully.', 'success')
      setShowDeleteModal(null)
      refreshPrescriptions()
    } catch (error: any) {
      console.error('Failed to delete prescription:', error)
      showToast(error?.message || 'Failed to delete prescription.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleTogglePrescriptionDone = async (rx: Prescription) => {
    try {
      setTogglingRxId(rx.id)
      const nextCompleted = !rx.is_completed
      await apiClient.updatePrescription(rx.id, { is_completed: nextCompleted })
      await refreshPrescriptions()
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Failed to update prescription status'
      alert(msg)
    } finally {
      setTogglingRxId(null)
    }
  }

  const groupPrescriptionsByPatient = () => {
    const grouped: { [key: string]: Prescription[] } = {}
    data.prescriptions.forEach((rx) => {
      if (!grouped[rx.patient_id]) {
        grouped[rx.patient_id] = []
      }
      grouped[rx.patient_id].push(rx)
    })
    return grouped
  }

  const filteredGroups = () => {
    const grouped = groupPrescriptionsByPatient()
    const filtered: { [key: string]: Prescription[] } = {}
    
    Object.entries(grouped).forEach(([patientId, prescriptions]) => {
      const patientName = getPatientName(patientId).toLowerCase()
      const reasonText = getPrescriptionReason(patientId).toLowerCase()
      const medicationText = prescriptions
        .map((rx) => `${rx.medication_name} ${rx.instructions || ''}`.toLowerCase())
        .join(' ')
      const statusFilteredPrescriptions = prescriptions.filter((rx) => {
        if (statusFilter === 'all') return true
        if (statusFilter === 'done') return rx.is_completed
        return !rx.is_completed
      })

      const query = searchTerm.toLowerCase()

      if (
        patientName.includes(query) ||
        reasonText.includes(query) ||
        medicationText.includes(query)
      ) {
        if (statusFilteredPrescriptions.length > 0) {
          filtered[patientId] = statusFilteredPrescriptions
        }
      }
    })
    
    return filtered
  }

  if (loading) {
    return <div className="text-center py-8">Loading prescriptions...</div>
  }

  const groups = filteredGroups()
  const canToggleDone = currentRole === 'nurse'
  const canCreatePrescription = currentRole === 'doctor'
  const canEditPrescription = currentRole === 'doctor'
  const canDeletePrescription = currentRole === 'doctor'
  const roleMessage =
    currentRole === 'doctor'
      ? 'Doctors can create, update, and remove their own prescriptions.'
      : currentRole === 'nurse'
        ? 'Nurses can review doctor instructions and mark medicine as given to the patient.'
        : 'Admins can monitor prescriptions here, while only doctors can issue them.'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Prescriptions</h2>
          <p className="text-gray-600 text-sm">Track doctor instructions and medication handoff</p>
        </div>
        {canCreatePrescription && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary btn-lg w-full sm:w-auto"
          >
            <Plus size={20} />
            New Prescription
          </button>
        )}
      </div>

      {currentRole && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-700">{roleMessage}</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <PrescriptionForm
            patients={data.patients}
            onSuccess={() => {
              refreshPrescriptions()
              setShowForm(false)
            }}
            onClose={() => setShowForm(false)}
          />
        </div>
      )}

      {editingPrescriptionId && canEditPrescription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <EditPrescriptionForm
            prescription={data.prescriptions.find(r => r.id === editingPrescriptionId)!}
            patients={data.patients}
            onSuccess={() => {
              refreshPrescriptions()
              setEditingPrescriptionId(null)
            }}
            onClose={() => setEditingPrescriptionId(null)}
          />
        </div>
      )}

      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search by patient name, reason, or medicine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Filter:</span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('done')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${statusFilter === 'done' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Done
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {Object.keys(groups).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No prescriptions found</p>
            </div>
          ) : (
            Object.entries(groups).map(([patientId, prescriptions]) => {
              const patient = getPatientData(patientId)
              const firstRx = prescriptions[0]
              const prescriptionReason = getPrescriptionReason(patientId)
              
              return (
                <div key={patientId} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText size={24} className="text-blue-600" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{getPatientName(patientId)}</h3>
                          <p className="text-sm text-gray-600">{getStaffInfo(firstRx.staff_id).role && `${getStaffInfo(firstRx.staff_id).role} `}{getStaffInfo(firstRx.staff_id).name}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 ml-9">
                        {new Date(firstRx.prescribed_date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                      </p>
                      {firstRx.updated_at && (
                        <p className="text-xs text-gray-500 ml-9 mt-1">
                          Last edited {new Date(firstRx.updated_at).toLocaleString()}
                          {firstRx.updated_by && currentRole === 'admin' ? ' by admin' : ''}
                        </p>
                      )}
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Active
                    </span>
                  </div>

                  {prescriptionReason && (
                    <div className="mb-4 ml-9">
                      <p className="text-xs text-gray-600 font-medium">Reason for Prescription:</p>
                      <p className="text-sm text-blue-600 font-medium">{prescriptionReason}</p>
                    </div>
                  )}

                  <div className="ml-9 mb-4">
                    <p className="text-xs text-gray-600 font-medium mb-3">Medications:</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 font-medium text-gray-700">Medicine</th>
                            <th className="text-left py-2 font-medium text-gray-700">Dosage</th>
                            <th className="text-left py-2 font-medium text-gray-700">Frequency</th>
                            <th className="text-left py-2 font-medium text-gray-700">Duration</th>
                            <th className="text-left py-2 font-medium text-gray-700">Date of Expiry</th>
                            <th className="text-left py-2 font-medium text-gray-700">Deadline</th>
                            <th className="text-left py-2 font-medium text-gray-700">Instructions</th>
                            <th className="text-left py-2 font-medium text-gray-700">Status</th>
                            {canToggleDone && <th className="text-left py-2 font-medium text-gray-700">Action</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {prescriptions.map((rx) => {
                            const expiryDate = new Date(rx.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
                            const deadlineDate = rx.prescribed_date ? new Date(new Date(rx.prescribed_date).getTime() + (parseInt(rx.duration) || 1) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'
                            
                            return (
                            <tr key={rx.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2">
                                <p className="text-xs text-gray-600 font-medium">Medicine</p>
                                <p className="text-sm font-medium text-blue-600">{rx.medication_name}</p>
                              </td>
                              <td className="py-2">
                                <p className="text-xs text-gray-600 font-medium">Dosage</p>
                                <p className="text-sm font-medium text-gray-900">{rx.dosage}{rx.unit}</p>
                              </td>
                              <td className="py-2">
                                <p className="text-xs text-gray-600 font-medium">Frequency</p>
                                <p className="text-sm font-medium text-gray-900">{rx.frequency}</p>
                              </td>
                              <td className="py-2">
                                <p className="text-xs text-gray-600 font-medium">Duration</p>
                                <p className="text-sm font-medium text-gray-900">{rx.duration}</p>
                              </td>
                              <td className="py-2">
                                <p className="text-xs text-gray-600 font-medium">Date of Expiry</p>
                                <p className="text-sm font-medium text-gray-900">{expiryDate}</p>
                              </td>
                              <td className="py-2">
                                <p className="text-xs text-gray-600 font-medium">Deadline</p>
                                <p className="text-sm font-medium text-gray-900">{deadlineDate}</p>
                              </td>
                              <td className="py-2">
                                <p className="text-xs text-gray-600 font-medium">Instructions</p>
                                <p className="text-sm font-medium text-gray-900">{rx.instructions || '-'}</p>
                              </td>
                              <td className="py-2">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${rx.is_completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {rx.is_completed ? 'Given' : 'Pending'}
                                </span>
                              </td>
                              {canToggleDone && (
                                <td className="py-2">
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePrescriptionDone(rx)}
                                    disabled={togglingRxId === rx.id}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${rx.is_completed ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-green-600 text-white hover:bg-green-700'} disabled:opacity-50`}
                                  >
                                    {togglingRxId === rx.id ? 'Saving...' : rx.is_completed ? 'Undo' : 'Mark Given'}
                                  </button>
                                </td>
                              )}
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="ml-9 flex flex-wrap gap-2">
                    <button 
                      onClick={() => {
                        const staffInfo = getStaffInfo(firstRx.staff_id)
                        const printContent = `
                          <html>
                            <head>
                              <title>Prescription - ${getPatientName(patientId)}</title>
                              <style>
                                body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 30px; background: white; }
                                .header { text-align: center; border-bottom: 3px solid #1f2937; padding-bottom: 20px; margin-bottom: 30px; display: flex; align-items: center; gap: 20px; justify-content: center; }
                                .logo { height: 80px; width: 80px; border-radius: 8px; object-fit: cover; }
                                .header-text { text-align: left; }
                                .clinic-name { font-size: 28px; font-weight: bold; color: #1f2937; margin: 0; }
                                .clinic-tagline { font-size: 12px; color: #6b7280; margin-top: 5px; }
                                .patient-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e5e7eb; }
                                .detail-row { display: flex; margin: 12px 0; }
                                .detail-label { font-weight: 600; color: #374151; width: 140px; }
                                .detail-value { color: #1f2937; }
                                .prescriptions-section { margin-top: 30px; }
                                .section-title { font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 15px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
                                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
                                th { background-color: #1f2937; color: white; padding: 10px; text-align: left; font-weight: 600; }
                                td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
                                tr:nth-child(even) { background-color: #f9fafb; }
                                .instructions { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin-top: 20px; border-radius: 4px; }
                                .instructions-title { font-weight: bold; color: #1e40af; margin-bottom: 8px; }
                                .instructions-text { font-size: 13px; color: #1e3a8a; line-height: 1.6; }
                                .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <img src="/images/profile.jpg" class="logo" />
                                <div class="header-text">
                                  <div class="clinic-name">Clinic Care Management System</div>
                                </div>
                              </div>
                              
                              <div class="patient-details">
                                <div class="detail-row">
                                  <span class="detail-label">Patient Name:</span>
                                  <span class="detail-value">${getPatientName(patientId)}</span>
                                </div>
                                <div class="detail-row">
                                  <span class="detail-label">Prescribing Staff:</span>
                                  <span class="detail-value">${staffInfo.role && staffInfo.role + ' '}${staffInfo.name}</span>
                                </div>
                                <div class="detail-row">
                                  <span class="detail-label">Prescription Date:</span>
                                  <span class="detail-value">${new Date(firstRx.prescribed_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                                ${patient?.symptoms ? `<div class="detail-row"><span class="detail-label">Diagnosis/Condition:</span><span class="detail-value">${patient.symptoms}</span></div>` : ''}
                              </div>

                              <div class="prescriptions-section">
                                <div class="section-title">📋 Prescribed Medications</div>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Medicine</th>
                                      <th>Dosage</th>
                                      <th>Frequency</th>
                                      <th>Duration</th>
                                      <th>Date of Expiry</th>
                                      <th>Deadline</th>
                                      <th>Description</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${prescriptions.map((rx) => `
                                      <tr>
                                        <td><strong>${rx.medication_name}</strong></td>
                                        <td>${rx.dosage} ${rx.unit}</td>
                                        <td>${rx.frequency}</td>
                                        <td>${rx.duration}</td>
                                        <td>${rx.expiry_date ? new Date(rx.expiry_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A'}</td>
                                        <td>${rx.expiry_date ? new Date(new Date(rx.expiry_date).getTime() + 10*24*60*60*1000).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A'}</td>
                                        <td>${rx.instructions || 'Follow doctor\'s instructions'}</td>
                                      </tr>
                                    `).join('')}
                                  </tbody>
                                </table>
                              </div>

                              <div class="instructions">
                                <div class="instructions-title">⚠️ Important Instructions:</div>
                                <div class="instructions-text">
                                  • Follow the prescribed dosage and frequency exactly as mentioned above<br>
                                  • Do not skip doses without consulting your doctor<br>
                                  • Store medications in a cool, dry place away from children<br>
                                  • If you experience any side effects, contact your healthcare provider immediately<br>
                                  • Do not share this prescription with others
                                </div>
                              </div>

                              <div class="footer">
                                <p>This prescription was generated by ClinicCare Management System on ${new Date().toLocaleDateString()}</p>
                                <p>For questions or concerns, please contact our clinic or visit our website.</p>
                              </div>
                            </body>
                          </html>
                        `
                        const printWindow = window.open('', '', 'height=600,width=800')
                        printWindow?.document.write(printContent)
                        printWindow?.document.close()
                        printWindow?.print()
                      }}
                      className="px-2 sm:px-4 py-2 text-blue-600 font-medium hover:text-blue-800 transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                    >
                      <Printer size={16} />
                      <span>Print</span>
                    </button>
                    {canEditPrescription && (
                      <button 
                        onClick={() => setEditingPrescriptionId(prescriptions[0].id)}
                        className="px-2 sm:px-4 py-2 text-blue-600 font-medium hover:text-blue-800 transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                      >
                        <Edit2 size={16} />
                        <span>Edit</span>
                      </button>
                    )}
                    {canDeletePrescription && (
                      <button 
                        onClick={() => setShowDeleteModal(prescriptions[0].id)}
                        className="px-2 sm:px-4 py-2 text-red-600 font-medium hover:text-red-800 transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {showDeleteModal && canDeletePrescription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Prescription</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this prescription? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const prescription = data.prescriptions.find(p => p.id === showDeleteModal)
                  if (prescription) {
                    handleDeletePrescription(prescription.id, getPatientName(prescription.patient_id))
                  }
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Deleting...
                  </span>
                ) : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ActionToast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
      />
    </div>
  )
}

function PrescriptionForm({
  patients,
  onSuccess,
  onClose,
}: {
  patients: Patient[]
  onSuccess: () => void
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    patient_id: '',
    staff_id: '',
    medication_name: '',
    dosage: '',
    unit: 'mg',
    frequency: '',
    duration: '',
    instructions: '',
    refills: '0',
    prescribed_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
  })

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    if (!formData.patient_id) {
      alert('Please select a patient')
      setLoading(false)
      return
    }
    if (!formData.medication_name) {
      alert('Please enter medication name')
      setLoading(false)
      return
    }
    if (!formData.dosage) {
      alert('Please enter dosage')
      setLoading(false)
      return
    }
    if (!formData.frequency) {
      alert('Please enter frequency')
      setLoading(false)
      return
    }
    if (!formData.duration) {
      alert('Please enter duration')
      setLoading(false)
      return
    }
    if (!formData.expiry_date) {
      alert('Please select expiry date')
      setLoading(false)
      return
    }

    try {
      await apiClient.createPrescription({
        patient_id: formData.patient_id,
        medication_name: formData.medication_name,
        dosage: formData.dosage,
        unit: formData.unit,
        frequency: formData.frequency,
        duration: formData.duration,
        instructions: formData.instructions || 'No special instructions',
        refills: parseInt(formData.refills) || 0,
        prescribed_date: formData.prescribed_date,
        expiry_date: formData.expiry_date,
      })
      onSuccess()
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create prescription'
      console.error('Failed to create prescription:', error)
      alert(`Error: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">New Prescription</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          ×
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
          <select
            name="patient_id"
            value={formData.patient_id}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white hover:border-gray-400 transition"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Medication</label>
          <input
            type="text"
            name="medication_name"
            placeholder="e.g., Aspirin"
            value={formData.medication_name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-500 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dosage</label>
          <input
            type="text"
            name="dosage"
            placeholder="e.g., 500"
            value={formData.dosage}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-500 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
          <select
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white hover:border-gray-400 transition"
          >
            <option value="mg">mg (milligrams)</option>
            <option value="ml">ml (milliliters)</option>
            <option value="g">g (grams)</option>
            <option value="mcg">mcg (micrograms)</option>
            <option value="IU">IU (International Units)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
          <input
            type="text"
            name="frequency"
            placeholder="e.g., Twice daily"
            value={formData.frequency}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-500 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
          <input
            type="text"
            name="duration"
            placeholder="e.g., 7 days"
            value={formData.duration}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-500 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Refills</label>
          <input
            type="number"
            name="refills"
            placeholder="e.g., 3"
            value={formData.refills}
            onChange={handleChange}
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-500 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
          <input
            type="date"
            name="expiry_date"
            value={formData.expiry_date}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white transition"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
          <textarea
            name="instructions"
            placeholder="e.g., Take with food, avoid dairy products"
            value={formData.instructions}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-500 transition"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Prescribed Date</label>
          <input
            type="date"
            name="prescribed_date"
            value={formData.prescribed_date}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Create Prescription'}
        </button>
      </div>
      </form>
    </div>
  )
}

function EditPrescriptionForm({
  prescription,
  patients,
  onSuccess,
  onClose,
}: {
  prescription: Prescription
  patients: Patient[]
  onSuccess: () => void
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    medication_name: prescription.medication_name,
    dosage: prescription.dosage,
    unit: prescription.unit,
    frequency: prescription.frequency,
    duration: prescription.duration,
    instructions: prescription.instructions,
    refills: prescription.refills.toString(),
    prescribed_date: prescription.prescribed_date,
    expiry_date: prescription.expiry_date,
  })

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      await apiClient.updatePrescription(prescription.id, {
        medication_name: formData.medication_name,
        dosage: formData.dosage,
        unit: formData.unit,
        frequency: formData.frequency,
        duration: formData.duration,
        instructions: formData.instructions,
        refills: parseInt(formData.refills) || 0,
        prescribed_date: formData.prescribed_date,
        expiry_date: formData.expiry_date,
      })
      onSuccess()
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to update prescription'
      console.error('Failed to update prescription:', error)
      alert(`Error: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Edit Prescription</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medication Name</label>
            <input
              type="text"
              name="medication_name"
              placeholder="e.g., Aspirin"
              value={formData.medication_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dosage</label>
            <input
              type="text"
              name="dosage"
              placeholder="e.g., 500"
              value={formData.dosage}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="mg">mg (milligrams)</option>
              <option value="ml">ml (milliliters)</option>
              <option value="g">g (grams)</option>
              <option value="mcg">mcg (micrograms)</option>
              <option value="IU">IU (International Units)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
            <input
              type="text"
              name="frequency"
              placeholder="e.g., Twice daily"
              value={formData.frequency}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
            <input
              type="text"
              name="duration"
              placeholder="e.g., 7 days"
              value={formData.duration}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Refills</label>
            <input
              type="number"
              name="refills"
              placeholder="e.g., 3"
              value={formData.refills}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prescribed Date</label>
            <input
              type="date"
              name="prescribed_date"
              value={formData.prescribed_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
            <input
              type="date"
              name="expiry_date"
              value={formData.expiry_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
            <textarea
              name="instructions"
              placeholder="e.g., Take with food, avoid dairy products"
              value={formData.instructions}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
