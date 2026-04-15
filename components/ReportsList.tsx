'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/apiClient'
import { Patient, Appointment } from '@/lib/types'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Download } from 'lucide-react'

export default function ReportsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [patientsRes, appointmentsRes] = await Promise.all([
        apiClient.getAllPatients(),
        apiClient.getAllAppointments(),
      ])
      setPatients(patientsRes.data)
      setAppointments(appointmentsRes.data)
    } catch (error) {
      console.error('Failed to fetch report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalPatients = patients.length
  const monthlyAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.appointment_date)
    const now = new Date()
    return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear()
  }).length
  const completedAppointments = appointments.filter((apt) => apt.status === 'completed').length

  const monthlyCompletedVisitsData = (() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    const monthlyData: Record<string, number> = {}

    appointments.forEach((apt) => {
      if (apt.status !== 'completed' || !apt.appointment_date) return
      const date = new Date(apt.appointment_date)
      const month = monthNames[date.getMonth()]
      if (!month) return
      monthlyData[month] = (monthlyData[month] || 0) + 1
    })

    return monthNames.map((month) => ({
      month,
      Completed: monthlyData[month] || 0,
    }))
  })()

  const visitsData = (() => {
    const monthlyData: any = {}
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    appointments.forEach(apt => {
      if (apt.appointment_date) {
        const date = new Date(apt.appointment_date)
        const monthIndex = date.getMonth()
        const month = monthNames[monthIndex]
        if (!monthlyData[month]) {
          monthlyData[month] = 0
        }
        monthlyData[month] += 1
      }
    })
    
    return monthNames.slice(0, 6).map(month => ({
      month,
      Visits: monthlyData[month] || 0,
    }))
  })()

  const appointmentTypes = appointments.reduce((acc: any, apt) => {
    const type = apt.reason || 'Other'
    const existing = acc.find((item: any) => item.name === type)
    if (existing) {
      existing.value += 1
    } else {
      acc.push({ name: type, value: 1 })
    }
    return acc
  }, [])

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  const handleExport = () => {
    const reportData = {
      'Report Date': new Date().toLocaleDateString(),
      'Total Patients': totalPatients,
      'Monthly Appointments': monthlyAppointments,
      'Completed Appointments': completedAppointments,
    }

    const csvContent = [
      ['Clinic Report Export'],
      [],
      ...Object.entries(reportData).map(([key, value]) => [key, value]),
      [],
      ['Monthly Completed Visits Data'],
      ['Month', 'Completed'],
      ...monthlyCompletedVisitsData.map(item => [item.month, item.Completed]),
      [],
      ['Patient Visits Data'],
      ['Month', 'Visits'],
      ...visitsData.map(item => [item.month, item.Visits]),
      [],
      ['Appointment Types'],
      ['Type', 'Count'],
      ...appointmentTypes.map((item: any) => [item.name, item.value]),
    ]
      .map(row => row.map((cell: string | number) => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `clinic-report-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return <div className="text-center py-8">Loading reports...</div>
  }

  const hasData = patients.length > 0 || appointments.length > 0

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Reports & Analytics</h2>
          <p className="text-gray-600 text-sm">View clinic performance and statistics</p>
        </div>
        <div className="bg-white rounded-lg shadow p-12 border border-gray-200 text-center">
          <p className="text-gray-500 text-xl mb-4">This table is empty</p>
          <p className="text-gray-400 text-sm mb-6">No data available. Start by adding patients or appointments.</p>
          <div className="inline-block px-6 py-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-600 text-sm">📊 Reports will appear here once you have data</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Reports & Analytics</h2>
          <p className="text-gray-600 text-sm">View clinic performance and statistics</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition">
          <Download size={20} />
          Export Report
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Completed Appointments */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Completed Appointments</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{completedAppointments}</p>
          <p className="text-xs text-gray-500 font-medium">Resolved student visits</p>
        </div>

        {/* Total Patients */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Total Patients</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{totalPatients.toLocaleString()}</p>
          <p className="text-xs text-green-600 font-medium">+8.2% from last month</p>
        </div>

        {/* Monthly Appointments */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Monthly Appointments</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{monthlyAppointments}</p>
          <p className="text-xs text-red-600 font-medium">-11.9% from last month</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Completed Visits Chart */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Completed Visits</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyCompletedVisitsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Bar dataKey="Completed" fill="#3B82F6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Patient Appointments Trend */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Appointments Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={visitsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="Visits" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Appointment Types Distribution */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Types Distribution</h3>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={appointmentTypes.length > 0 ? appointmentTypes : [{ name: 'No Data', value: 1 }]}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value, percent }) => `${name}: ${Math.round(percent * 100)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {appointmentTypes.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value} appointments`} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Patient Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Male Patients</p>
          <p className="text-2xl font-bold text-gray-900">{patients.filter(p => p.gender === 'M').length}</p>
          <p className="text-xs text-gray-500 mt-2">{patients.length > 0 ? Math.round(patients.filter(p => p.gender === 'M').length / patients.length * 100) : 0}% of total</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Female Patients</p>
          <p className="text-2xl font-bold text-gray-900">{patients.filter(p => p.gender === 'F').length}</p>
          <p className="text-xs text-gray-500 mt-2">{patients.length > 0 ? Math.round(patients.filter(p => p.gender === 'F').length / patients.length * 100) : 0}% of total</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Total Appointments</p>
          <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
          <p className="text-xs text-gray-500 mt-2">This year</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Completed Appointments</p>
          <p className="text-2xl font-bold text-gray-900">{appointments.filter(a => a.status === 'completed').length}</p>
          <p className="text-xs text-gray-500 mt-2">{appointments.length > 0 ? Math.round(appointments.filter(a => a.status === 'completed').length / appointments.length * 100) : 0}% success rate</p>
        </div>
      </div>
    </div>
  )
}
