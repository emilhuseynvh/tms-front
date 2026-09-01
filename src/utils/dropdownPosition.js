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

  const spaceBelow = vh - anchorRect.bottom - padding - gap
  const spaceAbove = anchorRect.top - padding - gap

  let placement = 'below'
  const fitsBelow = dropdownHeight <= spaceBelow
  const fitsAbove = dropdownHeight <= spaceAbove

  if (!fitsBelow && (fitsAbove || spaceAbove > spaceBelow)) {
    placement = 'above'
  }

  const available = placement === 'below' ? spaceBelow : spaceAbove
  const maxHeight = Math.max(160, Math.min(vh - padding * 2, available))
  const usedHeight = Math.min(dropdownHeight, maxHeight)

  let top =
    placement === 'below'
      ? anchorRect.bottom + gap
      : anchorRect.top - gap - usedHeight

  if (top < padding) {
    top = padding
  }
  if (top + usedHeight > vh - padding) {
    top = Math.max(padding, vh - padding - usedHeight)
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

  return { top, left, width, placement, maxHeight }
}
