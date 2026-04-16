'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/apiClient'
import { useDashboardData } from '@/lib/DataContext'
import { Staff } from '@/lib/types'
import { Plus, Edit2, Phone, Mail, Calendar, Trash2, Loader2 } from 'lucide-react'
import ActionToast from './ActionToast'

const roleColors: Record<string, string> = {
  doctor: 'bg-blue-100 text-blue-800',
  nurse: 'bg-green-100 text-green-800',
  admin: 'bg-orange-100 text-orange-800'
}

const avatarColors: Record<string, string> = {
  doctor: 'bg-blue-600',
  nurse: 'bg-green-600',
  admin: 'bg-orange-600'
}

export default function StaffList() {
  const { refreshStaff, refreshDutyAssignments } = useDashboardData()
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeRole, setActiveRole] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [savingDutyId, setSavingDutyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    type: 'info',
  })

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ open: true, message, type })
    setTimeout(() => {
      setToast((current) => ({ ...current, open: false }))
    }, 2600)
  }

  useEffect(() => {
    const userEmail = localStorage.getItem('user_email')
    setCurrentUserEmail(userEmail)
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      setError(null)
      console.log('📝 Fetching staff from API')
      const response = await apiClient.getAllStaff()
      console.log('✅ API Response:', response)
      
      let staffData: Staff[] = []
      if (response.data && Array.isArray(response.data)) {
        staffData = response.data
        console.log('✅ Staff set to:', response.data)
      } else if (Array.isArray(response.data)) {
        staffData = response.data
      } else {
        console.warn('⚠️ Unexpected response format:', response)
        staffData = []
      }

      const userEmail = localStorage.getItem('user_email')
      if (userEmail) {
        staffData = staffData.filter((member) => member.email !== userEmail)
        console.log('📝 Filtered out current user:', userEmail)
      }

      setStaff(staffData)
    } catch (error: any) {
      console.error('❌ Failed to fetch staff:', error)
      const errorMsg = error.response?.data?.error || error.message || 'Failed to load staff'
      setError(errorMsg)
      setStaff([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStaff = async (memberId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/staff/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete staff')
      }

      showToast('Staff member deleted successfully.', 'success')
      setShowDeleteModal(null)
      fetchStaff()
    } catch (error: any) {
      console.error('Failed to delete staff:', error)
      showToast(error?.message || 'Failed to delete staff member.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleDuty = async (member: Staff) => {
    try {
      setSavingDutyId(member.id)
      await apiClient.updateStaff(member.id, { is_on_duty: !member.is_on_duty })
      await Promise.all([
        fetchStaff(),
        refreshStaff(),
        refreshDutyAssignments(),
      ])
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Failed to update duty status'
      alert(msg)
    } finally {
      setSavingDutyId(null)
    }
  }

  const filteredStaff = staff.filter((member) => {
    if (member.role === 'receptionist') return false
    const matchesRole = !activeRole || member.role === activeRole
    const matchesSearch = 
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.specialty && member.specialty.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesRole && matchesSearch
  })

  const roleOptions = [
    { label: 'All Roles', value: null },
    { label: 'Doctor', value: 'doctor' },
    { label: 'Nurse', value: 'nurse' },
  ]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  if (loading) {
    return <div className="text-center py-8">Loading staff...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Accounts</h1>
          <p className="text-gray-600 text-sm mt-1">Manage staff members and access controls</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Add Staff Member
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-bold">Unable to load staff</p>
          <p className="text-red-600 text-sm mt-2">{error}</p>
          <button 
            onClick={fetchStaff}
            className="mt-3 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <StaffForm onSuccess={() => { fetchStaff(); setShowForm(false) }} onClose={() => setShowForm(false)} />
        </div>
      )}

      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <StaffForm 
            staff={staff.find(s => s.id === editingId)} 
            onSuccess={() => { fetchStaff(); setEditingId(null) }} 
            onClose={() => setEditingId(null)} 
          />
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Staff Member</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this staff member? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const member = staff.find(s => s.id === showDeleteModal)
                  if (member) {
                    handleDeleteStaff(member.id, member.full_name)
                  }
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Deleting...
                  </span>
                ) : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ActionToast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
      />

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name, email, or specialty..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        />
      </div>

      {/* Role Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {roleOptions.map((option) => (
          <button
            key={option.value || 'all'}
            onClick={() => setActiveRole(option.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              activeRole === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No staff members found</p>
          </div>
        ) : (
          filteredStaff.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:bg-gray-50 transition"
            >
              {/* Avatar & Name */}
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`${avatarColors[member.role]} w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0`}
                >
                  <span className="text-white text-lg font-bold">
                    {getInitial(member.full_name)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-base mb-1">
                    {member.full_name}
                  </h3>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      roleColors[member.role]
                    }`}
                  >
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                {member.specialty && (
                  <div className="text-sm">
                    <span className="text-gray-600">Department:</span>
                    <p className="font-medium text-gray-900">{member.specialty}</p>
                  </div>
                )}
                <div className="text-sm flex items-center gap-2 text-gray-700">
                  <Mail size={16} className="text-gray-400" />
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="text-sm flex items-center gap-2 text-gray-700">
                  <Phone size={16} className="text-gray-400" />
                  {member.phone}
                </div>
                <div className="text-sm flex items-center gap-2 text-gray-700">
                  <Calendar size={16} className="text-gray-400" />
                  {formatDate(member.created_at)}
                </div>
                <div className="pt-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      member.is_on_duty ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {member.is_on_duty ? 'On Duty' : 'Off Duty'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setEditingId(member.id)}
                  className="flex-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteModal(member.id)}
                  className="flex-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>

              <button
                onClick={() => handleToggleDuty(member)}
                disabled={savingDutyId === member.id}
                className={`w-full mt-2 px-3 py-2 rounded-lg font-medium text-sm transition ${
                  member.is_on_duty
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-green-600 text-white hover:bg-green-700'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {savingDutyId === member.id ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Saving...
                  </span>
                ) : member.is_on_duty ? 'Set Off Duty' : 'Set On Duty'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function StaffForm({ onSuccess, onClose, staff }: { onSuccess: () => void; onClose: () => void; staff?: Staff }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: staff?.full_name || '',
    email: staff?.email || '',
    password: '',
    phone: staff?.phone || '',
    role: staff?.role || 'doctor',
    specialty: staff?.specialty || ''
  })

  const isEditing = !!staff

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const dataToSave = {
        ...formData,
        role: formData.role.toLowerCase(), // Convert to lowercase for Supabase
      }

      if (isEditing) {
        delete (dataToSave as any).password
      }

      if (isEditing) {
        console.log('📝 Updating staff:', dataToSave)
        await apiClient.updateStaff(staff!.id, dataToSave)
        console.log('✅ Staff updated successfully')
      } else {
        console.log('📝 Creating staff:', dataToSave)
        await apiClient.createStaff(dataToSave)
        console.log('✅ Staff created successfully')
      }
      
      onSuccess()
    } catch (error: any) {
      console.error('❌ Failed to save staff:', error)
      const errorMsg = error.response?.data?.error || error.message || 'Failed to save staff'
      alert(`Error: ${errorMsg}`)
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="Set initial login password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">Give this password to the staff member for first login.</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specialty/Department</label>
            <input
              type="text"
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              placeholder="e.g., Cardiology, Emergency, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Staff' : 'Add Staff')}
          </button>
        </div>
      </form>
    </div>
  )
}
