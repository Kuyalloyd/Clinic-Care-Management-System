'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/apiClient'
import { useDashboardData } from '@/lib/DataContext'
import { DutyAssignment, Patient, Prescription, Staff } from '@/lib/types'
import { Plus, Eye, Edit2, Trash2, Loader2, Mail, Pill, Printer } from 'lucide-react'
import ActionToast from './ActionToast'
import EmailModal from './EmailModal'

function toDateKey(value: string | Date) {
  if (typeof value === 'string') {
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (dateOnlyMatch) {
      return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`
    }
  }

  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getRecommendedDoctorState(staff: Staff[], dutyAssignments: DutyAssignment[]) {
  const allDoctors = staff.filter((member) => member.role === 'doctor')
  const todayDateKey = toDateKey(new Date())
  const todayDutyDoctorIds = new Set(
    dutyAssignments
      .filter((assignment) => toDateKey(assignment.duty_date) === todayDateKey)
      .map((assignment) => assignment.staff_id)
  )

  const dutyDoctors = allDoctors.filter((doctor) =>
    todayDutyDoctorIds.size > 0 ? todayDutyDoctorIds.has(doctor.id) : !!doctor.is_on_duty
  )

  return {
    doctorOptions: dutyDoctors.length > 0 ? dutyDoctors : allDoctors,
    hasDutyDoctors: dutyDoctors.length > 0,
  }
}

type PatientsListProps = {
  initialShowForm?: boolean
  nurseViewMode?: 'intake' | 'records'
}

export default function PatientsList({
  initialShowForm = false,
  nurseViewMode,
}: PatientsListProps) {
  const { data, refreshPatients } = useDashboardData()
  const [loading, setLoading] = useState(true)
  const [currentRole, setCurrentRole] = useState<'admin' | 'doctor' | 'nurse' | null>(null)
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(initialShowForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [deletingPatientId, setDeletingPatientId] = useState<string | null>(null)
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
    const loadPatients = async () => {
      setLoading(true)
      await refreshPatients()
      setLoading(false)
    }

    loadPatients()
  }, [refreshPatients])

  useEffect(() => {
    const storedRole = localStorage.getItem('user_role')
    const userEmail = (localStorage.getItem('user_email') || '').toLowerCase()
    const userId = localStorage.getItem('user_id') || ''

    const member = data.staff.find(
      (staffMember) => staffMember.id === userId || staffMember.email?.toLowerCase() === userEmail
    )

    if (member?.role && member.role !== 'receptionist') {
      setCurrentRole(member.role)
      setCurrentStaffId(member.id)
      return
    }

    if (storedRole === 'admin' || storedRole === 'doctor' || storedRole === 'nurse') {
      setCurrentRole(storedRole)
      setCurrentStaffId(userId || null)
      return
    }

    setCurrentRole(null)
    setCurrentStaffId(null)
  }, [data.staff])

  useEffect(() => {
    setShowForm(initialShowForm)
  }, [initialShowForm])

  const canCreatePatients = currentRole === 'admin' || currentRole === 'nurse' || currentRole === 'doctor'
  const canEditPatients = currentRole === 'admin' || currentRole === 'nurse' || currentRole === 'doctor'
  const canDeletePatients = currentRole === 'admin'

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return '-'
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this patient?')) {
      try {
        setDeletingPatientId(id)
        await apiClient.deletePatient(id)
        await refreshPatients()
        showToast('Patient deleted successfully.', 'success')
      } catch (error: any) {
        console.error('Failed to delete patient:', error)
        const msg = error?.response?.data?.error || error?.message || 'Failed to delete patient'
        showToast(msg, 'error')
      } finally {
        setDeletingPatientId(null)
      }
    }
  }

  const handleView = (id: string) => {
    setViewingId(id)
  }

  const handleEdit = (id: string) => {
    const patientToEdit = data.patients.find(p => p.id === id)
    if (patientToEdit) {
      setEditingPatient(patientToEdit)
      setEditingId(id)
    }
  }

  const getStaffName = (staffId?: string | null) => {
    if (!staffId) return '-'
    const staffMember = data.staff.find((member) => member.id === staffId)
    if (!staffMember) return 'Unknown staff'

    if (staffMember.role === 'doctor') {
      return `Dr. ${staffMember.full_name}${staffMember.specialty ? ` (${staffMember.specialty})` : ''}`
    }

    if (staffMember.role === 'nurse') {
      return `Nurse ${staffMember.full_name}`
    }

    return staffMember.full_name
  }

  const showRecordedByColumn = currentRole !== 'nurse'
  const recordedByColumnLabel = currentRole === 'doctor' ? 'INTAKE BY' : 'RECORDED BY'
  const isNurseIntakeView = currentRole === 'nurse' && nurseViewMode === 'intake'
  const { doctorOptions: intakeDoctorOptions, hasDutyDoctors } = getRecommendedDoctorState(data.staff, data.dutyAssignments)
  const nurseTitle =
    nurseViewMode === 'intake'
      ? 'Register New Patient'
      : nurseViewMode === 'records'
        ? 'All Patient Records'
        : 'Patient Intake & Records'
  const nurseDescription =
    nurseViewMode === 'intake'
      ? 'Add the patient details, nurse notes, and doctor recommendation for this handoff.'
      : nurseViewMode === 'records'
        ? 'Review all patient records, update nurse notes, and change doctor recommendations when needed.'
        : 'Add patients, review all records, write nurse notes, and recommend the right doctor.'
  const createButtonLabel =
    currentRole === 'nurse' && nurseViewMode === 'records' ? 'Add Patient' : 'Add Patient'

  const visiblePatients = currentRole === 'doctor' && currentStaffId
    ? data.patients.filter((patient) => patient.recommended_doctor_id === currentStaffId)
    : data.patients

  const filteredPatients = visiblePatients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.includes(searchTerm) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const recentIntakePatients = [...visiblePatients]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 6)

  if (loading) {
    return <div className="text-center py-8">Loading patients...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {currentRole === 'nurse' ? nurseTitle : currentRole === 'doctor' ? 'Recommended Patient Charts' : 'Patient Records'}
          </h2>
          <p className="text-gray-600 text-sm">
            {currentRole === 'nurse'
              ? nurseDescription
              : currentRole === 'doctor'
                ? 'Review, add, and update the patients recommended to you, including intake notes and nurse handoff details.'
                : 'Manage patient details, intake notes, and doctor recommendations'}
          </p>
        </div>
        {canCreatePatients && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary btn-lg w-full sm:w-auto"
          >
            <Plus size={20} />
            {createButtonLabel}
          </button>
        )}
      </div>

      {!canCreatePatients && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            {currentRole === 'doctor'
              ? 'You can review the patients recommended to you, see who recorded the intake, email the patient, and manage prescriptions from patient details.'
              : 'You can view patients, but only admin or nurse can add and update patient records.'}
          </p>
        </div>
      )}

      {currentRole === 'nurse' && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
          <p className="text-sm text-cyan-800">
            {nurseViewMode === 'intake'
              ? 'Use this section to register a new patient and send that case to the right doctor.'
              : nurseViewMode === 'records'
                ? 'Review existing records here and update the doctor recommendation if the patient needs a different doctor.'
                : 'Nurses can add patients, review all patient records, record nurse notes, recommend a doctor, and update the patient record if the doctor recommendation changes.'}
          </p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <PatientForm
            onSuccess={async () => {
              await refreshPatients()
              setShowForm(false)
              showToast('Patient saved successfully.', 'success')
            }}
            onClose={() => setShowForm(false)}
          />
        </div>
      )}

      {viewingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <PatientViewModal
            patientId={viewingId}
            currentRole={currentRole}
            onClose={() => setViewingId(null)}
          />
        </div>
      )}

      {editingId && editingPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <PatientEditForm
            patient={editingPatient}
            onSuccess={async () => {
              await refreshPatients()
              setEditingId(null)
              setEditingPatient(null)
              showToast('Patient updated successfully.', 'success')
            }}
            onClose={() => { setEditingId(null); setEditingPatient(null) }}
          />
        </div>
      )}

      {isNurseIntakeView ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_320px]">
            <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Quick Intake</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">Quick Handoff</h3>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Use this page when a nurse is registering a fresh patient concern and recommending which doctor should receive the case.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  <Plus size={18} />
                  Open Patient Form
                </button>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/70 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patients in system</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{visiblePatients.length}</p>
                  <p className="mt-1 text-sm text-slate-500">All saved patient charts remain in the records tab.</p>
                </div>
                <div className="rounded-xl border border-white/70 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Doctors available</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{intakeDoctorOptions.length}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {hasDutyDoctors ? 'Doctors on duty are ready for recommendation today.' : 'Showing all doctors because no duty schedule is recorded for today yet.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Doctors For Handoff</h3>
              <p className="mt-1 text-sm text-slate-500">
                Recommend one of these doctors when you create the intake.
              </p>
              <div className="mt-4 space-y-3">
                {intakeDoctorOptions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No doctors are available yet.
                  </div>
                ) : (
                  intakeDoctorOptions.slice(0, 5).map((doctor) => (
                    <div key={doctor.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">Dr. {doctor.full_name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {doctor.specialty || 'General practice'}
                        {doctor.is_on_duty ? ' • On duty' : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Recent Intakes</h3>
                <p className="text-sm text-slate-500">Latest patient handoffs for quick follow-up.</p>
              </div>
              <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {recentIntakePatients.length} shown
              </span>
            </div>

            {recentIntakePatients.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No intake records yet.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {recentIntakePatients.map((patient) => (
                  <div key={patient.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{patient.full_name}</p>
                      <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                        {patient.symptoms || patient.intake_notes || 'No concern added yet.'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>Doctor: {getStaffName(patient.recommended_doctor_id)}</span>
                        <span>Created: {new Date(patient.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(patient.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Eye size={18} />
                      </button>
                      {canEditPatients && (
                        <button
                          onClick={() => handleEdit(patient.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <input
              type="text"
              placeholder={currentRole === 'doctor' ? 'Search recommended patients by name, phone, or email...' : 'Search patients by name, phone, or email...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">NAME</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">AGE</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">GENDER</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">PHONE</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">EMAIL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">PATIENT CONCERN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">RECOMMENDED DOCTOR</th>
                  {showRecordedByColumn && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">{recordedByColumnLabel}</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">CREATED</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={showRecordedByColumn ? 10 : 9} className="px-6 py-8 text-center text-gray-500">
                      No patients found
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{patient.full_name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{calculateAge(patient.date_of_birth)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{patient.phone || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{patient.email || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 line-clamp-2">
                          {patient.symptoms || patient.intake_notes || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{getStaffName(patient.recommended_doctor_id)}</span>
                      </td>
                      {showRecordedByColumn && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{getStaffName(patient.created_by_staff_id)}</span>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {new Date(patient.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(patient.id)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                          >
                            <Eye size={18} />
                          </button>
                          {canEditPatients && (
                            <button
                              onClick={() => handleEdit(patient.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                            >
                              <Edit2 size={18} />
                            </button>
                          )}
                          {canDeletePatients && (
                            <button
                              onClick={() => handleDelete(patient.id)}
                              disabled={deletingPatientId === patient.id}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                            >
                              {deletingPatientId === patient.id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <Trash2 size={18} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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

function PatientForm({ onSuccess, onClose }: { onSuccess: () => void | Promise<void>; onClose: () => void }) {
  const { data } = useDashboardData()
  const [loading, setLoading] = useState(false)
  const { doctorOptions, hasDutyDoctors } = getRecommendedDoctorState(data.staff, data.dutyAssignments)
  const [currentRole, setCurrentRole] = useState<'admin' | 'doctor' | 'nurse' | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: 'M',
    address: '',
    city: '',
    region: '',
    zip_code: '',
    symptoms: '',
    intake_notes: '',
    recommended_doctor_id: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  })

  useEffect(() => {
    const storedRole = localStorage.getItem('user_role')
    if (storedRole === 'admin' || storedRole === 'doctor' || storedRole === 'nurse') {
      setCurrentRole(storedRole)
      return
    }

    setCurrentRole(null)
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const requiresDoctorRecommendation = currentRole === 'doctor' || currentRole === 'nurse'
      if (requiresDoctorRecommendation && !formData.recommended_doctor_id) {
        alert(currentRole === 'doctor' ? 'Please assign a doctor for this patient.' : 'Please recommend a doctor for this patient.')
        setLoading(false)
        return
      }

      const dataToSend = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        address: formData.address,
        city: formData.city,
        region: formData.region,
        zip_code: formData.zip_code,
        symptoms: formData.symptoms,
        intake_notes: formData.intake_notes,
        recommended_doctor_id: formData.recommended_doctor_id,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
      }
      await apiClient.createPatient(dataToSend)
      await onSuccess()
    } catch (error: any) {
      console.error('Failed to create patient:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred'
      alert(`Failed to save patient: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">Add New Patient</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Birthdate</label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              min="1990-01-01"
              max="2020-12-31"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
            <input
              type="text"
              name="region"
              value={formData.region}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
            <input
              type="text"
              name="zip_code"
              value={formData.zip_code}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Patient Concern / Symptoms</label>
            <textarea
              name="symptoms"
              value={formData.symptoms}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              rows={3}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Nurse Intake Notes</label>
            <textarea
              name="intake_notes"
              value={formData.intake_notes}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              rows={3}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recommend Doctor
            </label>
            <select
              name="recommended_doctor_id"
              value={formData.recommended_doctor_id}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="">{doctorOptions.length === 0 ? 'No doctors available' : 'Select doctor'}</option>
              {doctorOptions.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.full_name}{doctor.specialty ? ` - ${doctor.specialty}` : ''}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">
              {hasDutyDoctors
                ? 'These doctors are available on duty today.'
                : 'No duty record for today yet, so all doctors are listed.'}
            </p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
              <input
                type="text"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
              <input
                type="tel"
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Patient'}
          </button>
        </div>
      </form>
    </div>
  )
}

function PatientViewModal({
  patientId,
  currentRole,
  onClose,
}: {
  patientId: string
  currentRole: 'admin' | 'doctor' | 'nurse' | null
  onClose: () => void
}) {
  const { data, refreshPrescriptions } = useDashboardData()
  const patient = data.patients.find((p) => p.id === patientId)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false)

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return '-'
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const getStaffInfo = (staffId: string) => data.staff.find((member) => member.id === staffId)

  const patientPrescriptions = data.prescriptions
    .filter((prescription) => prescription.patient_id === patientId)
    .sort(
      (a, b) =>
        new Date(b.prescribed_date || b.created_at).getTime() -
        new Date(a.prescribed_date || a.created_at).getTime()
    )

  const doctorCanManagePrescriptions = currentRole === 'doctor'
  const canEmailPatient = currentRole === 'doctor' && !!patient?.email
  const canPrintPrescriptions = currentRole === 'doctor' && patientPrescriptions.length > 0
  const recommendedDoctor = patient?.recommended_doctor_id ? getStaffInfo(patient.recommended_doctor_id) : null
  const addedByStaff = patient?.created_by_staff_id ? getStaffInfo(patient.created_by_staff_id) : null
  const updatedByStaff = patient?.updated_by_staff_id ? getStaffInfo(patient.updated_by_staff_id) : null
  const formatStaffLabel = (
    staff?: { full_name?: string; role?: string; specialty?: string } | null
  ) => {
    if (!staff?.full_name) return '-'

    if (staff.role === 'doctor') {
      return `Dr. ${staff.full_name}${staff.specialty ? ` (${staff.specialty})` : ''}`
    }

    if (staff.role === 'nurse') {
      return `Nurse ${staff.full_name}`
    }

    return staff.full_name
  }

  const handlePrintPrescriptions = () => {
    if (!patient || patientPrescriptions.length === 0) return

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) {
      alert('Please allow pop-ups to print prescriptions.')
      return
    }

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;')

    const rows = patientPrescriptions
      .map((prescription) => {
        const prescriber = getStaffInfo(prescription.staff_id)
        const instructions = escapeHtml(
          prescription.instructions || 'No special instructions'
        ).replace(/\n/g, '<br />')

        return `
          <section class="prescription-card">
            <div class="prescription-head">
              <div>
                <h2>${escapeHtml(prescription.medication_name)}</h2>
                <p>${escapeHtml(prescription.dosage)} ${escapeHtml(prescription.unit)} | ${escapeHtml(prescription.frequency)}</p>
              </div>
              <span class="status ${prescription.is_completed ? 'done' : 'active'}">
                ${prescription.is_completed ? 'Given' : 'Active'}
              </span>
            </div>
            <div class="details-grid">
              <div><strong>Duration:</strong> ${escapeHtml(prescription.duration)}</div>
              <div><strong>Refills:</strong> ${prescription.refills}</div>
              <div><strong>Prescribed:</strong> ${new Date(prescription.prescribed_date).toLocaleDateString()}</div>
              <div><strong>Expiry:</strong> ${new Date(prescription.expiry_date).toLocaleDateString()}</div>
              <div><strong>Prescriber:</strong> ${escapeHtml(prescriber?.full_name || 'Clinic doctor')}</div>
            </div>
            <div class="instructions">
              <strong>Instructions:</strong>
              <p>${instructions}</p>
            </div>
          </section>
        `
      })
      .join('')

    printWindow.document.open()
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Patient Prescriptions - ${escapeHtml(patient.full_name)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #0f172a;
              margin: 32px;
            }
            h1 {
              margin-bottom: 6px;
            }
            .meta {
              color: #475569;
              margin-bottom: 20px;
            }
            .prescription-card {
              border: 1px solid #cbd5e1;
              border-radius: 16px;
              padding: 18px;
              margin-bottom: 16px;
              break-inside: avoid;
            }
            .prescription-head {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              align-items: flex-start;
              margin-bottom: 12px;
            }
            .prescription-head h2 {
              margin: 0 0 4px;
              font-size: 20px;
            }
            .prescription-head p {
              margin: 0;
              color: #475569;
            }
            .details-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 8px 16px;
              margin-bottom: 12px;
            }
            .instructions p {
              margin: 6px 0 0;
              color: #1e293b;
            }
            .status {
              display: inline-block;
              padding: 6px 10px;
              border-radius: 999px;
              font-size: 12px;
              font-weight: 700;
            }
            .status.active {
              background: #dcfce7;
              color: #166534;
            }
            .status.done {
              background: #dbeafe;
              color: #1d4ed8;
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(patient.full_name)} Prescriptions</h1>
          <p class="meta">
            Printed on ${new Date().toLocaleString()}<br />
            Patient email: ${escapeHtml(patient.email || '-')}<br />
            Patient phone: ${escapeHtml(patient.phone || '-')}
          </p>
          ${rows}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  if (!patient) return null

  return (
    <>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Patient Details</h2>
            <p className="text-sm text-gray-500">
              Review patient information and current prescriptions.
            </p>
          </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <p className="text-gray-900">{patient.full_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900">{patient.email || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <p className="text-gray-900">{patient.phone || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
            <p className="text-gray-900">
              {patient.date_of_birth
                ? `${new Date(patient.date_of_birth).toLocaleDateString()} (Age: ${calculateAge(patient.date_of_birth)})`
                : '-'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <p className="text-gray-900">{patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <p className="text-gray-900">{patient.city || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
            <p className="text-gray-900">{patient.region || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <p className="text-gray-900">{patient.address || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
            <p className="text-gray-900">{patient.zip_code || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient Concern / Symptoms</label>
            <p className="text-gray-900">{patient.symptoms || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nurse Intake Notes</label>
            <p className="text-gray-900 whitespace-pre-line">{patient.intake_notes || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recommended Doctor</label>
            <p className="text-gray-900">
              {formatStaffLabel(recommendedDoctor)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intake Recorded By</label>
            <p className="text-gray-900">{formatStaffLabel(addedByStaff)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated By</label>
            <p className="text-gray-900">{formatStaffLabel(updatedByStaff)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
            <p className="text-gray-900">{new Date(patient.created_at).toLocaleString()}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <p className="text-gray-900">{patient.emergency_contact_name || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <p className="text-gray-900">{patient.emergency_contact_phone || '-'}</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Prescriptions</h3>
              <p className="text-sm text-gray-500">
                {doctorCanManagePrescriptions
                  ? 'Send an update, create a new prescription, or print this patient prescription list.'
                  : 'Review the current prescriptions assigned to this patient.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEmailPatient && (
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50"
                >
                  <Mail size={16} />
                  Email Patient
                </button>
              )}
              {doctorCanManagePrescriptions && (
                <button
                  onClick={() => setShowPrescriptionForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Pill size={16} />
                  Add Prescription
                </button>
              )}
              {canPrintPrescriptions && (
                <button
                  onClick={handlePrintPrescriptions}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <Printer size={16} />
                  Print
                </button>
              )}
            </div>
          </div>

          {patientPrescriptions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
              No prescriptions have been added for this patient yet.
            </div>
          ) : (
            <div className="space-y-3">
              {patientPrescriptions.map((prescription) => {
                const prescriber = getStaffInfo(prescription.staff_id)
                return (
                  <div
                    key={prescription.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">
                          {prescription.medication_name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {prescription.dosage} {prescription.unit} | {prescription.frequency} |{' '}
                          {prescription.duration}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          prescription.is_completed
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {prescription.is_completed ? 'Given' : 'Active'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                      <p>
                        <span className="font-medium text-gray-800">Prescribed:</span>{' '}
                        {new Date(prescription.prescribed_date).toLocaleDateString()}
                      </p>
                      <p>
                        <span className="font-medium text-gray-800">Expiry:</span>{' '}
                        {new Date(prescription.expiry_date).toLocaleDateString()}
                      </p>
                      <p>
                        <span className="font-medium text-gray-800">Refills:</span>{' '}
                        {prescription.refills}
                      </p>
                      <p>
                        <span className="font-medium text-gray-800">Doctor:</span>{' '}
                        {prescriber?.full_name || 'Clinic doctor'}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Instructions
                      </p>
                      <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                        {prescription.instructions || 'No special instructions'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>

      </div>

      {showEmailModal && patient.email && (
        <EmailModal
          patientEmail={patient.email}
          patientName={patient.full_name}
          title="Email Patient"
          initialSubject={`Clinic Care Update for ${patient.full_name}`}
          initialMessage={`Hello ${patient.full_name},\n\nThis is an update from your doctor at Clinic Care.\n\nPlease review your current treatment plan and contact the clinic if you have questions.\n\nThank you.`}
          successMessage={`Email sent to ${patient.email}`}
          onClose={() => setShowEmailModal(false)}
          onSend={async (subject, message) => {
            await apiClient.sendEmail({
              to: patient.email,
              subject,
              htmlContent: message.replace(/\n/g, '<br />'),
              textContent: message,
            })
          }}
        />
      )}

      {showPrescriptionForm && doctorCanManagePrescriptions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <PatientPrescriptionForm
            patient={patient}
            onSuccess={async () => {
              await refreshPrescriptions()
              setShowPrescriptionForm(false)
            }}
            onClose={() => setShowPrescriptionForm(false)}
          />
        </div>
      )}
    </>
  )
}

function PatientPrescriptionForm({
  patient,
  onSuccess,
  onClose,
}: {
  patient: Patient
  onSuccess: () => void | Promise<void>
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    medication_name: '',
    dosage: '',
    unit: 'mg' as Prescription['unit'],
    frequency: '',
    duration: '',
    instructions: '',
    refills: '0',
    prescribed_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

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
        patient_id: patient.id,
        medication_name: formData.medication_name,
        dosage: formData.dosage,
        unit: formData.unit,
        frequency: formData.frequency,
        duration: formData.duration,
        instructions: formData.instructions || 'No special instructions',
        refills: parseInt(formData.refills, 10) || 0,
        prescribed_date: formData.prescribed_date,
        expiry_date: formData.expiry_date,
      })
      await onSuccess()
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error || error.message || 'Failed to create prescription'
      console.error('Failed to create prescription:', error)
      alert(`Error: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">New Prescription</h2>
          <p className="text-sm text-gray-500 mt-1">Patient: {patient.full_name}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          Ã—
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-900">
            Prescription will be saved to {patient.full_name}.
          </p>
          <p className="text-sm text-green-700">
            {patient.email || patient.phone || 'No contact details available'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              placeholder="e.g., 1"
              value={formData.refills}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-500 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prescribed Date</label>
            <input
              type="date"
              name="prescribed_date"
              value={formData.prescribed_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white transition"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Instructions
            </label>
            <textarea
              name="instructions"
              placeholder="e.g., Take with food, avoid dairy products"
              value={formData.instructions}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-500 transition"
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
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

function PatientEditForm({ patient, onSuccess, onClose }: { patient: Patient; onSuccess: () => void | Promise<void>; onClose: () => void }) {
  const { data } = useDashboardData()
  const [loading, setLoading] = useState(false)
  const { doctorOptions, hasDutyDoctors } = getRecommendedDoctorState(data.staff, data.dutyAssignments)
  const [currentRole, setCurrentRole] = useState<'admin' | 'doctor' | 'nurse' | null>(null)
  const [formData, setFormData] = useState({
    full_name: patient.full_name,
    email: patient.email || '',
    phone: patient.phone || '',
    date_of_birth: patient.date_of_birth || '',
    gender: patient.gender || 'M',
    address: patient.address || '',
    city: patient.city || '',
    region: patient.region || '',
    zip_code: patient.zip_code || '',
    symptoms: patient.symptoms || '',
    intake_notes: patient.intake_notes || '',
    recommended_doctor_id: patient.recommended_doctor_id || '',
    emergency_contact_name: patient.emergency_contact_name || '',
    emergency_contact_phone: patient.emergency_contact_phone || '',
  })

  useEffect(() => {
    const storedRole = localStorage.getItem('user_role')
    if (storedRole === 'admin' || storedRole === 'doctor' || storedRole === 'nurse') {
      setCurrentRole(storedRole)
      return
    }

    setCurrentRole(null)
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const requiresDoctorRecommendation = currentRole === 'doctor' || currentRole === 'nurse'
      if (requiresDoctorRecommendation && !formData.recommended_doctor_id) {
        alert(currentRole === 'doctor' ? 'Please assign a doctor for this patient.' : 'Please recommend a doctor for this patient.')
        setLoading(false)
        return
      }

      const dataToSend = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        address: formData.address,
        city: formData.city,
        region: formData.region,
        zip_code: formData.zip_code,
        symptoms: formData.symptoms,
        intake_notes: formData.intake_notes,
        recommended_doctor_id: formData.recommended_doctor_id,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
      }
      await apiClient.updatePatient(patient.id, dataToSend)
      await onSuccess()
    } catch (error: any) {
      console.error('Failed to update patient:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred'
      alert(`Failed to update patient: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">Edit Patient</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Birthdate</label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              min="1990-01-01"
              max="2020-12-31"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
            <input
              type="text"
              name="region"
              value={formData.region}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
            <input
              type="text"
              name="zip_code"
              value={formData.zip_code}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Patient Concern / Symptoms</label>
            <textarea
              name="symptoms"
              value={formData.symptoms}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              rows={3}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Nurse Intake Notes</label>
            <textarea
              name="intake_notes"
              value={formData.intake_notes}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              rows={3}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Recommend Doctor</label>
            <select
              name="recommended_doctor_id"
              value={formData.recommended_doctor_id}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="">{doctorOptions.length === 0 ? 'No doctors available' : 'Select doctor'}</option>
              {doctorOptions.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.full_name}{doctor.specialty ? ` - ${doctor.specialty}` : ''}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">
              {hasDutyDoctors
                ? 'Doctors on duty today are listed here for the nurse handoff.'
                : 'No duty record for today yet, so all doctors are listed.'}
            </p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
              <input
                type="text"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
              <input
                type="tel"
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Update Patient'}
          </button>
        </div>
      </form>
    </div>
  )
}
