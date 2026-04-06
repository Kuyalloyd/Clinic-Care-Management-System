'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import LoginForm from '@/components/LoginForm'

function LoginContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/images/clinic.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-8">
          {/* Header */}
          <div className="space-y-6">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="/images/profile.jpg" 
                alt="Clinic Care Logo" 
                className="w-20 h-20 rounded-lg shadow-lg object-cover"
              />
            </div>
            <h1 className="text-3xl font-bold text-center text-gray-900">Clinic Care Management System</h1>
          </div>

          {/* Message */}
          {message && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {message}
            </div>
          )}

          {/* Form */}
          <LoginForm />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
