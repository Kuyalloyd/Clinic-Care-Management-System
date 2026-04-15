'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Appointment, Patient, Prescription, Bill, Staff, DutyAssignment } from './types'
import { apiClient } from './apiClient'

interface DashboardData {
  patients: Patient[]
  appointments: Appointment[]
  prescriptions: Prescription[]
  bills: Bill[]
  staff: Staff[]
  dutyAssignments: DutyAssignment[]
}

interface DataContextType {
  data: DashboardData
  loading: boolean
  refreshPatients: () => Promise<void>
  refreshAppointments: () => Promise<void>
  refreshPrescriptions: () => Promise<void>
  refreshBills: () => Promise<void>
  refreshStaff: () => Promise<void>
  refreshDutyAssignments: () => Promise<void>
  refreshAll: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData>({
    patients: [],
    appointments: [],
    prescriptions: [],
    bills: [],
    staff: [],
    dutyAssignments: [],
  })
  const [loading, setLoading] = useState(true)

  const refreshPatients = useCallback(async () => {
    try {
      const response = await apiClient.getAllPatients()
      setData((prev) => ({ ...prev, patients: response.data || [] }))
    } catch (error) {
      console.error('Failed to fetch patients:', error)
    }
  }, [])

  const refreshAppointments = useCallback(async () => {
    try {
      const response = await apiClient.getAllAppointments()
      setData((prev) => ({ ...prev, appointments: response.data || [] }))
    } catch (error) {
      console.error('Failed to fetch appointments:', error)
    }
  }, [])

  const refreshPrescriptions = useCallback(async () => {
    try {
      const response = await apiClient.getAllPrescriptions()
      setData((prev) => ({ ...prev, prescriptions: response.data || [] }))
    } catch (error) {
      console.error('Failed to fetch prescriptions:', error)
    }
  }, [])

  const refreshBills = useCallback(async () => {
    setData((prev) => ({ ...prev, bills: [] }))
  }, [])

  const refreshStaff = useCallback(async () => {
    try {
      const response = await apiClient.getAllStaff()
      setData((prev) => ({ ...prev, staff: response.data || [] }))
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    }
  }, [])

  const refreshDutyAssignments = useCallback(async () => {
    try {
      const response = await apiClient.getDutyAssignments()
      setData((prev) => ({ ...prev, dutyAssignments: response.data || [] }))
    } catch (error) {
      console.error('Failed to fetch duty assignments:', error)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      const [patientsRes, appointmentsRes, prescriptionsRes, staffRes, dutyAssignmentsRes] = await Promise.all([
        apiClient.getAllPatients().catch(() => ({ data: [] })),
        apiClient.getAllAppointments().catch(() => ({ data: [] })),
        apiClient.getAllPrescriptions().catch(() => ({ data: [] })),
        apiClient.getAllStaff().catch(() => ({ data: [] })),
        apiClient.getDutyAssignments().catch(() => ({ data: [] })),
      ])
      setData({
        patients: patientsRes.data || [],
        appointments: appointmentsRes.data || [],
        prescriptions: prescriptionsRes.data || [],
        bills: [],
        staff: staffRes.data || [],
        dutyAssignments: dutyAssignmentsRes.data || [],
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <DataContext.Provider value={{ data, loading, refreshPatients, refreshAppointments, refreshPrescriptions, refreshBills, refreshStaff, refreshDutyAssignments, refreshAll }}>
      {children}
    </DataContext.Provider>
  )
}

export function useDashboardData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useDashboardData must be used within DataProvider')
  }
  return context
}
