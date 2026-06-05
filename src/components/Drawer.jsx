import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Drawer({ open, onClose, title, subtitle, width = 480, children }) {
  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy/30 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="absolute right-0 top-0 h-full bg-white shadow-lg flex flex-col animate-slide-in"
        style={{ width: Math.min(width, window.innerWidth) }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-grey-200 flex-shrink-0">
          <div>
            {title && <h2 className="text-base font-bold text-navy">{title}</h2>}
            {subtitle && <p className="text-xs text-grey-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-icon -mr-1 -mt-1 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
