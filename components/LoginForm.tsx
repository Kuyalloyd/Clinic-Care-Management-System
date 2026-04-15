'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/apiClient'
import BrandLoadingOverlay from '@/components/BrandLoadingOverlay'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

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
      router.push('/dashboard')
    } catch (err: any) {
      setIsLoggingIn(false)
      if (!err.response) {
        setError('Cannot connect to server. Please make sure the app is running (npm run dev).')
      } else {
        setError(err.response?.data?.error || err.message || 'Login failed')
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
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
            {error}
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
