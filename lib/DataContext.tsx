'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Appointment, Patient, Prescription, Bill, Staff } from './types'
import { apiClient } from './apiClient'

interface DashboardData {
  patients: Patient[]
  appointments: Appointment[]
  prescriptions: Prescription[]
  bills: Bill[]
  staff: Staff[]
}

interface DataContextType {
  data: DashboardData
  loading: boolean
  refreshPatients: () => Promise<void>
  refreshAppointments: () => Promise<void>
  refreshPrescriptions: () => Promise<void>
  refreshBills: () => Promise<void>
  refreshStaff: () => Promise<void>
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
    try {
      const response = await apiClient.getBills()
      setData((prev) => ({ ...prev, bills: response.data || [] }))
    } catch (error) {
      console.error('Failed to fetch bills:', error)
    }
  }, [])

  const refreshStaff = useCallback(async () => {
    try {
      const response = await apiClient.getAllStaff()
      setData((prev) => ({ ...prev, staff: response.data || [] }))
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      const [patientsRes, appointmentsRes, prescriptionsRes, billsRes, staffRes] = await Promise.all([
        apiClient.getAllPatients().catch(e => ({ data: [] })),
        apiClient.getAllAppointments().catch(e => ({ data: [] })),
        apiClient.getAllPrescriptions().catch(e => ({ data: [] })),
        apiClient.getBills().catch(e => ({ data: [] })),
        apiClient.getAllStaff().catch(e => ({ data: [] })),
      ])
      setData({
        patients: patientsRes.data || [],
        appointments: appointmentsRes.data || [],
        prescriptions: prescriptionsRes.data || [],
        bills: billsRes.data || [],
        staff: staffRes.data || [],
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <DataContext.Provider value={{ data, loading, refreshPatients, refreshAppointments, refreshPrescriptions, refreshBills, refreshStaff, refreshAll }}>
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
