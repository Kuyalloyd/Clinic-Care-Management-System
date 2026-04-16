'use client'

import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ActionToastProps {
  open: boolean
  message: string
  type?: ToastType
  onClose: () => void
}

const toastTheme: Record<ToastType, { icon: typeof CheckCircle2; wrapper: string; iconColor: string; title: string }> = {
  success: {
    icon: CheckCircle2,
    wrapper: 'border-emerald-200 bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: 'Success',
  },
  error: {
    icon: AlertCircle,
    wrapper: 'border-red-200 bg-red-50',
    iconColor: 'text-red-600',
    title: 'Error',
  },
  info: {
    icon: Info,
    wrapper: 'border-blue-200 bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'Info',
  },
}

export default function ActionToast({ open, message, type = 'info', onClose }: ActionToastProps) {
  if (!open) return null

  const theme = toastTheme[type]
  const Icon = theme.icon

  return (
    <div className="fixed top-4 right-4 z-[80] w-[92vw] max-w-sm">
      <div className={`rounded-xl border shadow-md p-3 ${theme.wrapper}`}>
        <div className="flex items-start gap-2.5">
          <Icon size={18} className={`mt-0.5 shrink-0 ${theme.iconColor}`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{theme.title}</p>
            <p className="text-sm text-slate-700 mt-0.5">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-500 hover:bg-white/60 hover:text-slate-700"
            aria-label="Close notification"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
