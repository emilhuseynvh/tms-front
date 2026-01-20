import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useGetTaskActivitiesQuery, useGetUsersQuery, useGetTaskStatusesQuery } from '../services/adminApi'

const formatDate = (dateString) => {
  if (!dateString) return '-'

  let date = new Date(dateString)

  const hasTimezone = /[Zz]|[+-]\d{2}:?\d{2}/.test(dateString)
  if (!hasTimezone) {
    date = new Date(dateString + 'Z')
  }

  const now = new Date()
  let diff = now.getTime() - date.getTime()

  if (diff < 0) diff = 0

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'İndicə'
  if (minutes < 60) return `${minutes} dəq əvvəl`
  if (hours < 24) {
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) return `${hours} saat əvvəl`
    return `${hours}s ${remainingMinutes}dəq əvvəl`
  }
  if (days < 7) {
    const remainingHours = hours % 24
    if (remainingHours === 0) return `${days} gün əvvəl`
    return `${days}g ${remainingHours}s əvvəl`
  }

  return date.toLocaleDateString('az-AZ', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getChangeLabel = (key, isFirstTime = false) => {
  if (key === 'created') {
    return 'Tapşırıq yaradıldı'
  }
  if (isFirstTime) {
    const addLabels = {
      title: 'Başlıq əlavə edildi',
      description: 'Açıqlama əlavə edildi',
      startAt: 'Başlama tarixi əlavə edildi',
      dueAt: 'Bitmə tarixi əlavə edildi',
      statusId: 'Status əlavə edildi',
      assignees: 'Təyin olunanlar',
      taskListId: 'Siyahı əlavə edildi',
      link: 'Link əlavə edildi',
      parentId: 'Ana tapşırıq əlavə edildi',
    }
    return addLabels[key] || key
  }
  const labels = {
    title: 'Başlıq dəyişdirildi',
    description: 'Açıqlama dəyişdirildi',
    startAt: 'Başlama tarixi',
    dueAt: 'Bitmə tarixi',
    statusId: 'Status dəyişdirildi',
    assignees: 'Təyin olunanlar',
    taskListId: 'Siyahı dəyişdirildi',
    is_message_send: 'Mesaj göndərildi',
    link: 'Link dəyişdirildi',
    parentId: 'Ana tapşırıq',
  }
  return labels[key] || key
}

const getChangeIcon = (key) => {
  const icons = {
    created: '🆕',
    title: '✏️',
    description: '📝',
    startAt: '📅',
    dueAt: '⏰',
    statusId: '🏷️',
    assignees: '👥',
    taskListId: '📋',
    is_message_send: '📧',
    link: '🔗',
    parentId: '🔗',
  }
  return icons[key] || '📌'
}

const TaskActivityTooltip = ({ taskId, children }) => {
  const [isHovering, setIsHovering] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, showAbove: false })
  const containerRef = useRef(null)
  const hideTimeoutRef = useRef(null)

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setIsHovering(true)
  }

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsHovering(false)
    }, 150) // Kiçik gecikmə ilə hover-i bağla
  }

  const { data: activities = [], isLoading } = useGetTaskActivitiesQuery(
    { taskId, limit: 10 },
    { skip: !isHovering }
  )

  const { data: users = [] } = useGetUsersQuery()
  const { data: statuses = [] } = useGetTaskStatusesQuery()

  // User ID-dən ada çevirmək üçün map yaradırıq
  const userMap = {}
  users.forEach(user => {
    userMap[user.id] = user.name || user.username || user.email
  })

  // Status ID-dən ada çevirmək üçün map yaradırıq
  const statusMap = {}
  statuses.forEach(status => {
    statusMap[status.id] = status.name
  })

  const formatAssignees = (ids) => {
    if (!Array.isArray(ids)) return '-'
    if (ids.length === 0) return 'Heç kim'
    return ids.map(id => userMap[id] || `User #${id}`).join(', ')
  }

  const getAssigneeChanges = (fromIds, toIds) => {
    const from = Array.isArray(fromIds) ? fromIds : []
    const to = Array.isArray(toIds) ? toIds : []

    const added = to.filter(id => !from.includes(id))
    const removed = from.filter(id => !to.includes(id))

    return { added, removed }
  }

  const formatDetailedChange = (key, value) => {
    // Task yaratma loqu
    if (key === 'created') {
      return [{ type: 'added', text: value?.to || 'Tapşırıq yaradıldı' }]
    }

    if (key === 'assignees' && typeof value === 'object' && value.from !== undefined) {
      const { added, removed } = getAssigneeChanges(value.from, value.to)
      const parts = []

      if (added.length > 0) {
        const names = added.map(id => userMap[id] || `User #${id}`).join(', ')
        parts.push({ type: 'added', text: `${names} təyin edildi` })
      }
      if (removed.length > 0) {
        const names = removed.map(id => userMap[id] || `User #${id}`).join(', ')
        parts.push({ type: 'removed', text: `${names} təyinatdan çıxarıldı` })
      }

      if (parts.length === 0 && value.to?.length === 0) {
        parts.push({ type: 'removed', text: 'Bütün təyinatlar silindi' })
      }

      return parts
    }

    if (key === 'statusId' && typeof value === 'object' && value.from !== undefined) {
      const fromName = value.from ? (statusMap[value.from] || `Status #${value.from}`) : null
      const toName = value.to ? (statusMap[value.to] || `Status #${value.to}`) : null

      // Əgər əvvəl yox idisə və indi var - əlavə edildi
      if (!value.from && value.to) {
        return [{ type: 'added', text: toName }]
      }
      // Əgər əvvəl var idi və indi yox - silindi
      if (value.from && !value.to) {
        return [{ type: 'removed', text: fromName }]
      }
      // Normal dəyişiklik
      return [{ type: 'change', from: fromName, to: toName }]
    }

    if (key === 'startAt' || key === 'dueAt') {
      if (typeof value === 'object' && value.from !== undefined) {
        const fromDate = value.from ? formatDateValue(value.from) : null
        const toDate = value.to ? formatDateValue(value.to) : null

        if (!value.from && value.to) {
          return [{ type: 'added', text: toDate }]
        }
        if (value.from && !value.to) {
          return [{ type: 'removed', text: fromDate }]
        }
        return [{ type: 'change', from: fromDate, to: toDate }]
      }
    }

    if (key === 'title' || key === 'description' || key === 'link') {
      if (typeof value === 'object' && value.from !== undefined) {
        const fromVal = value.from || null
        const toVal = value.to || null

        if (!value.from && value.to) {
          return [{ type: 'added', text: `"${truncate(toVal, 30)}"` }]
        }
        if (value.from && !value.to) {
          return [{ type: 'removed', text: `"${truncate(fromVal, 30)}"` }]
        }
        return [{ type: 'change', from: truncate(fromVal, 20), to: truncate(toVal, 20) }]
      }
    }

    if (key === 'parentId' && typeof value === 'object') {
      const fromName = value.from || null
      const toName = value.to || null

      if (!fromName && toName) {
        return [{ type: 'added', text: `"${toName}" tapşırığının alt tapşırığı oldu` }]
      }
      if (fromName && !toName) {
        return [{ type: 'removed', text: `"${fromName}" tapşırığından ayrıldı` }]
      }
      if (fromName && toName) {
        return [{ type: 'change', from: fromName, to: toName }]
      }
    }

    return null
  }

  const truncate = (str, len) => {
    if (!str) return ''
    return str.length > len ? str.substring(0, len) + '...' : str
  }

  const formatDateValue = (dateStr) => {
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
    } catch {
      return dateStr
    }
  }

  useEffect(() => {
    if (isHovering && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const tooltipWidth = 340
      const tooltipHeight = 350

      let top = rect.bottom + 8
      let left = rect.left

      // Aşağıda yer yoxdursa, yuxarıda göstər
      if (top + tooltipHeight > window.innerHeight) {
        top = rect.top - tooltipHeight - 8
      }

      // Sağda yer yoxdursa, sola sürüşdür
      if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 16
      }

      // Solda yer yoxdursa
      if (left < 16) {
        left = 16
      }

      setTooltipPosition({ top, left })
    }
  }, [isHovering])

  const formatValue = (value, key) => {
    if (value === null || value === undefined) return '-'

    // Assignees üçün xüsusi format
    if (key === 'assignees' && Array.isArray(value)) {
      return formatAssignees(value)
    }

    // StatusId üçün status adını göstər
    if (key === 'statusId') {
      return statusMap[value] || `Status #${value}`
    }

    if (Array.isArray(value)) return value.join(', ') || '-'
    if (typeof value === 'boolean') return value ? 'Bəli' : 'Xeyr'
    if (typeof value === 'string' && value.includes('T')) {
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']
          const day = date.getDate()
          const month = months[date.getMonth()]
          const year = date.getFullYear()
          return `${day} ${month} ${year}`
        }
      } catch {
        // Not a date
      }
    }
    return String(value).substring(0, 30) + (String(value).length > 30 ? '...' : '')
  }

  const tooltipContent = isHovering && createPortal(
    <div
      className="fixed z-[9999] w-[340px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden"
      style={{
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Əməliyyat Tarixçəsi</h4>
            <p className="text-xs text-white/70">Son 10 dəyişiklik</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-72 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="relative w-12 h-12 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
            </div>
            <p className="mt-3 text-sm text-gray-500">Yüklənir...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">Tarixçə yoxdur</p>
            <p className="text-xs text-gray-400 mt-1">Hələ heç bir dəyişiklik edilməyib</p>
          </div>
        ) : (
          <div className="p-2">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className={`relative p-3 rounded-xl transition-all duration-200 hover:bg-gray-50 ${
                  index !== activities.length - 1 ? 'mb-1' : ''
                }`}
              >
                {/* Timeline connector */}
                {index !== activities.length - 1 && (
                  <div className="absolute left-[22px] top-[44px] bottom-[-8px] w-0.5 bg-gradient-to-b from-indigo-200 to-transparent"></div>
                )}

                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                      {(activity.username || 'N').charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800 truncate">
                        {activity.username || 'Naməlum istifadəçi'}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0 ml-2">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDate(activity.createdAt)}
                      </span>
                    </div>

                    {activity.changes && Object.keys(activity.changes).length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        {Object.entries(activity.changes).map(([key, value]) => {
                          const detailedChanges = formatDetailedChange(key, value)
                          // İlk dəfə əlavə edilirsə (from null/undefined və to var)
                          const isFirstTime = detailedChanges && detailedChanges.length > 0 && detailedChanges[0].type === 'added'

                          return (
                            <div
                              key={key}
                              className="flex items-start gap-2 text-xs bg-gray-50/80 rounded-lg p-2"
                            >
                              <span className="flex-shrink-0 text-sm">{getChangeIcon(key)}</span>
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-gray-600">{getChangeLabel(key, isFirstTime)}</span>
                                {detailedChanges ? (
                                  <div className="mt-1 space-y-1">
                                    {detailedChanges.map((change, idx) => (
                                      <div key={idx} className="flex items-center gap-1 flex-wrap">
                                        {change.type === 'added' && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-xs">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            {change.text}
                                          </span>
                                        )}
                                        {change.type === 'removed' && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                            </svg>
                                            {change.text}
                                          </span>
                                        )}
                                        {change.type === 'change' && (
                                          <>
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 text-xs">
                                              {change.from}
                                            </span>
                                            <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                                              {change.to}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : typeof value === 'object' && value.from !== undefined ? (
                                  <div className="mt-1 flex items-center gap-1 flex-wrap">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 text-xs">
                                      {formatValue(value.from, key)}
                                    </span>
                                    <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                                      {formatValue(value.to, key)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="ml-1 text-gray-700">{formatValue(value, key)}</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {activities.length > 0 && (
        <div className="px-4 py-2 bg-gray-50/80 border-t border-gray-100">
          <p className="text-xs text-center text-gray-400">
            {activities.length} əməliyyat göstərilir
          </p>
        </div>
      )}
    </div>,
    document.body
  )

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {tooltipContent}
    </div>
  )
}

export default TaskActivityTooltip
