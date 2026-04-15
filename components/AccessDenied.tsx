'use client'

import { ShieldAlert, ArrowLeft } from 'lucide-react'

interface AccessDeniedProps {
  title?: string
  message?: string
  onBack?: () => void
}

export default function AccessDenied({
  title = 'Access Denied',
  message = 'Your account does not currently have permission to view this area. Please contact your administrator.',
  onBack,
}: AccessDeniedProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-red-100 rounded-xl shadow-sm p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">{title}</h2>
        <p className="text-gray-600 leading-relaxed">{message}</p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        )}
      </div>
    </div>
  )
}
