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
      <div className="w-24 h-24 rounded-2xl border border-white/30 bg-white/15 shadow-xl flex items-center justify-center">
        <div
          className="h-10 w-10 rounded-full border-4 border-white/30 border-t-white animate-spin"
          role="status"
          aria-label={`${title}${subtitle ? ` ${subtitle}` : ''}`.trim()}
        />
      </div>
    </div>
  )
}