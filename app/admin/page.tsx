'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Menu, Home, Users, Calendar, Pill, Package, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useDashboardData } from '@/lib/DataContext'
import { apiClient } from '@/lib/apiClient'
import { formatMedicineAmount } from '@/lib/medicine'
import StaffList from '@/components/StaffList'
import PrescriptionsList from '@/components/PrescriptionsList'
import MedicinesList from '@/components/MedicinesList'
import BrandLoadingOverlay from '@/components/BrandLoadingOverlay'
import PanelProfileMenu from '@/components/PanelProfileMenu'

type AdminTab = 'dashboard' | 'duty' | 'patients' | 'appointments' | 'prescriptions' | 'medicines' | 'staff'

const adminTabMeta: Record<AdminTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Clinic overview, activity, and quick signals.',
  },
  duty: {
    title: 'Duty Schedule',
    subtitle: 'Coverage, assignments, and on-duty staff at a glance.',
  },
  patients: {
    title: 'Patients',
    subtitle: 'Patient records, intake notes, and doctor recommendations.',
  },
  appointments: {
    title: 'Appointments',
    subtitle: 'Assigned staff, patient schedule, and appointment status.',
  },
  prescriptions: {
    title: 'Prescriptions',
    subtitle: 'Medication orders, assigned staff, and care instructions.',
  },
  medicines: {
    title: 'Medicine Inventory',
    subtitle: 'Stock levels, reorder limits, and expiry tracking.',
  },
  staff: {
    title: 'Doctors & Staff',
    subtitle: 'Team accounts, roles, and clinic workforce details.',
  },
}

