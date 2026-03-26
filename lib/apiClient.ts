import axios, { AxiosInstance } from 'axios'

class APIClient {
  private client: AxiosInstance

  constructor() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    // Warn if not in production and using localhost fallback
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_APP_URL) {
      console.warn('⚠️ NEXT_PUBLIC_APP_URL is not set. API calls may fail on Vercel. Set it in Vercel Environment Variables.')
    }
    
    this.client = axios.create({
      baseURL: appUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })
  }

  login(email: string, password: string) {
    return this.client.post('/api/auth/login', { email, password })
  }

  signup(email: string, password: string, fullName: string) {
    return this.client.post('/api/auth/signup', { email, password, fullName })
  }

  logout() {
    return this.client.post('/api/auth/logout')
  }

  getAllPatients() {
    return this.client.get('/api/patients')
  }

  getPatient(id: string) {
    return this.client.get(`/api/patients/${id}`)
  }

  createPatient(data: any) {
    return this.client.post('/api/patients', data)
  }

  updatePatient(id: string, data: any) {
    return this.client.put(`/api/patients/${id}`, data)
  }

  deletePatient(id: string) {
    return this.client.delete(`/api/patients/${id}`)
  }

  getAllAppointments() {
    return this.client.get('/api/appointments')
  }

  getAppointment(id: string) {
    return this.client.get(`/api/appointments/${id}`)
  }

  createAppointment(data: any) {
    return this.client.post('/api/appointments', data)
  }

  updateAppointment(id: string, data: any) {
    return this.client.put(`/api/appointments/${id}`, data)
  }

  deleteAppointment(id: string) {
    return this.client.delete(`/api/appointments/${id}`)
  }

  getAllPrescriptions() {
    return this.client.get('/api/prescriptions')
  }

  getPrescriptionsByPatient(patientId: string) {
    return this.client.get(`/api/prescriptions?patient_id=${patientId}`)
  }

  createPrescription(data: any) {
    return this.client.post('/api/prescriptions', data)
  }

  updatePrescription(id: string, data: any) {
    return this.client.put(`/api/prescriptions/${id}`, data)
  }

  getBills(patientId?: string) {
    const url = patientId ? `/api/bills?patient_id=${patientId}` : '/api/bills'
    return this.client.get(url)
  }

  createBill(data: any) {
    return this.client.post('/api/bills', data)
  }

  updateBillStatus(id: string, status: string) {
    return this.client.put(`/api/bills/${id}`, { status })
  }

  markBillAsPaid(id: string) {
    return this.client.post(`/api/bills/${id}/mark-paid`)
  }

  generateReport(data: any) {
    return this.client.post('/api/reports', data)
  }

  getReports(patientId?: string) {
    const url = patientId ? `/api/reports?patient_id=${patientId}` : '/api/reports'
    return this.client.get(url)
  }

  getAllStaff() {
    return this.client.get('/api/staff')
  }

  createStaff(data: any) {
    return this.client.post('/api/staff', data)
  }

  updateStaff(id: string, data: any) {
    return this.client.put(`/api/staff/${id}`, data)
  }

  deleteStaff(id: string) {
    return this.client.delete(`/api/staff/${id}`)
  }

  sendEmail(data: { to: string; subject: string; htmlContent: string; textContent?: string }) {
    return this.client.post('/api/email/send', data)
  }
}

export const apiClient = new APIClient()
