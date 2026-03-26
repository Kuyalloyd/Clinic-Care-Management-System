'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/apiClient'
import { useDashboardData } from '@/lib/DataContext'
import { Bill, Patient } from '@/lib/types'
import { Plus, Download } from 'lucide-react'

export default function BillingList() {
  const { data, refreshBills } = useDashboardData()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [editStatus, setEditStatus] = useState('')

  useEffect(() => {
    setLoading(false)
  }, [])

  const getPatientName = (patientId: string) => {
    return data.patients.find((p) => p.id === patientId)?.full_name || 'Unknown'
  }

  const generateInvoiceNumber = (bill: Bill) => {
    const year = new Date(bill.created_at).getFullYear()
    const billIndex = data.bills.indexOf(bill) + 1
    return `INV-${year}-${String(billIndex).padStart(3, '0')}`
  }

  const downloadInvoice = (bill: Bill) => {
    const invoiceNo = generateInvoiceNumber(bill)
    const patientName = getPatientName(bill.patient_id)
    const invoiceDate = new Date(bill.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const dueDate = new Date(bill.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${invoiceNo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 20px; }
          h1 { margin: 0; color: #1e40af; }
          .invoice-no { color: #666; font-size: 14px; }
          .section { margin: 20px 0; }
          .label { font-weight: bold; color: #555; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #f3f4f6; padding: 10px; text-align: left; border-bottom: 2px solid #1e40af; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
          .total-row { background-color: #f3f4f6; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          .status-badge { 
            display: inline-block; 
            padding: 5px 10px; 
            border-radius: 20px; 
            font-weight: bold;
            font-size: 12px;
          }
          .status-pending { background-color: #fef3c7; color: #92400e; }
          .status-paid { background-color: #d1fae5; color: #065f46; }
          .status-partial { background-color: #fed7aa; color: #92400e; }
          .status-overdue { background-color: #fee2e2; color: #7f1d1d; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <p class="invoice-no">${invoiceNo}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
          <div>
            <div class="label">Bill To:</div>
            <p style="margin: 5px 0;">${patientName}</p>
          </div>
          <div>
            <div class="label">Invoice Details:</div>
            <p style="margin: 5px 0;"><strong>Invoice No:</strong> ${invoiceNo}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${invoiceDate}</p>
            <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDate}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${bill.description || 'Medical Services'}</td>
              <td style="text-align: right;">₱${bill.amount.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td>TOTAL</td>
              <td style="text-align: right;">₱${bill.amount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin: 30px 0;">
          <div class="label">Status:</div>
          <span class="status-badge status-${bill.status}">
            ${bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
          </span>
        </div>

        ${bill.status === 'paid' ? `
          <div style="background-color: #d1fae5; border: 1px solid #6ee7b7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Amount Paid:</strong> ₱${bill.amount.toFixed(2)}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>This is an electronically generated invoice</p>
        </div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${invoiceNo}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const filteredBills = data.bills
    .filter((bill) => filter === 'all' || bill.status === filter)
    .filter((bill) => {
      const patientName = getPatientName(bill.patient_id).toLowerCase()
      const invoiceNum = generateInvoiceNumber(bill).toLowerCase()
      return (
        patientName.includes(searchTerm.toLowerCase()) ||
        invoiceNum.includes(searchTerm.toLowerCase())
      )
    })

  const totalAmount = data.bills.reduce((sum, bill) => sum + bill.amount, 0)
  const outstandingAmount = data.bills
    .filter((b) => b.status === 'pending' || b.status === 'overdue')
    .reduce((sum, b) => sum + b.amount, 0)

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'partial':
        return 'bg-orange-100 text-orange-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading billing...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Billing & Payments</h2>
          <p className="text-gray-600 text-sm">Manage invoices and payment records</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary btn-lg w-full sm:w-auto"
        >
          <Plus size={20} />
          New Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <p className="text-gray-600 text-sm font-medium mb-2">Total Revenue</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-gray-900">₱{totalAmount.toFixed(0)}</p>
            <div className="text-4xl text-green-100">₱</div>
          </div>
        </div>
        <div className="card p-6">
          <p className="text-gray-600 text-sm font-medium mb-2">Outstanding</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-gray-900">₱{outstandingAmount.toFixed(0)}</p>
            <div className="text-4xl text-orange-100">₱</div>
          </div>
        </div>
        <div className="card p-6">
          <p className="text-gray-600 text-sm font-medium mb-2">Total Invoices</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-gray-900">{data.bills.length}</p>
            <div className="text-4xl text-blue-100">₱</div>
          </div>
        </div>
      </div>

      {showForm && (
        <BillForm
          patients={data.patients}
          onSuccess={() => {
            refreshBills()
            setShowForm(false)
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Edit Status Modal */}
      {showEditModal && editingBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Change Status</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-light"
              >
                ×
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Patient</p>
                <p className="text-gray-900 font-medium">{getPatientName(editingBill.patient_id)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-4">Select Status</p>
                <div className="space-y-3">
                  {['pending', 'partial', 'overdue', 'paid'].map((status) => (
                    <label key={status} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value={status}
                        checked={editStatus === status}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700 capitalize">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-200 justify-end">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await apiClient.updateBillStatus(editingBill.id, editStatus)
                      alert('✓ Status updated successfully!')
                      refreshBills()
                      setShowEditModal(false)
                    } catch (error: any) {
                      alert(`Error: ${error.message}`)
                    }
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="card">
        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <input
              type="text"
              placeholder="Search by patient name or invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <div className="flex gap-2 flex-wrap justify-end">
              {['all', 'paid', 'pending', 'partial', 'overdue'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Services</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-red-600">{generateInvoiceNumber(bill)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{getPatientName(bill.patient_id)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {new Date(bill.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{bill.description}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">₱{bill.amount.toFixed(0)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        ₱{bill.status === 'paid' ? bill.amount.toFixed(0) : '0'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(bill.status)}`}>
                        {bill.status === 'pending' ? 'Pending' : bill.status === 'overdue' ? 'Overdue' : bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => downloadInvoice(bill)}
                          className="text-blue-600 hover:text-blue-800 transition"
                          title="Download invoice"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingBill(bill)
                            setEditStatus(bill.status)
                            setShowEditModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium transition"
                        >
                          Edit
                        </button>
                        {bill.status !== 'paid' && (
                          <button
                            onClick={async () => {
                              try {
                                await apiClient.markBillAsPaid(bill.id)
                                alert('✓ Bill marked as paid successfully!')
                                refreshBills()
                              } catch (error: any) {
                                const errorMsg = error.response?.data?.error || error.message || 'Failed to mark as paid'
                                alert(`Error: ${errorMsg}`)
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium transition"
                          >
                            Record Payment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function BillForm({
  patients,
  onSuccess,
  onClose,
}: {
  patients: Patient[]
  onSuccess: () => void
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    patient_id: '',
    amount: '',
    description: '',
    due_date: '',
    status: 'pending',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!formData.patient_id) {
      setError('Please select a patient')
      setLoading(false)
      return
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount')
      setLoading(false)
      return
    }
    if (!formData.due_date) {
      setError('Please select a due date')
      setLoading(false)
      return
    }

    try {
      await apiClient.createBill({
        patient_id: formData.patient_id,
        amount: parseFloat(formData.amount),
        description: 'Medical Services',
        due_date: formData.due_date,
        status: formData.status,
      })
      onSuccess()
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create bill'
      setError(errorMsg)
      console.error('Failed to create bill:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        {/* Modal Dialog */}
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4">
          {/* Modal Header */}
          <div className="flex justify-between items-center px-8 py-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">New Invoice</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light"
            >
              ×
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {/* Patient */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
                <select
                  name="patient_id"
                  value={formData.patient_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="">Select Patient</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  name="amount"
                  placeholder="e.g., 5000"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="partial">Partial</option>
                </select>
              </div>


            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 pt-6 border-t border-gray-200 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition"
              >
                {loading ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
