export interface Staff {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist'
  phone: string
  specialty?: string
  created_at: string
}

export interface Patient {
  id: string
  email: string
  full_name: string
  date_of_birth: string
  birth_year?: number
  age?: number
  gender: 'M' | 'F' | 'Other'
  phone: string
  address: string
  city: string
  state: string
  zip_code: string
  symptoms?: string
  insurance_provider?: string
  insurance_number?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  created_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  staff_id: string
  appointment_date: string
  appointment_time: string
  reason: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show'
  notes?: string
  created_at: string
}

export interface Prescription {
  id: string
  patient_id: string
  staff_id: string
  medication_name: string
  dosage: string
  unit: 'mg' | 'ml' | 'g' | 'mcg' | 'IU'
  frequency: string
  duration: string
  instructions: string
  refills: number
  prescribed_date: string
  expiry_date: string
  is_completed: boolean
  created_at: string
}

export interface Bill {
  id: string
  patient_id: string
  amount: number
  status: 'pending' | 'paid' | 'overdue'
  description: string
  due_date: string
  paid_date?: string
  created_at: string
}

export interface MedicalReport {
  id: string
  patient_id: string
  staff_id: string
  report_type: string
  content: string
  created_at: string
}
