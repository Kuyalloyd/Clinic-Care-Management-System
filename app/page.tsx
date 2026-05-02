'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      const role = localStorage.getItem('user_role')
      router.push(role === 'admin' ? '/admin' : '/dashboard')
    } else {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to login...</p>
    </div>
  )
}
