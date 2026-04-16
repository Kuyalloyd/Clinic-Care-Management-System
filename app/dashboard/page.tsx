'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Menu, LogOut, Home, Users, Calendar, Pill, BarChart3, Archive, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useDashboardData } from '@/lib/DataContext'
import { apiClient } from '@/lib/apiClient'
import PatientsList from '@/components/PatientsList'
import AppointmentsList from '@/components/AppointmentsList'
import PrescriptionsList from '@/components/PrescriptionsList'
import ReportsList from '@/components/ReportsList'
import StaffList from '@/components/StaffList'
import ArchiveComponent from '@/components/ArchiveComponent'
import AccessDenied from '@/components/AccessDenied'
import BrandLoadingOverlay from '@/components/BrandLoadingOverlay'

type TabType = 'overview' | 'patients' | 'appointments' | 'prescriptions' | 'reports' | 'staff' | 'archive'
type UserRole = 'admin' | 'doctor' | 'nurse' | 'receptionist'

export default function DashboardPage() {
  const router = useRouter()
  const { data, refreshAll, refreshAppointments, refreshDutyAssignments } = useDashboardData()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [selectedDutyDate, setSelectedDutyDate] = useState<string>(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  })
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [selectedDutyStaffIds, setSelectedDutyStaffIds] = useState<string[]>([])
  const [savingDutyAssignments, setSavingDutyAssignments] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const currentUserId = localStorage.getItem('user_id') || ''
    const currentUserEmail = localStorage.getItem('user_email') || ''

    if (!token) {
      router.push('/login')
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
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_email')
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
  const roleDisplayName =
    currentRole === 'admin' ? 'Admin' : currentRole === 'doctor' ? 'Doctor' : 'Nurse'
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
    admin: ['overview', 'patients', 'appointments', 'prescriptions', 'reports', 'staff', 'archive'],
    doctor: ['overview', 'appointments', 'prescriptions', 'reports'],
    nurse: ['overview', 'patients', 'appointments', 'reports'],
    receptionist: ['overview'],
  }

  const availableTabs = roleTabs[currentRole] || roleTabs.admin
  const navItems: Array<{ id: TabType; label: string; icon: typeof Home }> = (() => {
    if (currentRole === 'doctor') {
      return [
        { id: 'overview', label: 'My Dashboard', icon: Home },
        { id: 'appointments', label: 'My Consults', icon: Calendar },
        { id: 'prescriptions', label: 'My Prescriptions', icon: Pill },
        { id: 'reports', label: 'Analytics', icon: BarChart3 },
      ]
    }

    if (currentRole === 'nurse') {
      return [
        { id: 'overview', label: 'My Dashboard', icon: Home },
        { id: 'patients', label: 'Patients', icon: Users },
        { id: 'appointments', label: 'Ward Schedule', icon: Calendar },
        { id: 'reports', label: 'Analytics', icon: BarChart3 },
      ]
    }

    return [
      { id: 'overview', label: 'Dashboard', icon: Home },
      { id: 'patients', label: 'Patients', icon: Users },
      { id: 'appointments', label: 'Appointments', icon: Calendar },
      { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'staff', label: 'Staff', icon: Users },
      { id: 'archive', label: 'Archive', icon: Archive },
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

  const moveVisibleMonth = (offset: number) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1)
    setVisibleMonth(nextMonth)
    setSelectedDutyDate(toDateKey(nextMonth))
  }

  useEffect(() => {
    setSelectedDutyStaffIds(selectedDateDutyAssignments.map((assignment) => assignment.staff_id))
  }, [selectedDutyDate, data.dutyAssignments])

  const toggleDutyStaff = (staffId: string) => {
    setSelectedDutyStaffIds((current) =>
      current.includes(staffId) ? current.filter((id) => id !== staffId) : [...current, staffId]
    )
  }

  const handleSaveDutyAssignments = async () => {
    try {
      setSavingDutyAssignments(true)
      await apiClient.saveDutyAssignments({
        duty_date: selectedDutyDate,
        staff_ids: selectedDutyStaffIds,
      })
      await refreshDutyAssignments()
    } catch (error: any) {
      alert(error?.response?.data?.error || error?.message || 'Failed to save duty record')
    } finally {
      setSavingDutyAssignments(false)
    }
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
  const completedAppointments = data.appointments.filter((a) => a.status === 'completed').length
  const pendingPrescriptions = data.prescriptions.filter((p) => !p.is_completed).length

  const renderAdminOverview = () => (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-slate-300">Admin Operations</p>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">Clinic control center</h3>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl">
              Real-time view of staffing, consultations, prescriptions, and duty assignments for today's operations.
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pending Scripts</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{pendingPrescriptions}</p>
              <p className="text-xs text-slate-500 mt-1">Need completion review</p>
            </div>
            <span className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 inline-flex items-center justify-center">
              <Pill className="w-5 h-5 text-rose-600" />
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">Duty Operations Center</h3>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Planning and allocation</span>
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
            {data.patients.length === 0 ? (
              <div className="px-4 sm:px-6 py-8 sm:py-12 text-center">
                <p className="text-sm text-gray-500">No patients yet</p>
              </div>
            ) : (
              data.patients.slice(0, 6).map((patient) => (
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
        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-3 sm:gap-4">
          <div className="card p-4 sm:p-6 bg-white border border-cyan-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-cyan-700 uppercase tracking-wide">Ward Operations</p>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Nurse duty view</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 line-clamp-2">Track room prep, patient handoff, and follow-up tasks during shift.</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700 flex-shrink-0">On duty</span>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="rounded-2xl bg-cyan-50 p-4 border border-cyan-100">
                <p className="text-xs sm:text-sm text-cyan-700 font-medium">Tasks today</p>
                <p className="text-2xl sm:text-3xl font-bold text-cyan-950 mt-1">{dutyTaskCards.length}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="rounded-2xl bg-orange-50 p-4 border border-orange-100">
                  <p className="text-xs sm:text-sm text-orange-700 font-medium">Scheduled</p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-950 mt-1">{dutyTaskCards.filter((t) => t.status === 'scheduled').length}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100">
                  <p className="text-xs sm:text-sm text-emerald-700 font-medium">Completed</p>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-950 mt-1">{completedWorkCount}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <p className="text-xs sm:text-sm text-slate-700 font-medium">Focus</p>
                <p className="text-sm text-slate-900 mt-1">Keep the room ready, collect vitals, assist during consults, and complete follow-up notes.</p>
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6 bg-white border border-slate-200 shadow-sm">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Shift checklist</h3>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-700 list-disc pl-5">
              <li>Prepare room and patient before doctor consultation.</li>
              <li>Record vitals and brief patient concerns.</li>
              <li>Assist during procedure or consultation as required.</li>
              <li>Update reminders and complete the task when done.</li>
            </ul>
          </div>
        </div>

        <div className="card p-4 sm:p-6 bg-white border border-cyan-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">Shift tasks</h3>
              <p className="text-xs sm:text-sm text-slate-600 line-clamp-1">Ordered for room prep and support</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 flex-shrink-0">Today</span>
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
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-cyan-100 text-cyan-700'}`}>
                      {task.status}
                    </span>
                    {task.status !== 'completed' ? (
                      <button
                        type="button"
                        onClick={() => updateDutyTaskStatus(task.id, 'completed')}
                        disabled={updatingTaskId === task.id}
                        className="text-xs px-3 py-1 rounded-md bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50"
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
    <div className="flex h-screen bg-gray-100">
      {sidebarOpen && isMobile && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative md:translate-x-0 md:w-20 lg:w-64 z-40 w-64 bg-gradient-to-b ${roleTheme.shell} text-white transition-all duration-300 flex flex-col shadow-xl h-screen`}>
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <Image src="/images/profile.jpg" alt="ClinicCare Logo" width={40} height={40} className={`rounded-lg object-cover ring-2 ${currentRole === 'doctor' ? 'ring-emerald-400/60' : currentRole === 'nurse' ? 'ring-cyan-400/60' : 'ring-blue-400/60'}`} />
            {!isMobile && (
              <div>
                <h1 className="font-bold text-base text-white">Clinic Care</h1>
                <p className="text-xs text-slate-300">{roleDisplayName} Panel</p>
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition font-medium text-sm ${activeTab === item.id ? `bg-gradient-to-r ${roleTheme.accent} text-white shadow-lg` : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition font-medium text-sm">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden w-full md:w-auto">
        <header className={`bg-white shadow-sm border-b border-gray-100 flex-shrink-0 ${currentRole === 'doctor' ? 'bg-emerald-50/60' : currentRole === 'nurse' ? 'bg-cyan-50/60' : ''}`}>
          <div className="px-4 py-3 md:px-8 md:py-4 flex items-center justify-between gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 flex-shrink-0 md:hidden">
              <Menu size={24} />
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-3">
              <Image
                src="/images/profile.jpg"
                alt="Clinic Care logo"
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg object-cover ring-2 ring-slate-200 flex-shrink-0"
              />
              <div className="min-w-0">
                <h2 className="text-base md:text-xl font-bold text-gray-900 truncate">Clinic Care Dashboard</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs md:text-sm text-gray-500 truncate">{currentUser?.full_name ? `${currentUser.full_name}` : `${roleDisplayName} Panel`}</p>
                  <span className={`text-[10px] md:text-xs font-semibold px-2 py-1 rounded-full ${roleTheme.badge}`}>{roleDisplayName}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-3 md:px-8 py-4 md:py-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h2 className="section-title">{currentRole === 'admin' ? 'Dashboard Overview' : `${roleDisplayName} Duty Dashboard`}</h2>
                {currentRole !== 'admin' && <p className="text-sm text-gray-600 mt-2">This panel shows tasks currently assigned to you while on duty.</p>}
              </div>
              {currentRole === 'admin' ? renderAdminOverview() : renderDutyOverview()}
            </div>
          )}

          {activeTab === 'patients' && availableTabs.includes('patients') && <PatientsList />}
          {activeTab === 'appointments' && availableTabs.includes('appointments') && <AppointmentsList />}
          {activeTab === 'prescriptions' && availableTabs.includes('prescriptions') && <PrescriptionsList />}
          {activeTab === 'reports' && availableTabs.includes('reports') && <ReportsList />}
          {activeTab === 'staff' && availableTabs.includes('staff') && <StaffList />}
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
