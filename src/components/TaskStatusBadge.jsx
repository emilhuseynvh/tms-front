import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/** TaskStatuses.jsx ilə eyni ikon dəsti */
export const TASK_STATUS_ICON_OPTIONS = [
  { value: 'circle', label: 'Dairə', icon: '●' },
  { value: 'check', label: 'Tik', icon: '✓' },
  { value: 'clock', label: 'Saat', icon: '⏱' },
  { value: 'star', label: 'Ulduz', icon: '★' },
  { value: 'flag', label: 'Bayraq', icon: '⚑' },
  { value: 'arrow', label: 'Ox', icon: '→' },
  { value: 'pause', label: 'Pauza', icon: '⏸' },
  { value: 'play', label: 'Oynat', icon: '▶' },
]

export function getTaskStatusIconChar(iconValue) {
  const iconOption = TASK_STATUS_ICON_OPTIONS.find((opt) => opt.value === iconValue)
  return iconOption ? iconOption.icon : '●'
}

/**
 * Tapşırıq siyahısı / status səhifəsi ilə uyğun: rəngli fon, ikon, ad
 */
export function TaskStatusBadge({ status, fallback = 'Yoxdur', className = '' }) {
  if (!status) {
    return <span className={`text-xs text-gray-400 ${className}`}>{fallback}</span>
  }
  const color = status.color || '#6B7280'
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full max-w-full min-w-0 ${className}`}
      style={{ backgroundColor: color + '20', color }}
    >
      <span
        className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[11px] leading-none shrink-0"
        style={{ backgroundColor: color }}
      >
        {getTaskStatusIconChar(status.icon)}
      </span>
      <span className="truncate min-w-0">{status.name}</span>
    </span>
  )
}

/** TaskDetail status dropdown ilə eyni davranış; siyahıda ikon + rəng (tapşırıq cədvəli) */
export function TaskStatusFilterDropdown({ value, onChange, statuses, emptyLabel = 'Bütün statuslar' }) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const selected = value ? statuses.find((s) => String(s.id) === String(value)) : null

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 200) })
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        ref={buttonRef}
        onClick={handleToggle}
        className="w-full text-left text-sm border border-gray-300 rounded-md px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center gap-2 min-h-[38px]"
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs shrink-0"
              style={{ backgroundColor: selected.color }}
            >
              {getTaskStatusIconChar(selected.icon)}
            </span>
            <span className="truncate font-medium" style={{ color: selected.color }}>
              {selected.name}
            </span>
          </span>
        ) : (
          <span className="text-gray-500">{emptyLabel}</span>
        )}
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white border border-gray-200 rounded-md shadow-lg py-1 max-h-52 overflow-y-auto"
            style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
          >
            <button
              type="button"
              onClick={() => {
                onChange('')
                setIsOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
            >
              {emptyLabel}
            </button>
            {statuses.map((status) => (
              <button
                type="button"
                key={status.id}
                onClick={() => {
                  onChange(String(status.id))
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                  String(value) === String(status.id) ? 'bg-gray-50 font-medium' : ''
                }`}
              >
                <span
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white text-sm shrink-0"
                  style={{ backgroundColor: status.color }}
                >
                  {getTaskStatusIconChar(status.icon)}
                </span>
                <span style={{ color: status.color }} className="truncate">
                  {status.name}
                </span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
