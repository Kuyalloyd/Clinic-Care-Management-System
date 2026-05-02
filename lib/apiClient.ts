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

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status

        if (typeof window !== 'undefined' && status === 401) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user_id')
          localStorage.removeItem('user_email')
          localStorage.removeItem('user_role')
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }

        if (status === 403 && !error?.response?.data?.error) {
          error.response = {
            ...error.response,
            data: {
              error: 'Access denied for this action',
            },
          }
        }

        return Promise.reject(error)
      }
    )
  }

  private async postWithRouteFallback(pathnames: string[], data?: any) {
    let lastError: any

    for (const pathname of pathnames) {
      try {
        return await this.client.post(pathname, data)
      } catch (error: any) {
        lastError = error

        if (error?.response?.status !== 404) {
          throw error
        }
      }
    }

    throw lastError
  }

  login(email: string, password: string) {
    return this.postWithRouteFallback(['/session/login', '/auth/login'], { email, password })
  }

  signup(
    email: string, 
    password: string, 
    fullName: string, 
    phone?: string, 
    role: 'doctor' | 'nurse' | 'receptionist' | 'admin' = 'doctor',
    specialty?: string
  ) {
    return this.postWithRouteFallback(
      ['/session/signup', '/auth/signup'],
      { email, password, fullName, phone, role, specialty }
    )
  }

  logout() {
    return this.postWithRouteFallback(['/session/logout', '/auth/logout'])
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

  getMedicines() {
    return this.client.get('/medicines')
  }

  createMedicine(data: any) {
    return this.client.post('/medicines', data)
  }

  updateMedicine(id: string, data: any) {
    return this.client.put(`/medicines/${id}`, data)
  }

  deleteMedicine(id: string) {
    return this.client.delete(`/medicines/${id}`)
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

  getDutyAssignments() {
    return this.client.get('/duty-assignments')
  }

  saveDutyAssignments(data: { duty_date: string; staff_ids: string[] }) {
    return this.client.post('/duty-assignments', data)
  }

  getMessages() {
    return this.client.get('/messages')
  }

  createMessage(data: {
    recipient_staff_id: string
    patient_id?: string | null
    subject: string
    message_body: string
  }) {
    return this.client.post('/messages', data)
  }

  markMessageRead(id: string) {
    return this.client.put(`/messages/${id}`, { is_read: true })
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
