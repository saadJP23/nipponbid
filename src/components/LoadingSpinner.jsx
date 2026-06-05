export default function LoadingSpinner({ fullscreen = true }) {
  if (fullscreen) return (
    <div className="fixed inset-0 bg-canvas flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-grey-200 border-t-red rounded-full animate-spin" />
        <p className="text-sm text-grey-500">Loading…</p>
      </div>
    </div>
  )
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-7 h-7 border-2 border-grey-200 border-t-red rounded-full animate-spin" />
    </div>
  )
}
