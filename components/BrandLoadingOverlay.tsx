'use client'

type BrandLoadingOverlayProps = {
  title?: string
  subtitle?: string
}

export default function BrandLoadingOverlay(_props: BrandLoadingOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-transparent">
      <div className="h-14 w-14 rounded-full border-4 border-white/25 border-t-white animate-spin" />
    </div>
  )
}