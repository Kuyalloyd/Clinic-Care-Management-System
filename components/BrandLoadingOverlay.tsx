'use client'

type BrandLoadingOverlayProps = {
  title?: string
  subtitle?: string
}

export default function BrandLoadingOverlay({
  title = 'Loading',
  subtitle = '',
}: BrandLoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
      <div className="min-w-[220px] max-w-sm rounded-2xl border border-white/20 bg-slate-950/75 px-6 py-5 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
          <div
            className="h-9 w-9 rounded-full border-4 border-white/30 border-t-white animate-spin"
            role="status"
            aria-label={`${title}${subtitle ? ` ${subtitle}` : ''}`.trim()}
          />
        </div>
        <p className="mt-4 text-sm font-semibold text-white">{title}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-200">{subtitle}</p>}
      </div>
    </div>
  )
}
