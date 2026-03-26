'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Menu, LogOut, Home, Users, Calendar, Pill, DollarSign, FileText, BarChart3, TrendingUp } from 'lucide-react'
import { useDashboardData } from '@/lib/DataContext'
import PatientsList from '@/components/PatientsList'
import AppointmentsList from '@/components/AppointmentsList'
import PrescriptionsList from '@/components/PrescriptionsList'
import BillingList from '@/components/BillingList'
import ReportsList from '@/components/ReportsList'
import StaffList from '@/components/StaffList'

type TabType = 'overview' | 'patients' | 'appointments' | 'prescriptions' | 'billing' | 'reports' | 'staff'

export default function DashboardPage() {
  const router = useRouter()
  const { data, loading: dataLoading, refreshAll } = useDashboardData()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false) // Changed to false for mobile-first
  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      router.push('/login')
    } else {
      setActiveTab('overview')
      setLoading(false)
      refreshAll()
    }

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_email')
    router.push('/login')
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  const navItems: Array<{ id: TabType; label: string; icon: typeof Home }> = [
    { id: 'overview', label: 'Dashboard', icon: Home },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
    { id: 'billing', label: 'Billing', icon: DollarSign },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'staff', label: 'Staff', icon: Users },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`${
          sidebarOpen 
            ? 'translate-x-0' 
            : '-translate-x-full'
        } fixed md:relative md:translate-x-0 md:w-20 lg:w-64 z-40 w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex flex-col shadow-xl h-screen`}
      >
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <Image 
              src="/images/profile.jpg" 
              alt="ClinicCare Logo" 
              width={40}
              height={40}
              className="rounded-lg object-cover"
            />
            {!isMobile && (
              <div>
                <h1 className="font-bold text-base text-white">Clinic Care</h1>
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition font-medium text-sm ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition font-medium text-sm"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden w-full md:w-auto">
        <header className="bg-white shadow-sm border-b border-gray-100 flex-shrink-0">
          <div className="px-4 py-3 md:px-8 md:py-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 flex-shrink-0 md:hidden"
            >
              <Menu size={24} />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-base md:text-xl font-bold text-gray-900 truncate">Clinic Care Dashboard</h2>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-3 md:px-8 py-4 md:py-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h2 className="section-title">Dashboard Overview</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6">
                <div className="card p-3 md:p-6 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">Total Patients</p>
                      <p className="text-3xl font-bold text-gray-900">{data.patients.length}</p>
                    </div>
                    <Users className="w-12 h-12 text-blue-100" />
                  </div>
                </div>

                <div className="card p-3 md:p-6 border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">Today's Appointments</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {data.appointments.filter(a => new Date(a.appointment_date).toDateString() === new Date().toDateString()).length}
                      </p>
                    </div>
                    <Calendar className="w-12 h-12 text-green-100" />
                  </div>
                </div>

                <div className="card p-3 md:p-6 border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">Pending Prescriptions</p>
                      <p className="text-3xl font-bold text-gray-900">{data.prescriptions.length}</p>
                    </div>
                    <Pill className="w-12 h-12 text-amber-100" />
                  </div>
                </div>

                <div className="card p-3 md:p-6 border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">Pending Payments</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {data.bills.filter(b => b.status === 'pending').length}
                      </p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-orange-100" />
                  </div>
                </div>

                <div className="card p-3 md:p-6 border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">Outstanding Amount</p>
                      <p className="text-3xl font-bold text-gray-900">
                        ₱{data.bills.reduce((sum, b) => b.status === 'pending' || b.status === 'overdue' ? sum + b.amount : sum, 0).toFixed(2)}
                      </p>
                    </div>
                    <DollarSign className="w-12 h-12 text-red-100" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Today's Appointments</h3>
                <div className="card overflow-hidden">
                  <table className="w-full">
                    <thead className="border-b border-gray-100 bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Patient</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Doctor</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.appointments
                        .filter(a => new Date(a.appointment_date).toDateString() === new Date().toDateString())
                        .slice(0, 8)
                        .map((apt) => {
                          const patient = data.patients.find(p => p.id === apt.patient_id)
                          const doctor = data.staff.find(s => s.id === apt.staff_id)
                          return (
                            <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{patient?.full_name || 'Unknown'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{apt.appointment_time}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{doctor?.full_name || 'Unassigned'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{apt.reason || 'Checkup'}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`badge ${
                                  apt.status === 'scheduled' ? 'badge-primary' :
                                  apt.status === 'completed' ? 'badge-success' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {apt.status}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                  {data.appointments.filter(a => new Date(a.appointment_date).toDateString() === new Date().toDateString()).length === 0 && (
                    <div className="px-6 py-12 text-center">
                      <p className="text-gray-500">No appointments scheduled for today</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Pending Payments</h3>
                <div className="card overflow-hidden">
                  <table className="w-full">
                    <thead className="border-b border-gray-100 bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Patient</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Due Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.bills.filter(b => b.status === 'pending' || b.status === 'overdue').length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <p className="text-gray-500">No pending payments</p>
                          </td>
                        </tr>
                      ) : (
                        data.bills.filter(b => b.status === 'pending' || b.status === 'overdue').slice(0, 10).map((bill) => {
                          const patient = data.patients.find(p => p.id === bill.patient_id)
                          return (
                            <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{patient?.full_name || 'Unknown'}</td>
                              <td className="px-6 py-4 text-sm font-semibold text-orange-600">₱{bill.amount.toFixed(2)}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{new Date(bill.due_date).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{bill.description}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`badge ${
                                  bill.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
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

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Patients</h3>
                <div className="card overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {data.patients.length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <p className="text-gray-500">No patients yet</p>
                      </div>
                    ) : (
                      data.patients.slice(0, 6).map((patient) => (
                        <div key={patient.id} className="px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{patient.full_name}</p>
                            <p className="text-sm text-gray-600">{patient.email}</p>
                          </div>
                          <p className="text-sm text-gray-500">{patient.phone || 'No phone'}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'patients' && <PatientsList />}
          {activeTab === 'appointments' && <AppointmentsList />}
          {activeTab === 'prescriptions' && <PrescriptionsList />}
          {activeTab === 'billing' && <BillingList />}
          {activeTab === 'reports' && <ReportsList />}
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
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
