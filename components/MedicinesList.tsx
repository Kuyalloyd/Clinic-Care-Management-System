'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/apiClient'
import { useDashboardData } from '@/lib/DataContext'
import { Medicine } from '@/lib/types'
import { formatMedicineAmount, isValidMedicineUnit, MEDICINE_UNIT_SUGGESTIONS, normalizeMedicineUnit } from '@/lib/medicine'
import { Plus, Edit2, Trash2, Loader2, Package, AlertTriangle } from 'lucide-react'
import ActionToast from './ActionToast'

type UserRole = 'admin' | 'doctor' | 'nurse' | ''

export default function MedicinesList() {
  const { data, refreshMedicines } = useDashboardData()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentRole, setCurrentRole] = useState<UserRole>('')
  const [showForm, setShowForm] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
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
    const loadMedicines = async () => {
      setLoading(true)
      await refreshMedicines()
      setLoading(false)
    }

    loadMedicines()
  }, [refreshMedicines])

  useEffect(() => {
    const storedRole = localStorage.getItem('user_role')
    const userEmail = (localStorage.getItem('user_email') || '').toLowerCase()
    const userId = localStorage.getItem('user_id') || ''

    const member = data.staff.find(
      (staffMember) =>
        staffMember.id === userId || staffMember.email?.toLowerCase() === userEmail
    )

    if (member?.role === 'admin' || member?.role === 'doctor' || member?.role === 'nurse') {
      setCurrentRole(member.role)
      return
    }

    if (storedRole === 'admin' || storedRole === 'doctor' || storedRole === 'nurse') {
      setCurrentRole(storedRole)
      return
    }

    setCurrentRole('')
  }, [data.staff])

  const canManageMedicines = currentRole === 'admin'
  const now = new Date()
  const thirtyDaysFromNow = new Date(now)
  thirtyDaysFromNow.setDate(now.getDate() + 30)

  const lowStockCount = data.medicines.filter((medicine) => medicine.quantity <= medicine.reorder_level).length
  const expiringSoonCount = data.medicines.filter((medicine) => {
    if (!medicine.expiry_date) return false
    const expiryDate = new Date(medicine.expiry_date)
    return expiryDate >= now && expiryDate <= thirtyDaysFromNow
  }).length

  const filteredMedicines = data.medicines.filter((medicine) => {
    const query = searchTerm.toLowerCase()
    return (
      medicine.name.toLowerCase().includes(query) ||
      (medicine.category || '').toLowerCase().includes(query) ||
      (medicine.supplier || '').toLowerCase().includes(query)
    )
  })

  const handleDeleteMedicine = async (medicine: Medicine) => {
    if (!confirm(`Are you sure you want to delete ${medicine.name} from inventory?`)) return

    try {
      setDeletingId(medicine.id)
      await apiClient.deleteMedicine(medicine.id)
      await refreshMedicines()
      showToast('Medicine deleted successfully.', 'success')
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to delete medicine'
      showToast(message, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (value?: string | null) => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return <div className="text-center py-8">Loading medicines...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Medicine Inventory</h2>
          <p className="text-gray-600 text-sm">Track what medicine is available, incoming, and running low</p>
        </div>
        {canManageMedicines && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary btn-lg w-full sm:w-auto"
          >
            <Plus size={20} />
            Add Medicine
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Inventory Items</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{data.medicines.length}</p>
              <p className="text-xs text-slate-500 mt-1">Recorded medicines</p>
            </div>
            <span className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 inline-flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Low Stock</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{lowStockCount}</p>
              <p className="text-xs text-slate-500 mt-1">At or below reorder level</p>
            </div>
            <span className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 inline-flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Expiring Soon</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{expiringSoonCount}</p>
              <p className="text-xs text-slate-500 mt-1">Within the next 30 days</p>
            </div>
            <span className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 inline-flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </span>
          </div>
        </div>
      </div>

      {!canManageMedicines && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-700">Only the admin can add, update, or remove medicine inventory records.</p>
        </div>
      )}

      {canManageMedicines && data.medicines.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            No medicine inventory records have been added yet. Use `Add Medicine` to create stock items here.
            Prescriptions and medicine inventory are tracked separately.
          </p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <MedicineForm
            onSuccess={async () => {
              await refreshMedicines()
              setShowForm(false)
            }}
            onClose={() => setShowForm(false)}
          />
        </div>
      )}

      {editingMedicine && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <MedicineForm
            medicine={editingMedicine}
            onSuccess={async () => {
              await refreshMedicines()
              setEditingMedicine(null)
            }}
            onClose={() => setEditingMedicine(null)}
          />
        </div>
      )}

      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search medicines by name, category, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Medicine</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Reorder</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Notes</th>
                {canManageMedicines && <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={canManageMedicines ? 8 : 7} className="px-6 py-8 text-center text-gray-500">
                    No medicines found
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((medicine) => {
                  const isLowStock = medicine.quantity <= medicine.reorder_level

                  return (
                    <tr key={medicine.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{medicine.name}</p>
                          <p className="text-xs text-gray-500">Updated {formatDate(medicine.updated_at)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {medicine.category || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {formatMedicineAmount(medicine.quantity, medicine.unit)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatMedicineAmount(medicine.reorder_level, medicine.unit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(medicine.expiry_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {medicine.supplier || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                        <span className="line-clamp-2">{medicine.notes || '-'}</span>
                      </td>
                      {canManageMedicines && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingMedicine(medicine)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteMedicine(medicine)}
                              disabled={deletingId === medicine.id}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                            >
                              {deletingId === medicine.id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <Trash2 size={18} />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ActionToast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
      />
    </div>
  )
}

function MedicineForm({
  medicine,
  onSuccess,
  onClose,
}: {
  medicine?: Medicine
  onSuccess: () => void | Promise<void>
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: medicine?.name || '',
    category: medicine?.category || '',
    quantity: medicine?.quantity?.toString() || '0',
    unit: normalizeMedicineUnit(medicine?.unit),
    reorder_level: medicine?.reorder_level?.toString() || '0',
    supplier: medicine?.supplier || '',
    expiry_date: medicine?.expiry_date || '',
    notes: medicine?.notes || '',
  })

  const isEditing = !!medicine

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    if (!isValidMedicineUnit(formData.unit)) {
      alert('Unit must be text like pcs, tablets, bottles, or boxes.')
      setLoading(false)
      return
    }

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        quantity: parseInt(formData.quantity, 10) || 0,
        unit: normalizeMedicineUnit(formData.unit),
        reorder_level: parseInt(formData.reorder_level, 10) || 0,
        supplier: formData.supplier,
        expiry_date: formData.expiry_date || null,
        notes: formData.notes,
      }

      if (medicine) {
        await apiClient.updateMedicine(medicine.id, payload)
      } else {
        await apiClient.createMedicine(payload)
      }

      await onSuccess()
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to save medicine'
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {isEditing ? 'Edit Medicine' : 'Add Medicine'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold"
        >
          X
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medicine Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g., Antibiotic"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
            <input
              type="text"
              list="medicine-unit-options"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              placeholder="pcs, boxes, bottles"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <datalist id="medicine-unit-options">
              {MEDICINE_UNIT_SUGGESTIONS.map((unitOption) => (
                <option key={unitOption} value={unitOption} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-gray-500">Use a text unit like `pcs`, `tablets`, `boxes`, or `bottles`.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reorder Level</label>
            <input
              type="number"
              name="reorder_level"
              value={formData.reorder_level}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
            <input
              type="text"
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
            <input
              type="date"
              name="expiry_date"
              value={formData.expiry_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Arrival details, storage notes, or reminders"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
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
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Medicine'}
          </button>
        </div>
      </form>
    </div>
  )
}
