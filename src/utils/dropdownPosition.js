/**
 * Viewport-da yer çatışmadıqda dropdown-u yuxarı/aşağı (və lazım olsa sola) çevirir.
 */
export function computeDropdownPosition(anchorRect, dropdownHeight, options = {}) {
  const gap = options.gap ?? 4
  const padding = options.viewportPadding ?? 8
  const minWidth = options.minWidth ?? 0
  const width = options.width ?? Math.max(anchorRect.width, minWidth)
  const vh = window.innerHeight
  const vw = window.innerWidth

  const spaceBelow = vh - anchorRect.bottom - padding
  const spaceAbove = anchorRect.top - padding

  let placement = 'below'
  let top = anchorRect.bottom + gap

  const fitsBelow = dropdownHeight <= spaceBelow
  const fitsAbove = dropdownHeight <= spaceAbove

  if (!fitsBelow && (fitsAbove || spaceAbove > spaceBelow)) {
    placement = 'above'
    top = anchorRect.top - gap - dropdownHeight
  }

  if (top < padding) {
    top = padding
  }
  if (top + dropdownHeight > vh - padding) {
    top = Math.max(padding, vh - padding - dropdownHeight)
  }

  let left = options.fixedLeft ?? options.left
  if (left == null) {
    if (options.align === 'right') {
      left = anchorRect.right - width
    } else {
      left = anchorRect.left
    }
  }

  if (left + width > vw - padding) {
    left = vw - padding - width
  }
  if (left < padding) {
    left = padding
  }

  return { top, left, width, placement }
}
