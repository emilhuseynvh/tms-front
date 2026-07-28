import { useState } from 'react'

const MESSAGE_PREVIEW_LIMIT = 600

// Uzun mesajları qısaldıb "Davamını oxu" / "Bağla" ilə aç-bağla edir
const MessageContent = ({ content, isOwnMessage }) => {
  const [expanded, setExpanded] = useState(false)
  const isLong = (content?.length || 0) > MESSAGE_PREVIEW_LIMIT
  const shownText = !isLong || expanded
    ? content
    : `${content.slice(0, MESSAGE_PREVIEW_LIMIT)}...`

  return (
    <>
      <p className="text-sm wrap-break-word whitespace-pre-wrap">{shownText}</p>
      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((prev) => !prev)
          }}
          className={`mt-1 text-xs font-medium underline ${
            isOwnMessage
              ? 'text-blue-100 hover:text-white'
              : 'text-blue-600 hover:text-blue-800'
          }`}
        >
          {expanded ? 'Bağla' : 'Davamını oxu'}
        </button>
      )}
    </>
  )
}

export default MessageContent
