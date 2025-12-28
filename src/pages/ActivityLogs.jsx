import { useState } from 'react'
import {
  useGetActivityLogsQuery,
  useGetUsersQuery,
  useGetTaskStatusesQuery,
} from '../services/adminApi'

const ACTIVITY_TYPES = [
  { value: '', label: 'Bütün əməliyyatlar' },
  { value: 'space_create', label: 'Sahə yaradılması' },
  { value: 'space_update', label: 'Sahə yenilənməsi' },
  { value: 'space_delete', label: 'Sahə silinməsi' },
  { value: 'space_restore', label: 'Sahə bərpası' },
  { value: 'folder_create', label: 'Qovluq yaradılması' },
  { value: 'folder_update', label: 'Qovluq yenilənməsi' },
  { value: 'folder_delete', label: 'Qovluq silinməsi' },
  { value: 'folder_restore', label: 'Qovluq bərpası' },
  { value: 'list_create', label: 'Siyahı yaradılması' },
  { value: 'list_update', label: 'Siyahı yenilənməsi' },
  { value: 'list_delete', label: 'Siyahı silinməsi' },
  { value: 'list_restore', label: 'Siyahı bərpası' },
  { value: 'task_create', label: 'Tapşırıq yaradılması' },
  { value: 'task_update', label: 'Tapşırıq yenilənməsi' },
  { value: 'task_delete', label: 'Tapşırıq silinməsi' },
  { value: 'task_restore', label: 'Tapşırıq bərpası' },
]

const getActivityTypeColor = (type) => {
  if (type?.includes('create')) return 'bg-green-100 text-green-700'
  if (type?.includes('update')) return 'bg-blue-100 text-blue-700'
  if (type?.includes('delete')) return 'bg-red-100 text-red-700'
  if (type?.includes('restore')) return 'bg-purple-100 text-purple-700'
  return 'bg-gray-100 text-gray-700'
}

const getActivityIcon = (type) => {
  if (type?.includes('space')) return '🗂️'
  if (type?.includes('folder')) return '📁'
  if (type?.includes('list')) return '📋'
  if (type?.includes('task')) return '✅'
  return '📝'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'İndicə'
  if (minutes < 60) return `${minutes} dəqiqə əvvəl`
  if (hours < 24) return `${hours} saat əvvəl`
  if (days < 7) return `${days} gün əvvəl`

  return date.toLocaleDateString('az-AZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const ActivityLogs = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    userId: '',
    type: '',
    search: '',
    startDate: '',
    endDate: '',
  })

  const { data, isLoading } = useGetActivityLogsQuery(filters)
  const { data: users = [] } = useGetUsersQuery()
  const { data: statuses = [] } = useGetTaskStatusesQuery()

  const logs = data?.data || []
  const pagination = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 }

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

  // Assignee ID-lərini adlara çevirən funksiya
  const formatAssignees = (ids) => {
    if (!Array.isArray(ids)) return String(ids)
    if (ids.length === 0) return '-'
    return ids.map(id => userMap[id] || `User #${id}`).join(', ')
  }

  // Key-ləri Azərbaycan dilinə çevirən funksiya
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
      link: 'Link',
      name: 'Ad',
      color: 'Rəng',
    }
    return labels[key] || key
  }

  // Dəyəri formatlamaq
  const formatChangeValue = (value, key) => {
    if (value === null || value === undefined) return '-'
    if (key === 'assignees' && Array.isArray(value)) {
      return formatAssignees(value)
    }
    if (key === 'statusId') {
      return statusMap[value] || `Status #${value}`
    }
    if (typeof value === 'boolean') return value ? 'Bəli' : 'Xeyr'
    return String(value)
  }

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 })
  }

  const handlePageChange = (newPage) => {
    setFilters({ ...filters, page: newPage })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Əməliyyat tarixçəsi</h1>
        <p className="text-sm text-gray-500 mt-1">Sistemdə edilən bütün əməliyyatları izləyin</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Axtar</label>
            <input
              type="text"
              placeholder="Əməliyyat axtar..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">İstifadəçi</label>
            <select
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Bütün istifadəçilər</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Əməliyyat növü</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {ACTIVITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Başlanğıc</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Son</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logs List */}
      {isLoading ? (
        <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yüklənir...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500">Heç bir əməliyyat tapılmadı</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                  {getActivityIcon(log.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getActivityTypeColor(log.type)}`}>
                      {ACTIVITY_TYPES.find(t => t.value === log.type)?.label || log.type}
                    </span>
                    {log.user && (
                      <span className="text-xs text-gray-500">
                        {log.user.username} tərəfindən
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900">{log.description}</p>
                  {log.entityName && (
                    <p className="text-xs text-gray-500 mt-1">
                      Element: <span className="font-medium">{log.entityName}</span>
                    </p>
                  )}
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <p className="font-medium text-gray-700 mb-1">Dəyişikliklər:</p>
                      <div className="space-y-1">
                        {Object.entries(log.changes).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 flex-wrap">
                            <span className="text-gray-500">{getChangeLabel(key)}:</span>
                            {typeof value === 'object' && value.from !== undefined ? (
                              <>
                                <span className="text-red-600 line-through">{formatChangeValue(value.from, key)}</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-green-600">{formatChangeValue(value.to, key)}</span>
                              </>
                            ) : (
                              <span className="text-gray-700">{formatChangeValue(value, key)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Time */}
                <div className="text-xs text-gray-400 flex-shrink-0">
                  {formatDate(log.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {pagination.total} nəticədən {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} göstərilir
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Əvvəlki
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonrakı
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ActivityLogs
