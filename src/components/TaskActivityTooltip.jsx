import { useState } from 'react'
import { useGetTaskActivitiesQuery } from '../services/adminApi'

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'İndicə'
  if (minutes < 60) return `${minutes} dəq əvvəl`
  if (hours < 24) return `${hours} saat əvvəl`
  if (days < 7) return `${days} gün əvvəl`

  return date.toLocaleDateString('az-AZ', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getChangeLabel = (key) => {
  const labels = {
    title: 'Başlıq',
    description: 'Açıqlama',
    startAt: 'Başlama tarixi',
    dueAt: 'Bitmə tarixi',
    statusId: 'Status',
    assignees: 'Təyin olunanlar',
    taskListId: 'Siyahı',
    is_message_send: 'Mesaj göndərildi',
  }
  return labels[key] || key
}

const TaskActivityTooltip = ({ taskId, children }) => {
  const [isHovering, setIsHovering] = useState(false)
  const { data: activities = [], isLoading } = useGetTaskActivitiesQuery(
    { taskId, limit: 10 },
    { skip: !isHovering }
  )

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {children}

      {isHovering && (
        <div className="absolute z-50 left-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-700">Son əməliyyatlar</h4>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-xs text-gray-500">Yüklənir...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Əməliyyat tarixçəsi yoxdur
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activities.map((activity) => (
                  <div key={activity.id} className="px-3 py-2 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-900">
                        {activity.username || 'İstifadəçi'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(activity.createdAt)}
                      </span>
                    </div>
                    {activity.changes && Object.keys(activity.changes).length > 0 && (
                      <div className="space-y-1">
                        {Object.entries(activity.changes).map(([key, value]) => (
                          <div key={key} className="text-xs">
                            <span className="text-gray-500">{getChangeLabel(key)}:</span>
                            {typeof value === 'object' && value.from !== undefined ? (
                              <span className="ml-1">
                                <span className="text-red-500 line-through">{formatValue(value.from)}</span>
                                <span className="text-gray-400 mx-1">→</span>
                                <span className="text-green-600">{formatValue(value.to)}</span>
                              </span>
                            ) : (
                              <span className="ml-1 text-gray-700">{formatValue(value)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const formatValue = (value) => {
  if (value === null || value === undefined) return '-'
  if (Array.isArray(value)) return value.join(', ') || '-'
  if (typeof value === 'boolean') return value ? 'Bəli' : 'Xeyr'
  if (typeof value === 'string' && value.includes('T')) {
    try {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('az-AZ', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      }
    } catch {
      // Not a date
    }
  }
  return String(value).substring(0, 30) + (String(value).length > 30 ? '...' : '')
}

export default TaskActivityTooltip
