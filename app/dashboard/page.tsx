'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Menu, Home, Users, Calendar, Pill, BarChart3, ChevronLeft, ChevronRight, Loader2, Package, UserPlus, MessageSquare } from 'lucide-react'
import { useDashboardData } from '@/lib/DataContext'
import { apiClient } from '@/lib/apiClient'
import { formatMedicineAmount } from '@/lib/medicine'
import PatientsList from '@/components/PatientsList'
import AppointmentsList from '@/components/AppointmentsList'
import PrescriptionsList from '@/components/PrescriptionsList'
import ReportsList from '@/components/ReportsList'
import StaffList from '@/components/StaffList'
import StaffMessagesPanel from '@/components/StaffMessagesPanel'
import MedicinesList from '@/components/MedicinesList'
import ArchiveComponent from '@/components/ArchiveComponent'
import AccessDenied from '@/components/AccessDenied'
import BrandLoadingOverlay from '@/components/BrandLoadingOverlay'
import PanelProfileMenu from '@/components/PanelProfileMenu'

type TabType = 'overview' | 'intake' | 'patients' | 'appointments' | 'prescriptions' | 'messages' | 'reports' | 'staff' | 'medicines' | 'archive'
type UserRole = 'admin' | 'doctor' | 'nurse' | 'receptionist'

const panelSectionMeta: Partial<Record<TabType, { title: string; subtitle: string }>> = {
  overview: {
    title: 'Overview',
    subtitle: 'Your current workload, schedule, and clinic activity.',
  },
  intake: {
    title: 'Patient Registration',
    subtitle: 'Create a new patient handoff and recommend the right doctor.',
  },
  patients: {
    title: 'Patients',
    subtitle: 'Review patient charts, nurse notes, and care history.',
  },
  appointments: {
    title: 'Appointments',
    subtitle: 'Assigned schedules, patient reasons, and status updates.',
  },
  prescriptions: {
    title: 'Prescriptions',
    subtitle: 'Medication instructions, handover, and completion tracking.',
  },
  messages: {
    title: 'Messages',
    subtitle: 'Care-team messages, patient handoff, and internal coordination.',
  },
  reports: {
    title: 'Reports',
    subtitle: 'Clinic analytics, trends, and reporting snapshots.',
  },
  staff: {
    title: 'Staff',
    subtitle: 'Team directory and workforce details.',
  },
  medicines: {
    title: 'Medicines',
    subtitle: 'Inventory, stock levels, and medicine activity.',
  },
  archive: {
    title: 'Archive',
    subtitle: 'Archived records and historical clinic data.',
  },
}

