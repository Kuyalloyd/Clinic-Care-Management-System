export interface Staff {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist'
  phone: string
  specialty?: string
  is_on_duty?: boolean
  created_at: string
}

export interface DutyAssignment {
  id: string
  duty_date: string
  staff_id: string
  assigned_by?: string | null
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
  region: string
  zip_code: string
  symptoms?: string
  insurance_provider?: string
  insurance_number?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  recommended_doctor_id?: string | null
  intake_notes?: string | null
  created_by_staff_id?: string | null
  updated_by_staff_id?: string | null
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
  updated_at?: string
  updated_by?: string
  created_at: string
}

export interface Medicine {
  id: string
  name: string
  category?: string | null
  quantity: number
  unit: string
  reorder_level: number
  supplier?: string | null
  expiry_date?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
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

export interface StaffMessage {
  id: string
  sender_staff_id: string
  recipient_staff_id: string
  patient_id?: string | null
  subject: string
  message_body: string
  is_read: boolean
  read_at?: string | null
  created_at: string
}
