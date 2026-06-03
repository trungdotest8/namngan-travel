'use client'

import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Loader2 } from 'lucide-react'
import { Suspense } from 'react'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const inputRef     = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const password = inputRef.current?.value ?? ''
    if (!password) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        const from = searchParams.get('from') ?? '/admin/crm'
        router.replace(from)
      } else {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Đăng nhập thất bại')
        if (inputRef.current) inputRef.current.value = ''
        inputRef.current?.focus()
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F7FF] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#005BAA] text-white mb-4">
            <Lock size={24} />
          </div>
          <h1 className="text-xl font-bold text-[#1A1A2E]">Nam Ngân Travel</h1>
          <p className="text-sm text-[#666666] mt-1">Đăng nhập trang quản trị</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
              Mật khẩu
            </label>
            <input
              id="password"
              ref={inputRef}
              type="password"
              autoFocus
              autoComplete="current-password"
              placeholder="Nhập mật khẩu admin"
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#1A1A2E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005BAA] focus:border-transparent disabled:opacity-60 transition"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#005BAA] hover:bg-[#0078D7] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Đang xác thực…' : 'Đăng nhập'}
          </button>
        </form>

        <p className="text-center text-xs text-[#666666] mt-6">
          Nam Ngân Travel &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
