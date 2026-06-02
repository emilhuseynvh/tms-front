import { useState, useLayoutEffect } from 'react'
import { computeDropdownPosition } from '../utils/dropdownPosition'

/**
 * Anchor altında açılan portal dropdown üçün mövqe (aşağıda yer yoxdursa yuxarı).
 */
export function useFlippedDropdownPosition({
  isOpen,
  anchorRef,
  dropdownRef,
  estimatedHeight = 208,
  gap = 4,
  viewportPadding = 8,
  minWidth,
  width: fixedWidth,
  align,
  fixedLeft,
  deps = [],
}) {
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    placement: 'below',
  })

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef?.current) return

    const update = () => {
      const rect = anchorRef.current.getBoundingClientRect()
      const height = dropdownRef?.current?.offsetHeight || estimatedHeight
      const width =
        fixedWidth ?? Math.max(rect.width, minWidth ?? 0)

      setPosition(
        computeDropdownPosition(rect, height, {
          gap,
          viewportPadding,
          width,
          minWidth,
          align,
          fixedLeft,
        })
      )
    }

    update()

    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [
    isOpen,
    estimatedHeight,
    gap,
    viewportPadding,
    minWidth,
    fixedWidth,
    align,
    fixedLeft,
    anchorRef,
    dropdownRef,
    ...deps,
  ])

  return position
}
