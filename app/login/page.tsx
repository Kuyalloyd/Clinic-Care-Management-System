'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import LoginForm from '@/components/LoginForm'

function LoginContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8 bg-slate-100 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/clinic.jpg')" }}
      />
      <div className="absolute inset-0 bg-slate-900/45" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2)_0%,_rgba(99,102,241,0.1)_30%,_transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16)_0%,_rgba(56,189,248,0.08)_35%,_transparent_70%)]" />

      <div className="relative w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden border border-white/70 bg-white/90 backdrop-blur-sm">
        <div className="grid md:grid-cols-[0.95fr_1.05fr]">
          <aside className="bg-white border-b md:border-b-0 md:border-r border-gray-100">
            <div className="h-52 md:h-[300px]">
              <img
                src="/images/clinic.jpg"
                alt="Clinic"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="bg-gradient-to-b from-blue-700 to-indigo-800 text-white p-6 md:p-7 min-h-[170px] flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/images/profile.jpg"
                  alt="Clinic Care Logo"
                  className="w-12 h-12 rounded-lg object-cover border border-white/30"
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-blue-100">Welcome To</p>
                  <h2 className="text-xl font-bold text-white">Clinic Care</h2>
                </div>
              </div>
              <div className="rounded-lg bg-white/10 border border-white/20 p-3 mt-4">
                <p className="text-sm font-semibold text-white">Clinic Care Management System</p>
                <p className="text-xs text-blue-100 mt-1">Secure access for admin, doctor, and nurse duty workflows.</p>
              </div>
            </div>
          </aside>

          <section className="bg-white p-6 sm:p-8 md:p-10 flex items-center">
            <div className="w-full max-w-md mx-auto space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/profile.jpg"
                    alt="Clinic Care Logo"
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-blue-700 font-semibold">Welcome To</p>
                    <span className="text-sm font-semibold text-blue-700 tracking-wide">Clinic Care</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Login</h1>
                  <p className="text-sm text-gray-500 mt-1">Enter your credentials to continue to your account.</p>
                </div>
              </div>

              {message && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  {message}
                </div>
              )}

              <LoginForm />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen flex items-center justify-center bg-slate-100 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/clinic.jpg')" }}
          />
          <div className="absolute inset-0 bg-slate-900/45" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2)_0%,_rgba(99,102,241,0.1)_30%,_transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16)_0%,_rgba(56,189,248,0.08)_35%,_transparent_70%)]" />
          <div className="relative text-sm font-medium text-slate-700">Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
