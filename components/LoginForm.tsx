'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/apiClient'
import BrandLoadingOverlay from '@/components/BrandLoadingOverlay'
import { AlertCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (error) {
      setError('')
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      setIsLoggingIn(true)
      const email = formData.email.trim().toLowerCase()
      const response = await apiClient.login(email, formData.password)
      localStorage.setItem('auth_token', response.data.session.access_token)
      localStorage.setItem('user_id', response.data.user.id)
      localStorage.setItem('user_email', response.data.user.email)
      if (response.data.role) {
        localStorage.setItem('user_role', response.data.role)
      } else {
        localStorage.removeItem('user_role')
      }
      router.push(response.data.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err: any) {
      setIsLoggingIn(false)
      const status = err?.response?.status
      const apiMessage = err?.response?.data?.error || err?.message || ''

      if (!err.response) {
        setError('Cannot connect to server. Please make sure the app is running (npm run dev).')
      } else if (status === 401) {
        setError('Incorrect email or password. Please try again.')
      } else if (typeof apiMessage === 'string' && apiMessage.trim()) {
        setError(apiMessage)
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full relative">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="form-group">
          <label className="label">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
              className="input pl-10"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="label">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="input pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-3 h-6 w-6 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Login Notice</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full btn-lg font-semibold shadow-md disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Sign In'}
        </button>
      </form>

      {isLoggingIn && (
        <BrandLoadingOverlay
          title="Signing you in"
          subtitle="Preparing your dashboard"
        />
      )}
    </div>
  )
}
