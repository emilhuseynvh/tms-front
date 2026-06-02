import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useFlippedDropdownPosition } from '../hooks/useFlippedDropdownPosition'

/**
 * İstifadəçi çoxlu seçimi; panel ekranın aşağısında yer çatışmazsa yuxarı açılır.
 */
export default function AssigneeMultiSelect({
  users = [],
  selectedIds = [],
  onToggle,
  placeholder = 'İstifadəçi seçin...',
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const panelRef = useRef(null)

  const position = useFlippedDropdownPosition({
    isOpen: open,
    anchorRef: btnRef,
    dropdownRef: panelRef,
    estimatedHeight: 192,
  })

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (
        btnRef.current?.contains(e.target) ||
        panelRef.current?.contains(e.target)
      ) {
        return
      }
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const label =
    selectedIds.length > 0
      ? `${selectedIds.length} istifadəçi seçildi`
      : placeholder

  return (
    <div>
      <button
        type="button"
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 text-sm text-left border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      >
        {label}
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[10050] bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
            style={{
              top: position.top,
              left: position.left,
              width:
                position.width ||
                btnRef.current?.getBoundingClientRect().width,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {users.map((user) => (
              <label
                key={user.id}
                className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(user.id)}
                  onChange={() => onToggle(user.id)}
                  className="mr-2"
                />
                <span className="text-sm">{user.username || user.email}</span>
              </label>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