export default function AdminPage() {
  const router = useRouter()
  const { data, refreshAll, refreshDutyAssignments } = useDashboardData()
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSavingDutyAssignments, setIsSavingDutyAssignments] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [selectedDutyStaffIds, setSelectedDutyStaffIds] = useState<string[]>([])
  const [dutySaveMessage, setDutySaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedDutyDate, setSelectedDutyDate] = useState<string>(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  })
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const currentUserId = localStorage.getItem('user_id') || ''
    const currentUserEmail = localStorage.getItem('user_email') || ''
    const storedRole = localStorage.getItem('user_role')

    if (!token) {
      router.push('/login')
      return
    }

    if (storedRole && storedRole !== 'admin') {
      router.replace('/dashboard')
      return
    }

    setUserId(currentUserId)
    setUserEmail(currentUserEmail)
    setActiveTab('dashboard')
    setLoading(false)
    refreshAll()

    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [refreshAll, router])

  const currentUser = data.staff.find(
    (member) => member.id === userId || member.email?.toLowerCase() === userEmail.toLowerCase()
  )
  const currentAdminSection = adminTabMeta[activeTab]

  useEffect(() => {
    if (!currentUser) return

    localStorage.setItem('user_role', currentUser.role)
    if (currentUser.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [currentUser, router])

  const confirmLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    setShowLogoutConfirm(false)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_role')

    try {
      await apiClient.logout()
    } catch {
      // Ignore API logout errors and still clear local session.
    } finally {
      router.push('/login')
    }
  }

  const toDateKey = (value: string | Date) => {
    if (typeof value === 'string') {
      const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (dateOnlyMatch) {
        return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`
      }
    }

    const date = new Date(value)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const dateKeyToLabel = (dateKey: string) => {
    const parts = dateKey.split('-').map(Number)
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      return dateKey
    }

    const localDate = new Date(parts[0], parts[1] - 1, parts[2])
    return localDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const todayDateKey = toDateKey(new Date())
  const dutyRoster = data.staff.filter((member) => member.role === 'doctor' || member.role === 'nurse')
  const todayAppointments = data.appointments
    .filter((appointment) => toDateKey(appointment.appointment_date) === todayDateKey)
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0)
  const monthDays = Array.from({ length: monthEnd.getDate() }, (_, index) =>
    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index + 1)
  )
  const dutyCountByDate = data.dutyAssignments.reduce<Record<string, number>>((counts, dutyAssignment) => {
    const dateKey = toDateKey(dutyAssignment.duty_date)
    counts[dateKey] = (counts[dateKey] || 0) + 1
    return counts
  }, {})
  const monthDutyTotal = monthDays.reduce((total, day) => {
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    return total + (dutyCountByDate[key] || 0)
  }, 0)
  const calendarStartOffset = monthStart.getDay()
  const calendarCells = [
    ...Array.from({ length: calendarStartOffset }, () => null),
    ...monthDays,
  ]
  const selectedDateDutyAssignments = data.dutyAssignments.filter(
    (dutyAssignment) => toDateKey(dutyAssignment.duty_date) === selectedDutyDate
  )
  useEffect(() => {
    setSelectedDutyStaffIds(selectedDateDutyAssignments.map((assignment) => assignment.staff_id))
    setDutySaveMessage(null)
  }, [selectedDutyDate, data.dutyAssignments])

  const dutyBySelectedDate = dutyRoster
    .filter((member) => selectedDateDutyAssignments.some((assignment) => assignment.staff_id === member.id))
    .map((member) => ({ ...member, dutyCount: 1 }))
    .sort((a, b) => b.dutyCount - a.dutyCount)
  const selectedDateLabel = dateKeyToLabel(selectedDutyDate)
  const visibleMonthLabel = visibleMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
  const moveVisibleMonth = (offset: number) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1)
    setVisibleMonth(nextMonth)
    setSelectedDutyDate(toDateKey(nextMonth))
  }

  const toggleSelectedDutyStaff = (staffId: string) => {
    setSelectedDutyStaffIds((current) =>
      current.includes(staffId)
        ? current.filter((id) => id !== staffId)
        : [...current, staffId]
    )
    setDutySaveMessage(null)
  }

  const handleSaveDutyAssignments = async () => {
    try {
      setIsSavingDutyAssignments(true)
      setDutySaveMessage(null)
      await apiClient.saveDutyAssignments({
        duty_date: selectedDutyDate,
        staff_ids: selectedDutyStaffIds,
      })
      await refreshDutyAssignments()
      setDutySaveMessage({
        type: 'success',
        text: `Duty saved for ${selectedDateLabel}.`,
      })
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to save duty assignments.'
      setDutySaveMessage({
        type: 'error',
        text: message,
      })
    } finally {
      setIsSavingDutyAssignments(false)
    }
  }

  const dutyTodayByStaff = data.staff
    .filter((member) => member.role === 'doctor' || member.role === 'nurse')
    .map((member) => {
      const staffTodayAppointments = todayAppointments.filter((appointment) => appointment.staff_id === member.id)
      return {
        ...member,
        dutyCount: staffTodayAppointments.length,
        completedCount: staffTodayAppointments.filter((appointment) => appointment.status === 'completed').length,
      }
    })
    .filter((member) => member.is_on_duty)
    .sort((a, b) => b.dutyCount - a.dutyCount)

  const staffOnDutyCount = data.staff.filter((member) => member.is_on_duty && (member.role === 'doctor' || member.role === 'nurse')).length
  const doctorCount = data.staff.filter((member) => member.role === 'doctor').length
  const nurseCount = data.staff.filter((member) => member.role === 'nurse').length
  const totalAppointments = data.appointments.length
  const completedAppointments = data.appointments.filter((appointment) => appointment.status === 'completed').length
  const scheduledAppointments = data.appointments.filter((appointment) => appointment.status === 'scheduled').length
  const cancelledAppointments = data.appointments.filter((appointment) => appointment.status === 'cancelled').length
  const noShowAppointments = data.appointments.filter((appointment) => appointment.status === 'no-show').length
  const pendingPrescriptions = data.prescriptions.filter((prescription) => !prescription.is_completed).length
  const completedPrescriptions = data.prescriptions.filter((prescription) => prescription.is_completed).length
  const now = new Date()
  const newPatientsThisMonth = data.patients.filter((patient) => {
    const createdAt = new Date(patient.created_at)
    return createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth()
  }).length
  const lowStockMedicines = data.medicines.filter((medicine) => medicine.quantity <= medicine.reorder_level).length
  const expiringMedicines = data.medicines
    .filter((medicine) => {
      if (!medicine.expiry_date) return false
      const expiry = new Date(medicine.expiry_date)
      const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 30
    })
    .sort((a, b) => new Date(a.expiry_date || '').getTime() - new Date(b.expiry_date || '').getTime())
  const appointmentCompletionRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0
  const prescriptionCompletionRate = data.prescriptions.length > 0 ? Math.round((completedPrescriptions / data.prescriptions.length) * 100) : 0
  const activeCoverageRate = dutyRoster.length > 0 ? Math.round((staffOnDutyCount / dutyRoster.length) * 100) : 0
  const unassignedAppointments = data.appointments.filter((appointment) => !appointment.staff_id).length
  const careTeamLoad = dutyRoster
    .map((member) => {
      const assignedTotal = data.appointments.filter((appointment) => appointment.staff_id === member.id)
      const assignedToday = todayAppointments.filter((appointment) => appointment.staff_id === member.id)

      return {
        ...member,
        totalAssigned: assignedTotal.length,
        assignedToday: assignedToday.length,
        completedToday: assignedToday.filter((appointment) => appointment.status === 'completed').length,
      }
    })
    .sort((a, b) => {
      if (b.assignedToday !== a.assignedToday) return b.assignedToday - a.assignedToday
      return b.totalAssigned - a.totalAssigned
    })
  const recentPrescriptions = [...data.prescriptions]
    .sort((a, b) => new Date(b.prescribed_date || b.created_at).getTime() - new Date(a.prescribed_date || a.created_at).getTime())
    .slice(0, 5)
  const recentPatients = [...data.patients]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)
  const allPatients = [...data.patients]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const allAppointments = [...data.appointments]
    .sort((a, b) => {
      const aTime = new Date(`${a.appointment_date}T${a.appointment_time || '00:00'}`).getTime()
      const bTime = new Date(`${b.appointment_date}T${b.appointment_time || '00:00'}`).getTime()
      return bTime - aTime
    })
  const allPrescriptions = [...data.prescriptions]
    .sort((a, b) => new Date(b.prescribed_date || b.created_at).getTime() - new Date(a.prescribed_date || a.created_at).getTime())
  const allMedicines = [...data.medicines]
    .sort((a, b) => {
      const aPriority = a.quantity <= a.reorder_level ? 0 : 1
      const bPriority = b.quantity <= b.reorder_level ? 0 : 1
      if (aPriority !== bPriority) return aPriority - bPriority
      return a.name.localeCompare(b.name)
    })
  const latestAppointmentByPatient = allAppointments.reduce<Record<string, typeof allAppointments[number]>>((lookup, appointment) => {
    if (!lookup[appointment.patient_id]) {
      lookup[appointment.patient_id] = appointment
    }

    return lookup
  }, {})

  const getAssignedStaffDetails = (staffId?: string | null) => {
    const assignedStaff = data.staff.find((item) => item.id === staffId)

    if (!assignedStaff) {
      return {
        name: 'Unassigned',
        meta: 'No doctor or staff assigned yet',
      }
    }

    const roleLabel = assignedStaff.role.charAt(0).toUpperCase() + assignedStaff.role.slice(1)
    const specialtyLabel = assignedStaff.specialty ? `, ${assignedStaff.specialty}` : ''

    return {
      name: assignedStaff.full_name,
      meta: `${roleLabel}${specialtyLabel}`,
    }
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-blue-100">Admin Dashboard</p>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">Clinic control center</h3>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50">
                <span className="text-blue-100/80">Today appointments</span>
                <span className="text-white">{todayAppointments.length}</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50">
                <span className="text-blue-100/80">Duty records</span>
                <span className="text-white">{monthDutyTotal}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Patients</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{data.patients.length}</p>
              <p className="text-xs text-slate-500 mt-1">Total active records</p>
            </div>
            <span className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 inline-flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">New This Month</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{newPatientsThisMonth}</p>
              <p className="text-xs text-slate-500 mt-1">Patients registered this month</p>
            </div>
            <span className="h-10 w-10 rounded-xl bg-cyan-50 border border-cyan-100 inline-flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-600" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">On Duty</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{staffOnDutyCount}</p>
              <p className="text-xs text-slate-500 mt-1">Doctors and nurses live</p>
            </div>
            <span className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 inline-flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Consultations</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{completedAppointments}</p>
              <p className="text-xs text-slate-500 mt-1">Completed appointments</p>
            </div>
            <span className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 inline-flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pending Scripts</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{pendingPrescriptions}</p>
              <p className="text-xs text-slate-500 mt-1">Need completion review</p>
            </div>
            <span className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 inline-flex items-center justify-center">
              <Pill className="w-5 h-5 text-rose-600" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Medicine Alerts</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{lowStockMedicines}</p>
              <p className="text-xs text-slate-500 mt-1">Items at or below reorder level</p>
            </div>
            <span className="h-10 w-10 rounded-xl bg-violet-50 border border-violet-100 inline-flex items-center justify-center">
              <Package className="w-5 h-5 text-violet-600" />
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operations Health</p>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Appointment and prescription flow</h3>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">Live</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Completion Rate</p>
              <p className="text-3xl font-bold text-emerald-950 mt-1">{appointmentCompletionRate}%</p>
              <p className="text-xs text-emerald-800/80 mt-2">{completedAppointments} of {totalAppointments} appointments completed</p>
            </div>
            <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Prescription Closeout</p>
              <p className="text-3xl font-bold text-cyan-950 mt-1">{prescriptionCompletionRate}%</p>
              <p className="text-xs text-cyan-800/80 mt-2">{completedPrescriptions} finished and {pendingPrescriptions} pending</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Appointment Status Mix</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Scheduled</span>
                  <span className="font-semibold text-slate-900">{scheduledAppointments}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Cancelled</span>
                  <span className="font-semibold text-slate-900">{cancelledAppointments}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">No-show</span>
                  <span className="font-semibold text-slate-900">{noShowAppointments}</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Coverage and Gaps</p>
              <p className="text-3xl font-bold text-amber-950 mt-1">{activeCoverageRate}%</p>
              <p className="text-xs text-amber-800/80 mt-2">{staffOnDutyCount} active staff and {unassignedAppointments} unassigned appointments</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Team Snapshot</p>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Care team mix</h3>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700">Read only</span>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">Doctors</span>
              <span className="text-xl font-bold text-slate-900">{doctorCount}</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">Nurses</span>
              <span className="text-xl font-bold text-slate-900">{nurseCount}</span>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-emerald-700">On duty now</span>
              <span className="text-xl font-bold text-emerald-950">{staffOnDutyCount}</span>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-violet-700">Medicines expiring in 30 days</span>
              <span className="text-xl font-bold text-violet-950">{expiringMedicines.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Care Team Workload</h3>
              <p className="text-xs text-slate-500 mt-1">Today&apos;s assignment balance for doctors and nurses</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">Top 6</span>
          </div>
          <div className="space-y-3">
            {careTeamLoad.slice(0, 6).map((member) => (
              <div key={member.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{member.full_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${member.is_on_duty ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                    {member.is_on_duty ? 'On duty' : 'Off duty'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="rounded-lg bg-white border border-slate-200 px-2 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Today</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{member.assignedToday}</p>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 px-2 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Done</p>
                    <p className="text-lg font-bold text-emerald-700 mt-1">{member.completedToday}</p>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 px-2 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Total</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{member.totalAssigned}</p>
                  </div>
                </div>
              </div>
            ))}
            {careTeamLoad.length === 0 && <p className="text-sm text-slate-500">No doctor or nurse workload data yet.</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Prescription Monitor</h3>
                <p className="text-xs text-slate-500 mt-1">Most recent prescriptions and their progress</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-50 text-rose-700">{pendingPrescriptions} pending</span>
            </div>
            <div className="space-y-3">
              {recentPrescriptions.map((prescription) => {
                const patient = data.patients.find((item) => item.id === prescription.patient_id)
                const prescriber = data.staff.find((item) => item.id === prescription.staff_id)

                return (
                  <div key={prescription.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{prescription.medication_name}</p>
                        <p className="text-xs text-slate-500 truncate">{patient?.full_name || 'Unknown patient'} - {prescriber?.full_name || 'Unknown staff'}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${prescription.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {prescription.is_completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                )
              })}
              {recentPrescriptions.length === 0 && <p className="text-sm text-slate-500">No prescriptions available yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Medicine Watchlist</h3>
                <p className="text-xs text-slate-500 mt-1">Low stock and near-expiry items</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-violet-50 text-violet-700">{lowStockMedicines} low stock</span>
            </div>
            <div className="space-y-3">
              {data.medicines
                .filter((medicine) => medicine.quantity <= medicine.reorder_level || expiringMedicines.some((item) => item.id === medicine.id))
                .slice(0, 5)
                .map((medicine) => (
                  <div key={medicine.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{medicine.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatMedicineAmount(medicine.quantity, medicine.unit)} left - reorder at {formatMedicineAmount(medicine.reorder_level, medicine.unit)}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${medicine.quantity <= medicine.reorder_level ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {medicine.quantity <= medicine.reorder_level ? 'Low stock' : 'Expiring soon'}
                      </span>
                    </div>
                  </div>
                ))}
              {lowStockMedicines === 0 && expiringMedicines.length === 0 && (
                <p className="text-sm text-slate-500">Medicine stock looks stable right now.</p>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )

  const renderDutyTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">On Duty Now</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{staffOnDutyCount}</p>
          <p className="text-xs text-slate-500 mt-1">Doctors and nurses currently active</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Duty Records</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{monthDutyTotal}</p>
          <p className="text-xs text-slate-500 mt-1">Recorded assignments this month</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coverage Rate</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{activeCoverageRate}%</p>
          <p className="text-xs text-slate-500 mt-1">Active staff against total duty roster</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 md:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Duty Calendar</h3>
            <p className="text-xs text-slate-500 mt-1">Recorded assignments and staff coverage</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">{selectedDateLabel}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4 items-start">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 self-start min-h-[320px]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Record Duty</p>
                <p className="text-xs text-slate-500">Select doctors and nurses for {selectedDateLabel}</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                {selectedDutyStaffIds.length}
              </span>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {dutyRoster.length === 0 ? (
                <p className="text-sm text-slate-500">No doctors or nurses found yet.</p>
              ) : (
                dutyRoster.map((member) => {
                  const isSelected = selectedDutyStaffIds.includes(member.id)

                  return (
                    <label
                      key={member.id}
                      className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 cursor-pointer transition ${
                        isSelected ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectedDutyStaff(member.id)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{member.full_name}</p>
                          <p className="text-xs text-slate-500 capitalize">
                            {member.role}{member.is_on_duty ? ' • on duty now' : ''}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                          selected
                        </span>
                      )}
                    </label>
                  )
                })
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button
                type="button"
                onClick={handleSaveDutyAssignments}
                disabled={isSavingDutyAssignments}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {isSavingDutyAssignments ? <Loader2 size={16} className="animate-spin" /> : null}
                {isSavingDutyAssignments ? 'Saving...' : 'Save Duty'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDutyStaffIds([])
                  setDutySaveMessage(null)
                }}
                disabled={isSavingDutyAssignments}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Clear
              </button>
            </div>

            {dutySaveMessage && (
              <p className={`mt-3 text-sm ${dutySaveMessage.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
                {dutySaveMessage.text}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3 self-start lg:justify-self-end w-full max-w-[460px]">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-semibold text-slate-900">Calendar View</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveVisibleMonth(-1)}
                  className="h-6 w-6 inline-flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveVisibleMonth(1)}
                  className="h-6 w-6 inline-flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50"
                  aria-label="Next month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-2">{visibleMonthLabel}</p>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="py-0.5">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, index) => {
                if (!day) {
                  return <div key={`blank-${index}`} className="h-12 rounded-md bg-slate-50 border border-dashed border-slate-200" />
                }

                const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
                const dutyCount = dutyCountByDate[dateKey] || 0
                const isToday = day.toDateString() === new Date().toDateString()

                return (
                  <button
                    type="button"
                    onClick={() => setSelectedDutyDate(dateKey)}
                    key={dateKey}
                    className={`h-12 rounded-md border px-1.5 py-0.5 flex items-center justify-between ${
                      selectedDutyDate === dateKey
                        ? 'border-slate-700 bg-slate-100'
                        : isToday
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                    } cursor-pointer`}
                    aria-label={`Show duty list for ${dateKey}`}
                  >
                    <span className={`text-xs font-semibold ${isToday ? 'text-emerald-900' : 'text-slate-800'}`}>
                      {day.getDate()}
                    </span>
                    <span className={`text-[10px] font-semibold px-1 py-0.5 rounded ${dutyCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {dutyCount}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto shadow-sm">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-slate-900">Who Is On Duty Today</h3>
          </div>
          <table className="w-full min-w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Staff</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Role</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Assigned</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Done</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dutyTodayByStaff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 sm:px-6 py-8 sm:py-12 text-center">
                    <p className="text-sm text-gray-500">No staff on duty today</p>
                  </td>
                </tr>
              ) : (
                dutyTodayByStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">{member.full_name}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 capitalize">{member.role}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{member.dutyCount}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-green-700 font-semibold">{member.completedCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Care Team Workload</h3>
              <p className="text-xs text-slate-500 mt-1">Top staff by today&apos;s assignments</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">Top 6</span>
          </div>
          <div className="space-y-3">
            {careTeamLoad.slice(0, 6).map((member) => (
              <div key={member.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{member.full_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${member.is_on_duty ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                    {member.is_on_duty ? 'On duty' : 'Off duty'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="rounded-lg bg-white border border-slate-200 px-2 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Today</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{member.assignedToday}</p>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 px-2 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Done</p>
                    <p className="text-lg font-bold text-emerald-700 mt-1">{member.completedToday}</p>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 px-2 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Total</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{member.totalAssigned}</p>
                  </div>
                </div>
              </div>
            ))}
            {careTeamLoad.length === 0 && <p className="text-sm text-slate-500">No doctor or nurse workload data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )

  const renderPatientsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Patients</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{data.patients.length}</p>
          <p className="text-xs text-slate-500 mt-1">Active patient records</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New This Month</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{newPatientsThisMonth}</p>
          <p className="text-xs text-slate-500 mt-1">Recently added patients</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent Profiles</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{recentPatients.length}</p>
          <p className="text-xs text-slate-500 mt-1">Latest patient registrations</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto shadow-sm">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-slate-900">Patient List</h3>
          <p className="text-xs text-slate-500 mt-1">Read-only patient directory with nurse intake records and doctor recommendations</p>
        </div>
        <table className="w-full min-w-full">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Name</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Email</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Phone</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Gender</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Age</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Assigned Appointment</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Concern</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Nurse Notes</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Recommended Doctor</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Added By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allPatients.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 sm:px-6 py-8 sm:py-12 text-center">
                  <p className="text-sm text-gray-500">No patients found</p>
                </td>
              </tr>
            ) : (
              allPatients.map((patient) => {
                const recommendedDoctor = data.staff.find((item) => item.id === patient.recommended_doctor_id)
                const addedBy = data.staff.find((item) => item.id === patient.created_by_staff_id)
                const latestAppointment = latestAppointmentByPatient[patient.id]
                const assignedStaff = getAssignedStaffDetails(latestAppointment?.staff_id)

                return (
                  <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">{patient.full_name}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{patient.email || 'No email'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{patient.phone || 'No phone'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{patient.gender || 'N/A'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{patient.age ?? 'N/A'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                      {latestAppointment ? (
                        <div className="min-w-[180px]">
                          <p className="font-medium text-gray-900">{assignedStaff.name}</p>
                          <p className="text-xs text-gray-500">{assignedStaff.meta}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {latestAppointment.appointment_date} at {latestAppointment.appointment_time}
                          </p>
                        </div>
                      ) : (
                        'No appointment yet'
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 max-w-xs">{patient.symptoms || '-'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 max-w-xs">{patient.intake_notes || '-'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                      {recommendedDoctor
                        ? `${recommendedDoctor.full_name}${recommendedDoctor.specialty ? ` (${recommendedDoctor.specialty})` : ''}`
                        : 'Not selected'}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{addedBy?.full_name || 'Unknown staff'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderAppointmentsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{totalAppointments}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scheduled</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{scheduledAppointments}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completed</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{completedAppointments}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unassigned</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{unassignedAppointments}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto shadow-sm">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-slate-900">Appointments</h3>
          <p className="text-xs text-slate-500 mt-1">Read-only appointment list for admin monitoring</p>
        </div>
        <table className="w-full min-w-full">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Patient</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Assigned Staff</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Date</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Time</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Reason</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allAppointments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 sm:px-6 py-8 sm:py-12 text-center">
                  <p className="text-sm text-gray-500">No appointments found</p>
                </td>
              </tr>
            ) : (
              allAppointments.map((appointment) => {
                const patient = data.patients.find((item) => item.id === appointment.patient_id)
                const assignedStaff = getAssignedStaffDetails(appointment.staff_id)

                return (
                  <tr key={appointment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">{patient?.full_name || 'Unknown'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                      <div className="min-w-[170px]">
                        <p className="font-medium text-gray-900">{assignedStaff.name}</p>
                        <p className="text-xs text-gray-500">{assignedStaff.meta}</p>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{appointment.appointment_date}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{appointment.appointment_time}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{appointment.reason || 'Checkup'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                      <span className={`badge ${appointment.status === 'scheduled' ? 'badge-primary' : appointment.status === 'completed' ? 'badge-success' : 'bg-gray-100 text-gray-700'}`}>
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderPrescriptionsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Prescriptions</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{data.prescriptions.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{pendingPrescriptions}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completed</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{completedPrescriptions}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto shadow-sm">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-slate-900">Prescriptions</h3>
          <p className="text-xs text-slate-500 mt-1">Read-only prescription log for admin review</p>
        </div>
        <table className="w-full min-w-full">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Medicine</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Patient</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Doctor</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Date</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allPrescriptions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 sm:px-6 py-8 sm:py-12 text-center">
                  <p className="text-sm text-gray-500">No prescriptions found</p>
                </td>
              </tr>
            ) : (
              allPrescriptions.map((prescription) => {
                const patient = data.patients.find((item) => item.id === prescription.patient_id)
                const prescriber = data.staff.find((item) => item.id === prescription.staff_id)

                return (
                  <tr key={prescription.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">{prescription.medication_name}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{patient?.full_name || 'Unknown'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{prescriber?.full_name || 'Unknown'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{prescription.prescribed_date}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${prescription.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {prescription.is_completed ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderMedicinesTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Medicines</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{data.medicines.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Low Stock</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{lowStockMedicines}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expiring Soon</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{expiringMedicines.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto shadow-sm">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-slate-900">Medicines</h3>
          <p className="text-xs text-slate-500 mt-1">Read-only stock and expiry overview for admin</p>
        </div>
        <table className="w-full min-w-full">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Medicine</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Quantity</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Reorder</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Expiry</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Supplier</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allMedicines.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 sm:px-6 py-8 sm:py-12 text-center">
                  <p className="text-sm text-gray-500">No medicines found</p>
                </td>
              </tr>
            ) : (
              allMedicines.map((medicine) => {
                const isLowStock = medicine.quantity <= medicine.reorder_level
                const isExpiringSoon = expiringMedicines.some((item) => item.id === medicine.id)

                return (
                  <tr key={medicine.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">{medicine.name}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{formatMedicineAmount(medicine.quantity, medicine.unit)}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{formatMedicineAmount(medicine.reorder_level, medicine.unit)}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{medicine.expiry_date || 'N/A'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{medicine.supplier || 'N/A'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${isLowStock ? 'bg-rose-100 text-rose-700' : isExpiringSoon ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isLowStock ? 'Low stock' : isExpiringSoon ? 'Expiring soon' : 'Stable'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  if (loading) {
    return <div className="min-h-screen bg-slate-100" />
  }

  return (
    <div className="flex h-screen bg-slate-100">
      {sidebarOpen && isMobile && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative md:translate-x-0 md:w-20 lg:w-64 z-40 w-64 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 text-white transition-all duration-300 flex flex-col shadow-xl h-screen`}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Image src="/images/profile.jpg" alt="ClinicCare Logo" width={40} height={40} className="rounded-lg object-cover ring-2 ring-blue-400/50" />
            {!isMobile && (
              <div>
                <h1 className="font-bold text-base text-white">Clinic Care</h1>
                <p className="text-xs text-blue-100">Operations workspace</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dashboard' as const, label: 'Dashboard', icon: Home },
            { id: 'duty' as const, label: 'Duty', icon: Calendar },
            { id: 'patients' as const, label: 'Patient List', icon: Users },
            { id: 'appointments' as const, label: 'Appointments', icon: Calendar },
            { id: 'prescriptions' as const, label: 'Prescriptions', icon: Pill },
            { id: 'medicines' as const, label: 'Medicines', icon: Package },
            { id: 'staff' as const, label: 'Doctors & Staff', icon: Users },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id)
                if (isMobile) setSidebarOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition font-medium text-sm ${activeTab === item.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

      </aside>

      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden w-full md:w-auto">
        <header className="bg-white shadow-sm border-b border-gray-100 flex-shrink-0">
          <div className="px-4 py-3 md:px-8 md:py-4 flex items-center justify-between gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 flex-shrink-0 md:hidden">
              <Menu size={24} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Clinic Care</p>
              <div className="min-w-0">
                <h2 className="text-base md:text-xl font-bold text-gray-900 truncate">Operations Workspace</h2>
                <p className="text-xs md:text-sm text-gray-500 truncate">
                  <span className="font-semibold text-slate-700">{currentAdminSection.title}</span>
                  <span className="px-1.5 text-slate-300">/</span>
                  {currentAdminSection.subtitle}
                </p>
              </div>
            </div>
            <PanelProfileMenu
              userName={currentUser?.full_name}
              roleLabel="Admin"
              roleBadgeClassName="bg-blue-100 text-blue-700"
              iconAccentClassName="text-blue-700"
              onLogout={() => setShowLogoutConfirm(true)}
            />
          </div>
        </header>

        <main className="flex-1 overflow-auto px-3 md:px-8 py-4 md:py-6">
          {activeTab === 'dashboard' && renderDashboard()}

          {activeTab === 'duty' && renderDutyTab()}

          {activeTab === 'patients' && renderPatientsTab()}

          {activeTab === 'appointments' && renderAppointmentsTab()}

          {activeTab === 'prescriptions' && <PrescriptionsList />}

          {activeTab === 'medicines' && <MedicinesList />}

          {activeTab === 'staff' && <StaffList />}
        </main>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to logout from Clinic Care Management System?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoggingOut && (
        <div className="fixed inset-0 z-[60]">
          <BrandLoadingOverlay
            title="Signing you out"
            subtitle="Securing your admin session and returning to login"
          />
        </div>
      )}
    </div>
  )
}
