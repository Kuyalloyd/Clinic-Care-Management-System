'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/apiClient'
import { RotateCcw, Trash2, Archive, FolderOpen } from 'lucide-react'

export default function ArchiveComponent() {
  const [archiveType, setArchiveType] = useState<'patients' | 'appointments' | 'prescriptions' | 'staff'>('patients')
  const [archivedItems, setArchivedItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)

  const types = [
    { id: 'patients', label: 'Patients' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'prescriptions', label: 'Prescriptions' },
    { id: 'staff', label: 'Staff' },
  ]

  useEffect(() => {
    fetchArchived()
  }, [archiveType])

  const fetchArchived = async () => {
    setLoading(true)
    try {
      const response = await apiClient.getArchived(archiveType)
      setArchivedItems(response.data?.data || [])
    } catch (error) {
      console.error('Failed to fetch archived items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (id: string) => {
    setRestoring(id)
    try {
      await apiClient.restoreArchived(id, archiveType)
      setArchivedItems(currentItems => currentItems.filter(item => item.id !== id))
      alert(`Item restored successfully!`)
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.response?.data?.error || error.message
      alert(`Failed to restore: ${message}`)
    } finally {
      setRestoring(null)
    }
  }

  const handlePermanentlyDelete = async (id: string) => {
    if (!confirm('Permanently delete this item? This cannot be undone.')) return

    try {
      await apiClient.deleteArchived(id, archiveType)
      setArchivedItems(currentItems => currentItems.filter(item => item.id !== id))
      alert('Item permanently deleted')
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.response?.data?.error || error.message
      alert(`Failed to delete: ${message}`)
    }
  }

  const getItemDisplay = (item: any) => {
    const record = item.record_data || {}
    switch (archiveType) {
      case 'patients':
        return `${record.full_name || 'Unknown'} (${record.email || 'No email'})`
      case 'appointments':
        return `Appointment on ${record.appointment_date || 'Unknown date'}`
      case 'prescriptions':
        return `Prescription - ${record.medications || record.notes || 'No details'}`
      case 'staff':
        return `${record.full_name || 'Unknown'} (${record.role || 'No role'})`
      default:
        return 'Item'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Archive size={32} className="text-amber-600" />
        <h2 className="text-2xl font-bold text-gray-900">Archive</h2>
      </div>

      {/* Type Selector */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Browse Archive</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {types.map((type) => (
            <button
              key={type.id}
              onClick={() => setArchiveType(type.id as any)}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                archiveType === type.id
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Archived Items */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FolderOpen size={20} className="text-amber-600" />
            <h3 className="text-lg font-bold text-gray-900">
              Archived {archiveType} ({archivedItems.length})
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading archive...</div>
        ) : archivedItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No archived {archiveType} found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {archivedItems.map((item) => (
              <div
                key={item.id}
                className="p-4 md:p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{getItemDisplay(item)}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Archived: {formatDate(item.deleted_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestore(item.id)}
                      disabled={restoring === item.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
                    >
                      <RotateCcw size={16} />
                      {restoring === item.id ? 'Restoring...' : 'Restore'}
                    </button>
                    <button
                      onClick={() => handlePermanentlyDelete(item.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-bold text-blue-900 mb-2">ℹ️ How Archive Works</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• When you delete items, they are moved to archive instead of being permanently deleted</li>
          <li>• You can browse all archived items organized by type</li>
          <li>• Click <span className="font-bold">Restore</span> to bring items back to active use</li>
          <li>• Click <span className="font-bold">Delete</span> to permanently remove archived items</li>
        </ul>
      </div>
    </div>
  )
}
