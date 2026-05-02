'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, UserCircle2 } from 'lucide-react'

interface PanelProfileMenuProps {
  userName?: string
  roleLabel: string
  roleBadgeClassName: string
  iconAccentClassName?: string
  onLogout: () => void
}

export default function PanelProfileMenu({
  userName,
  roleLabel,
  roleBadgeClassName,
  iconAccentClassName = 'text-slate-600',
  onLogout,
}: PanelProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const displayName = userName?.trim() || `${roleLabel} User`

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div ref={menuRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          <UserCircle2 className={`h-6 w-6 ${iconAccentClassName}`} />
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block truncate text-sm font-semibold text-slate-900">{displayName}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${roleBadgeClassName}`}>
              {roleLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  )
}
