import { useState } from 'react'
import { formatShortDateTimeBaku, parseServerTimestamp } from '../utils/bakuTime'

const MESSAGE_PREVIEW_LIMIT = 600

const formatHistoryTime = (dateString) => {
  const date = parseServerTimestamp(dateString)
  if (!date) return ''
  return formatShortDateTimeBaku(date)
}

// Mesaj məzmunu: uzun mesajlar üçün "Davamını oxu", redaktə (yalnız öz mesajı),
// "redaktə edilib" etiketi və köhnə versiyaların göstərilməsi
const MessageContent = ({ message, content, isOwnMessage, canEdit = false, onEdit }) => {
  const text = message?.content ?? content ?? ''
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const isLong = text.length > MESSAGE_PREVIEW_LIMIT
  const shownText = !isLong || expanded ? text : `${text.slice(0, MESSAGE_PREVIEW_LIMIT)}...`

  const mutedLink = isOwnMessage
    ? 'text-blue-100 hover:text-white'
    : 'text-blue-600 hover:text-blue-800'

  const startEdit = () => {
    setEditValue(text)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditValue('')
  }

  const saveEdit = async () => {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === text) {
      cancelEdit()
      return
    }
    setIsSaving(true)
    try {
      await onEdit(trimmed)
      setIsEditing(false)
    } catch {
      // xəta toast-u parent-də göstərilir
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <div className="min-w-[220px]">
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              saveEdit()
            }
            if (e.key === 'Escape') cancelEdit()
          }}
          autoFocus
          rows={Math.min(6, Math.max(2, editValue.split('\n').length))}
          className="w-full text-sm text-gray-900 bg-white border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
        <div className="flex items-center justify-end gap-2 mt-1">
          <button
            type="button"
            onClick={cancelEdit}
            className={`text-xs font-medium ${mutedLink}`}
          >
            Ləğv et
          </button>
          <button
            type="button"
            onClick={saveEdit}
            disabled={isSaving || !editValue.trim()}
            className={`text-xs font-semibold px-2 py-0.5 rounded ${
              isOwnMessage
                ? 'bg-white text-blue-700 hover:bg-blue-50'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {isSaving ? 'Saxlanılır...' : 'Saxla'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-start gap-1.5">
        <p className="text-sm wrap-break-word whitespace-pre-wrap flex-1 min-w-0">{shownText}</p>
        {canEdit && onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              startEdit()
            }}
            className={`p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity shrink-0 ${mutedLink}`}
            title="Mesajı redaktə et"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((prev) => !prev)
          }}
          className={`mt-1 text-xs font-medium underline ${mutedLink}`}
        >
          {expanded ? 'Bağla' : 'Davamını oxu'}
        </button>
      )}
      {message?.isEdited && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowHistory((prev) => !prev)
          }}
          className={`block mt-0.5 text-[10px] italic ${mutedLink}`}
          title="Köhnə versiyalara bax"
        >
          redaktə edilib{message.editHistory?.length ? ` (${message.editHistory.length})` : ''}
        </button>
      )}
      {showHistory && message?.editHistory?.length > 0 && (
        <div className={`mt-1.5 space-y-1.5 border-l-2 pl-2 ${isOwnMessage ? 'border-white/30' : 'border-gray-200'}`}>
          {[...message.editHistory].reverse().map((version, idx) => (
            <div key={idx}>
              <p className={`text-[10px] ${isOwnMessage ? 'text-blue-200' : 'text-gray-400'}`}>
                {formatHistoryTime(version.editedAt)}
              </p>
              <p className={`text-xs wrap-break-word whitespace-pre-wrap ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                {version.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default MessageContent