export default function DashboardPage() {
  const router = useRouter()
  const { data, refreshAll, refreshAppointments } = useDashboardData()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
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

    if (storedRole === 'admin') {
      router.replace('/admin')
      return
    }

    setUserId(currentUserId)
    setUserEmail(currentUserEmail)
    setActiveTab('overview')
    setLoading(false)
    refreshAll()

    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [refreshAll, router])

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

  const updateDutyTaskStatus = async (appointmentId: string, status: 'scheduled' | 'completed') => {
    try {
      setUpdatingTaskId(appointmentId)
      await apiClient.updateAppointment(appointmentId, { status })
      await refreshAppointments()
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Failed to update task status')
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const currentUser = data.staff.find(
    (member) => member.id === userId || member.email?.toLowerCase() === userEmail.toLowerCase()
  )
  const currentRole: UserRole = (currentUser?.role || 'receptionist') as UserRole
  const currentStaffId = currentUser?.id || userId
  useEffect(() => {
    if (!currentUser) return

    localStorage.setItem('user_role', currentUser.role)
    if (currentUser.role === 'admin') {
      router.replace('/admin')
    }
  }, [currentUser, router])

  useEffect(() => {
    if (currentRole !== 'doctor' && currentRole !== 'nurse') {
      setUnreadMessageCount(0)
      return
    }

    let isMounted = true

    const syncUnreadMessages = async () => {
      try {
        const response = await apiClient.getMessages()
        const messages = Array.isArray(response.data) ? response.data : []
        const unreadCount = messages.filter(
          (message: any) => message.recipient_staff_id === currentStaffId && !message.is_read
        ).length

        if (isMounted) {
          setUnreadMessageCount(unreadCount)
        }
      } catch {
        if (isMounted) {
          setUnreadMessageCount(0)
        }
      }
    }

    const handleWindowFocus = () => {
      void syncUnreadMessages()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncUnreadMessages()
      }
    }

    void syncUnreadMessages()
    const intervalId = window.setInterval(() => {
      void syncUnreadMessages()
    }, 15000)

    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentRole, currentStaffId])

  const roleDisplayName =
    currentRole === 'admin' ? 'Admin' : currentRole === 'doctor' ? 'Doctor' : 'Nurse'
  const workspaceTitle =
    currentRole === 'doctor'
      ? 'Doctor Workspace'
      : currentRole === 'nurse'
        ? 'Nurse Workspace'
        : 'Clinic Workspace'
  const roleTheme =
    currentRole === 'doctor'
      ? {
          shell: 'from-emerald-950 via-slate-950 to-teal-900',
          accent: 'from-emerald-500 to-teal-500',
          badge: 'bg-emerald-100 text-emerald-700',
          surface: 'bg-emerald-50/40',
        }
      : currentRole === 'nurse'
        ? {
            shell: 'from-cyan-950 via-slate-950 to-blue-900',
            accent: 'from-cyan-500 to-blue-500',
            badge: 'bg-cyan-100 text-cyan-700',
            surface: 'bg-cyan-50/40',
          }
        : {
            shell: 'from-slate-900 via-slate-900 to-slate-800',
            accent: 'from-blue-600 to-indigo-600',
            badge: 'bg-slate-100 text-slate-700',
            surface: 'bg-white',
          }

  const assignedAppointments = currentUser ? data.appointments.filter((a) => a.staff_id === currentUser.id) : []
  const todaysAssignedAppointments = assignedAppointments
    .filter((a) => new Date(a.appointment_date).toDateString() === new Date().toDateString())
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
  const dutyTasks = assignedAppointments
    .filter((a) => a.status !== 'cancelled')
    .sort((a, b) => {
      const dateDiff = new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
      if (dateDiff !== 0) return dateDiff
      return a.appointment_time.localeCompare(b.appointment_time)
    })

  const roleTabs: Record<UserRole, TabType[]> = {
    admin: ['overview', 'staff'],
    doctor: ['overview', 'patients', 'appointments', 'prescriptions', 'messages', 'staff'],
    nurse: ['overview', 'intake', 'patients', 'prescriptions', 'messages', 'staff'],
    receptionist: ['overview'],
  }

  const availableTabs = roleTabs[currentRole] || roleTabs.admin
  const currentSectionMeta = panelSectionMeta[activeTab] || panelSectionMeta.overview!
  const navItems: Array<{ id: TabType; label: string; icon: typeof Home; badgeCount?: number }> = (() => {
    if (currentRole === 'doctor') {
      return [
        { id: 'overview', label: 'My Dashboard', icon: Home },
        { id: 'patients', label: 'All Patients', icon: Users },
        { id: 'appointments', label: 'My Consults', icon: Calendar },
        { id: 'prescriptions', label: 'My Prescriptions', icon: Pill },
        { id: 'messages', label: 'Messages', icon: MessageSquare, badgeCount: unreadMessageCount },
        { id: 'staff', label: 'Care Team', icon: Users },
      ]
    }

    if (currentRole === 'nurse') {
      return [
        { id: 'overview', label: 'My Dashboard', icon: Home },
        { id: 'intake', label: 'New Intake', icon: UserPlus },
        { id: 'patients', label: 'Patient Records', icon: Users },
        { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
        { id: 'messages', label: 'Messages', icon: MessageSquare, badgeCount: unreadMessageCount },
        { id: 'staff', label: 'Doctors On Duty', icon: Calendar },
      ]
    }

    return [
      { id: 'overview', label: 'Dashboard', icon: Home },
      { id: 'staff', label: 'Doctors & Staff', icon: Users },
    ]
  })()

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

  const dutyTaskCards = dutyTasks.map((appointment) => {
    const patient = data.patients.find((p) => p.id === appointment.patient_id)
    const patientName = patient?.full_name || 'Unknown Patient'
    const title = currentRole === 'doctor'
      ? `Consult ${patientName}`
      : `Prepare and assist ${patientName}`

    return {
      id: appointment.id,
      title,
      details: `${appointment.appointment_time} - ${appointment.reason || 'General checkup'}`,
      status: appointment.status,
      date: appointment.appointment_date,
    }
  })

  const todaysDutyTaskCards = dutyTaskCards.filter((task) => toDateKey(task.date) === todayDateKey)
  const assignedPrescriptions = currentUser ? data.prescriptions.filter((p) => p.staff_id === currentUser.id) : []
  const completedAppointmentsCount = dutyTaskCards.filter((t) => t.status === 'completed').length
  const completedPrescriptionsCount = assignedPrescriptions.filter((p) => p.is_completed).length
  const completedWorkCount = completedAppointmentsCount + completedPrescriptionsCount

  const todayAppointments = data.appointments
    .filter((a) => toDateKey(a.appointment_date) === todayDateKey)
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
  const dutyBySelectedDate = dutyRoster
    .filter((member) => selectedDateDutyAssignments.some((assignment) => assignment.staff_id === member.id))
    .map((member) => {
      return {
        ...member,
        dutyCount: 1,
      }
    })
    .sort((a, b) => b.dutyCount - a.dutyCount)
  const selectedDateLabel = dateKeyToLabel(selectedDutyDate)
  const visibleMonthLabel = visibleMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
  const todayDutyAssignments = data.dutyAssignments.filter(
    (dutyAssignment) => toDateKey(dutyAssignment.duty_date) === todayDateKey
  )
  const doctorsOnDutyToday = data.staff
    .filter(
      (member) =>
        member.role === 'doctor' &&
        (
          todayDutyAssignments.some((assignment) => assignment.staff_id === member.id) ||
          (!todayDutyAssignments.length && member.is_on_duty)
        )
    )
    .map((member) => ({
      ...member,
      recommendedCount: data.patients.filter((patient) => patient.recommended_doctor_id === member.id).length,
      todayAppointments: todayAppointments.filter((appointment) => appointment.staff_id === member.id).length,
    }))
    .sort((a, b) => {
      if (b.todayAppointments !== a.todayAppointments) return b.todayAppointments - a.todayAppointments
      return a.full_name.localeCompare(b.full_name)
    })
  const recentPatientIntakes = [...data.patients]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
  const recommendedPatientsCount = data.patients.filter((patient) => patient.recommended_doctor_id).length
  const recordedByCurrentNurseCount = currentRole === 'nurse' && currentUser
    ? data.patients.filter((patient) => patient.created_by_staff_id === currentUser.id).length
    : 0
  const getStaffDisplayName = (staffId?: string | null) => {
    if (!staffId) return 'Not recorded'
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

  const moveVisibleMonth = (offset: number) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1)
    setVisibleMonth(nextMonth)
    setSelectedDutyDate(toDateKey(nextMonth))
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50" />
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
  const completedAppointments = data.appointments.filter((a) => a.status === 'completed').length
  const scheduledAppointments = data.appointments.filter((a) => a.status === 'scheduled').length
  const cancelledAppointments = data.appointments.filter((a) => a.status === 'cancelled').length
  const noShowAppointments = data.appointments.filter((a) => a.status === 'no-show').length
  const pendingPrescriptions = data.prescriptions.filter((p) => !p.is_completed).length
  const completedPrescriptions = data.prescriptions.filter((p) => p.is_completed).length
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

  const renderAdminOverview = () => (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-slate-300">Clinic Analytics</p>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">Performance snapshot</h3>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl">
              Read-only view of staffing, consultations, prescriptions, and medicine activity across the clinic.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 min-w-[220px]">
            <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-300 font-semibold">Today appointments</p>
              <p className="text-xl font-bold text-white mt-0.5">{todayAppointments.length}</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-300 font-semibold">Duty records</p>
              <p className="text-xl font-bold text-white mt-0.5">{monthDutyTotal}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Medicine Alerts</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{lowStockMedicines}</p>
              <p className="text-xs text-slate-500 mt-1">Items at or below reorder level</p>
            </div>
            <span className="h-10 w-10 rounded-xl bg-violet-50 border border-violet-100 inline-flex items-center justify-center">
              <Package className="w-5 h-5 text-violet-600" />
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">On Duty</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{staffOnDutyCount}</p>
              <p className="text-xs text-slate-500 mt-1">Doctors and nurses live</p>
            </div>
            <span className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 inline-flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
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

      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">Staffing Analytics</h3>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Read only</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 md:p-5 mb-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Monthly overview</p>
              <h3 className="text-lg md:text-xl font-bold text-slate-900 mt-1">Duty allocation calendar</h3>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-right min-w-[140px]">
              <p className="text-[10px] uppercase tracking-wide text-slate-600 font-semibold">Duties this month</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{monthDutyTotal}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4 items-start">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 self-start min-h-[320px]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Doctor and Nurse On Duty</p>
                  <p className="text-xs text-slate-500">Recorded for {selectedDateLabel}</p>
                </div>
                <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  {dutyBySelectedDate.length}
                </span>
              </div>
              {dutyBySelectedDate.length === 0 ? (
                <p className="text-sm text-slate-500">No duty has been recorded for this day yet.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {dutyBySelectedDate.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-2 rounded-md bg-white border border-slate-200 px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{member.full_name}</p>
                        <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                        duty
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-100/80 px-3 py-3">
                <p className="text-xs font-semibold text-slate-900">Analytics only</p>
                <p className="text-xs text-slate-600 mt-1">
                  Admin can monitor recorded duty coverage here, while doctor and staff workflows handle day-to-day updates.
                </p>
              </div>

              {/*
                <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-900">Record duty for this day</p>
                  <span className="text-[10px] text-slate-500">Select one or more staff</span>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {dutyRoster.map((member) => (
                    <label key={member.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{member.full_name}</p>
                        <p className="text-xs text-slate-500 capitalize">{member.role}{member.is_on_duty ? ' • on duty now' : ''}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedDutyStaffIds.includes(member.id)}
                        onChange={() => toggleDutyStaff(member.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDutyStaffIds([])}
                    disabled={savingDutyAssignments}
                    className="px-3 py-2 rounded-md text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDutyAssignments}
                    disabled={savingDutyAssignments}
                    className="px-3 py-2 rounded-md text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingDutyAssignments ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      'Save Duty Record'
                    )}
                  </button>
                </div>
                </div>
              */}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 self-start lg:justify-self-end w-full max-w-[460px]">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold text-slate-900">Duty Calendar</p>
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

          <div className="mt-2 text-[11px] text-slate-600">
            Calendar numbers show recorded duty assignments per day.
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">Today's Appointments</h3>
          <span className="text-xs font-semibold text-slate-500">Top 8 schedule items</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto shadow-sm">
          <table className="w-full min-w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Patient</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Time</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Doctor</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Type</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {todayAppointments.slice(0, 8).map((apt) => {
                const patient = data.patients.find((p) => p.id === apt.patient_id)
                const doctor = data.staff.find((s) => s.id === apt.staff_id)
                return (
                  <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">{patient?.full_name || 'Unknown'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{apt.appointment_time}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{doctor?.full_name || 'Unassigned'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">{apt.reason || 'Checkup'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                      <span className={`badge ${apt.status === 'scheduled' ? 'badge-primary' : apt.status === 'completed' ? 'badge-success' : 'bg-gray-100 text-gray-700'}`}>
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {todayAppointments.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No appointments scheduled for today</p>
            </div>
          )}
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
                        <p className="text-xs text-slate-500 truncate">{patient?.full_name || 'Unknown patient'} • {prescriber?.full_name || 'Unknown staff'}</p>
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
                          {formatMedicineAmount(medicine.quantity, medicine.unit)} left • reorder at {formatMedicineAmount(medicine.reorder_level, medicine.unit)}
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


      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">Who Is On Duty Today</h3>
          <span className="text-xs font-semibold text-slate-500">Live staffing snapshot</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto shadow-sm">
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
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">Recent Patients</h3>
          <span className="text-xs font-semibold text-slate-500">Latest registered profiles</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-100">
            {recentPatients.length === 0 ? (
              <div className="px-4 sm:px-6 py-8 sm:py-12 text-center">
                <p className="text-sm text-gray-500">No patients yet</p>
              </div>
            ) : (
              recentPatients.map((patient) => (
                <div key={patient.id} className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-900">{patient.full_name}</p>
                    <p className="text-xs sm:text-sm text-gray-600">{patient.email}</p>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 text-right">{patient.phone || 'No phone'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderDutyOverview = () => {
    if (currentRole === 'doctor') {
      return (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-3 sm:gap-4">
            <div className="card p-4 sm:p-6 bg-white border border-emerald-100 shadow-sm">
              <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-emerald-700 uppercase tracking-wide">Clinical Operations</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Doctor duty</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1.5 line-clamp-2">Review each assigned consult and mark it done when the admin task is completed.</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">On duty</span>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100">
                  <p className="text-sm text-emerald-700 font-medium">Consultations</p>
                  <p className="text-3xl font-bold text-emerald-950 mt-1">{dutyTaskCards.length}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                  <p className="text-sm text-teal-700 font-medium">Today</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{todaysDutyTaskCards.length}</p>
                </div>
                <div className="rounded-2xl bg-lime-50 p-4 border border-lime-100">
                  <p className="text-sm text-lime-700 font-medium">Completed Work</p>
                  <p className="text-3xl font-bold text-lime-950 mt-1">{completedWorkCount}</p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-4 border border-sky-100">
                  <p className="text-sm text-sky-700 font-medium">Prescriptions</p>
                  <p className="text-3xl font-bold text-sky-950 mt-1">{assignedPrescriptions.length}</p>
                </div>
              </div>
            </div>

            <div className="card p-4 sm:p-6 bg-white border border-slate-200 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Clinical checklist</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-700 list-disc pl-5">
                <li>Review patient chart and latest notes before consultation.</li>
                <li>Confirm symptoms, diagnosis, and next step for each case.</li>
                <li>Mark the appointment done when the consult is finished.</li>
              </ul>
            </div>
          </div>

          <div className="card p-4 sm:p-6 bg-white border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">Duty queue</h3>
                <p className="text-xs sm:text-sm text-slate-600 line-clamp-1">Consults by appointment order</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">Today</span>
            </div>
            {dutyTaskCards.length === 0 ? (
              <p className="text-gray-500">No tasks assigned yet. Ask the admin to assign appointments to your account.</p>
            ) : (
              <div className="space-y-3">
                {dutyTaskCards.map((task) => (
                  <div key={task.id} className="rounded-xl border border-slate-200 bg-white p-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{task.title}</p>
                      <p className="text-sm text-slate-600">{task.details}</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(task.date).toDateString() === new Date().toDateString() ? 'Today' : new Date(task.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {task.status}
                      </span>
                      {task.status !== 'completed' ? (
                        <button
                          type="button"
                          onClick={() => updateDutyTaskStatus(task.id, 'completed')}
                          disabled={updatingTaskId === task.id}
                          className="text-xs px-3 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {updatingTaskId === task.id ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Loader2 size={12} className="animate-spin" />
                              Saving...
                            </span>
                          ) : 'Mark Done'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateDutyTaskStatus(task.id, 'scheduled')}
                          disabled={updatingTaskId === task.id}
                          className="text-xs px-3 py-1 rounded-md bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                          {updatingTaskId === task.id ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Loader2 size={12} className="animate-spin" />
                              Saving...
                            </span>
                          ) : 'Undo'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <div className="card p-4 sm:p-6 bg-white border border-cyan-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-cyan-700 uppercase tracking-wide">Patient Intake</p>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Nurse overview</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
                  Add patients, review all patient records, recommend a doctor, and check who is available on duty today.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700 flex-shrink-0">
                {doctorsOnDutyToday.length} doctor{doctorsOnDutyToday.length === 1 ? '' : 's'} available
              </span>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-cyan-50 p-4 border border-cyan-100">
                <p className="text-xs sm:text-sm text-cyan-700 font-medium">All Patients</p>
                <p className="text-2xl sm:text-3xl font-bold text-cyan-950 mt-1">{data.patients.length}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100">
                <p className="text-xs sm:text-sm text-emerald-700 font-medium">Doctors On Duty</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-950 mt-1">{doctorsOnDutyToday.length}</p>
              </div>
              <div className="rounded-2xl bg-orange-50 p-4 border border-orange-100">
                <p className="text-xs sm:text-sm text-orange-700 font-medium">Recommended Cases</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-950 mt-1">{recommendedPatientsCount}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <p className="text-xs sm:text-sm text-slate-700 font-medium">Your Intake Records</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{recordedByCurrentNurseCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-3 sm:gap-4">
          <div className="card p-4 sm:p-6 bg-white border border-cyan-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">Available Doctors On Duty Today</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Based on today&apos;s duty record for {dateKeyToLabel(todayDateKey)}.
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                Today
              </span>
            </div>

            {doctorsOnDutyToday.length === 0 ? (
              <div className="rounded-xl border border-dashed border-cyan-200 bg-cyan-50/60 p-5 text-sm text-cyan-900">
                No doctor is recorded on duty for today yet. Ask admin to record today&apos;s duty schedule so nurses can recommend the right doctor.
              </div>
            ) : (
              <div className="space-y-3">
                {doctorsOnDutyToday.map((doctor) => (
                  <div key={doctor.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">Dr. {doctor.full_name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {doctor.specialty || 'General medicine'}
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        On duty
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Appointments Today</p>
                        <p className="text-lg font-bold text-slate-900 mt-1">{doctor.todayAppointments}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Recommended Patients</p>
                        <p className="text-lg font-bold text-slate-900 mt-1">{doctor.recommendedCount}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4 sm:p-6 bg-white border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">Recent Intake Records</h3>
                <p className="text-xs sm:text-sm text-slate-600">Latest patient records and their doctor recommendations.</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                Last 5
              </span>
            </div>

            {recentPatientIntakes.length === 0 ? (
              <p className="text-sm text-slate-500">No patient records yet.</p>
            ) : (
              <div className="space-y-3">
                {recentPatientIntakes.map((patient) => (
                  <div key={patient.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{patient.full_name}</p>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {patient.symptoms || patient.intake_notes || 'No concern recorded yet.'}
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200">
                        {new Date(patient.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-800">Recorded by:</span> {getStaffDisplayName(patient.created_by_staff_id)}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Recommended doctor:</span> {getStaffDisplayName(patient.recommended_doctor_id)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {sidebarOpen && isMobile && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative md:translate-x-0 md:w-20 lg:w-64 z-40 w-64 bg-gradient-to-b ${roleTheme.shell} text-white transition-all duration-300 flex flex-col shadow-xl h-screen`}>
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <Image src="/images/profile.jpg" alt="ClinicCare Logo" width={40} height={40} className={`rounded-lg object-cover ring-2 ${currentRole === 'doctor' ? 'ring-emerald-400/60' : currentRole === 'nurse' ? 'ring-cyan-400/60' : 'ring-blue-400/60'}`} />
            {!isMobile && (
              <div>
                <h1 className="font-bold text-base text-white">Clinic Care</h1>
                <p className="text-xs text-slate-300">{workspaceTitle}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id)
                if (isMobile) setSidebarOpen(false)
              }}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition font-medium text-sm ${activeTab === item.id ? `bg-gradient-to-r ${roleTheme.accent} text-white shadow-lg` : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <item.icon size={20} />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badgeCount ? (
                <span className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${activeTab === item.id ? 'bg-white/20 text-white' : 'bg-rose-500 text-white shadow-sm'}`}>
                  {item.badgeCount > 99 ? '99+' : item.badgeCount}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

      </aside>

      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden w-full md:w-auto">
        <header className={`bg-white shadow-sm border-b border-gray-100 flex-shrink-0 ${currentRole === 'doctor' ? 'bg-emerald-50/60' : currentRole === 'nurse' ? 'bg-cyan-50/60' : ''}`}>
          <div className="px-4 py-3 md:px-8 md:py-4 flex items-center justify-between gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 flex-shrink-0 md:hidden">
              <Menu size={24} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Clinic Care</p>
              <div className="min-w-0">
                <h2 className="text-base md:text-xl font-bold text-gray-900 truncate">{workspaceTitle}</h2>
                <p className="text-xs md:text-sm text-gray-500 truncate">
                  <span className="font-semibold text-slate-700">{currentSectionMeta.title}</span>
                  <span className="px-1.5 text-slate-300">/</span>
                  {currentSectionMeta.subtitle}
                </p>
              </div>
            </div>
            {unreadMessageCount > 0 && (currentRole === 'doctor' || currentRole === 'nurse') && (
              <button
                type="button"
                onClick={() => setActiveTab('messages')}
                className="hidden sm:inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                </span>
                {unreadMessageCount} unread message{unreadMessageCount === 1 ? '' : 's'}
              </button>
            )}
            <PanelProfileMenu
              userName={currentUser?.full_name}
              roleLabel={roleDisplayName}
              roleBadgeClassName={roleTheme.badge}
              iconAccentClassName={currentRole === 'doctor' ? 'text-emerald-700' : currentRole === 'nurse' ? 'text-cyan-700' : 'text-slate-700'}
              onLogout={() => setShowLogoutConfirm(true)}
            />
          </div>
        </header>

        <main className="flex-1 overflow-auto px-3 md:px-8 py-4 md:py-6">
          {activeTab === 'overview' && (currentRole === 'admin' ? renderAdminOverview() : renderDutyOverview())}

          {activeTab === 'intake' && availableTabs.includes('intake') && (
            <PatientsList key="nurse-intake" nurseViewMode="intake" />
          )}
          {activeTab === 'patients' && availableTabs.includes('patients') && (
            <PatientsList key={`patients-${currentRole}`} nurseViewMode={currentRole === 'nurse' ? 'records' : undefined} />
          )}
          {activeTab === 'appointments' && availableTabs.includes('appointments') && <AppointmentsList />}
          {activeTab === 'prescriptions' && availableTabs.includes('prescriptions') && <PrescriptionsList />}
          {activeTab === 'messages' && availableTabs.includes('messages') && (
            <StaffMessagesPanel onUnreadCountChange={setUnreadMessageCount} />
          )}
          {activeTab === 'reports' && availableTabs.includes('reports') && <ReportsList />}
          {activeTab === 'staff' && availableTabs.includes('staff') && <StaffList />}
          {activeTab === 'medicines' && availableTabs.includes('medicines') && <MedicinesList />}
          {activeTab === 'archive' && availableTabs.includes('archive') && <ArchiveComponent />}
          {!availableTabs.includes(activeTab) && <AccessDenied message="You do not have permission for this section." onBack={() => setActiveTab('overview')} />}
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
            subtitle="Securing your session and returning to login"
          />
        </div>
      )}
    </div>
  )
}
