import axios, { AxiosInstance } from 'axios'

class APIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
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
    return this.client.post('/auth/login', { email, password })
  }

  signup(email: string, password: string, fullName: string) {
    return this.client.post('/auth/signup', { email, password, fullName })
  }

  logout() {
    return this.client.post('/auth/logout')
  }

  getAllPatients() {
    return this.client.get('/patients')
  }

  getPatient(id: string) {
    return this.client.get(`/patients/${id}`)
  }

  createPatient(data: any) {
    return this.client.post('/patients', data)
  }

  updatePatient(id: string, data: any) {
    return this.client.put(`/patients/${id}`, data)
  }

  deletePatient(id: string) {
    return this.client.delete(`/patients/${id}`)
  }

  getAllAppointments() {
    return this.client.get('/appointments')
  }

  getAppointment(id: string) {
    return this.client.get(`/appointments/${id}`)
  }

  createAppointment(data: any) {
    return this.client.post('/appointments', data)
  }

  updateAppointment(id: string, data: any) {
    return this.client.put(`/appointments/${id}`, data)
  }

  deleteAppointment(id: string) {
    return this.client.delete(`/appointments/${id}`)
  }

  getAllPrescriptions() {
    return this.client.get('/prescriptions')
  }

  getPrescriptionsByPatient(patientId: string) {
    return this.client.get(`/prescriptions?patient_id=${patientId}`)
  }

  createPrescription(data: any) {
    return this.client.post('/prescriptions', data)
  }

  updatePrescription(id: string, data: any) {
    return this.client.put(`/prescriptions/${id}`, data)
  }

  getBills(patientId?: string) {
    const url = patientId ? `/bills?patient_id=${patientId}` : '/bills'
    return this.client.get(url)
  }

  createBill(data: any) {
    return this.client.post('/bills', data)
  }

  updateBillStatus(id: string, status: string) {
    return this.client.put(`/bills/${id}`, { status })
  }

  markBillAsPaid(id: string) {
    return this.client.post(`/bills/${id}/mark-paid`)
  }

  generateReport(data: any) {
    return this.client.post('/reports', data)
  }

  getReports(patientId?: string) {
    const url = patientId ? `/reports?patient_id=${patientId}` : '/reports'
    return this.client.get(url)
  }

  getAllStaff() {
    return this.client.get('/staff')
  }

  createStaff(data: any) {
    return this.client.post('/staff', data)
  }

  updateStaff(id: string, data: any) {
    return this.client.put(`/staff/${id}`, data)
  }

  deleteStaff(id: string) {
    return this.client.delete(`/staff/${id}`)
  }

  sendEmail(data: { to: string; subject: string; htmlContent: string; textContent?: string }) {
    return this.client.post('/email/send', data)
  }

  getArchived(type: string) {
    return this.client.get(`/archive?type=${type}`)
  }

  restoreArchived(id: string, type: string) {
    return this.client.post(`/archive/${id}`, { type })
  }

  deleteArchived(id: string, type: string) {
    return this.client.delete(`/archive/${id}`, { data: { type } })
  }
}

export const apiClient = new APIClient()
