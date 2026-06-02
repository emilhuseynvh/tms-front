import { useState } from 'react'
import {
  useGetActivityLogsQuery,
  useGetUsersQuery,
  useGetTaskStatusesQuery,
} from '../services/adminApi'
import { useVerifyQuery } from '../services/authApi'
import { TaskStatusBadge, TaskStatusFilterDropdown } from '../components/TaskStatusBadge'
import ModalDatePicker from '../components/ModalDatePicker'
import {
  formatFullDateTimeBaku,
  filterEndDateParam,
  filterStartDateParam,
  formatRelativeTimeAgo,
  parseServerTimestamp,
} from '../utils/bakuTime'

const ENTITY_TYPES = [
  { value: '', label: 'Hamısı' },
  { value: 'space', label: 'Sahə' },
  { value: 'folder', label: 'Qovluq' },
  { value: 'list', label: 'Siyahı' },
  { value: 'task', label: 'Tapşırıq' },
]

const ACTION_TYPES = [
  { value: '', label: 'Hamısı' },
  { value: 'create', label: 'Yaradılma' },
  { value: 'update', label: 'Yenilənmə' },
  { value: 'delete', label: 'Silinmə' },
  { value: 'restore', label: 'Bərpa' },
]

const getActivityTypeLabel = (type) => {
  if (!type) return type
  const [entity, action] = type.split('_')
  const entityLabel = ENTITY_TYPES.find(e => e.value === entity)?.label || entity
  const actionLabel = ACTION_TYPES.find(a => a.value === action)?.label || action
  return `${entityLabel} ${actionLabel.toLowerCase()}sı`
}

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

const formatFullDate = (dateString) => {
  if (!dateString) return '-'
  const date = parseServerTimestamp(dateString)
  if (!date) return '-'
  return formatFullDateTimeBaku(date)
}

const ActivityLogs = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    userId: '',
    entityType: '',
    actionType: '',
    statusId: '',
    search: '',
    startDate: '',
    endDate: '',
  })

  const buildTypeFilter = () => {
    if (filters.entityType && filters.actionType) {
      return `${filters.entityType}_${filters.actionType}`
    }
    if (filters.entityType) {
      return filters.entityType
    }
    if (filters.actionType) {
      return filters.actionType
    }
    return ''
  }

  const { data: currentUser } = useVerifyQuery()
  const isAdmin = currentUser?.role === 'admin'

  const startDateParam = filterStartDateParam(filters.startDate)
  const endDateParam = filterEndDateParam(filters.endDate)

  const { data, isLoading } = useGetActivityLogsQuery(
    {
      page: filters.page,
      limit: filters.limit,
      ...(isAdmin ? { userId: filters.userId } : {}),
      type: buildTypeFilter(),
      search: filters.search,
      startDate: startDateParam,
      endDate: endDateParam,
      ...(filters.statusId ? { statusId: filters.statusId } : {}),
    },
    { skip: !currentUser }
  )
  const { data: users = [] } = useGetUsersQuery()
  const { data: statuses = [] } = useGetTaskStatusesQuery()

  const logs = data?.data || []
  const pagination = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 }

  const userMap = {}
  users.forEach(user => {
    userMap[user.id] = user.name || user.username || user.email
  })

  const formatAssignees = (ids) => {
    if (!Array.isArray(ids)) return String(ids)
    if (ids.length === 0) return '-'
    return ids.map(id => userMap[id] || `User #${id}`).join(', ')
  }

  const getChangeLabel = (key) => {
    const labels = {
      created: 'Tapşırıq yaradıldı',
      title: 'Başlıq dəyişdirildi',
      description: 'Açıqlama dəyişdirildi',
      startAt: 'Başlama tarixi',
      dueAt: 'Bitmə tarixi',
      statusId: 'Status dəyişdirildi',
      assignees: 'Təyin olunanlar',
      taskListId: 'Siyahı dəyişdirildi',
      is_message_send: 'Mesaj göndərildi',
      link: 'Link dəyişdirildi',
      name: 'Ad',
      color: 'Rəng',
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
      statusId: '🔄',
      assignees: '👥',
      taskListId: '📋',
      is_message_send: '💬',
      link: '🔗',
      name: '✏️',
      color: '🎨',
      parentId: '🔗',
    }
    return icons[key] || '📝'
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

  const getAssigneeChanges = (fromIds, toIds) => {
    const from = Array.isArray(fromIds) ? fromIds : []
    const to = Array.isArray(toIds) ? toIds : []
    const added = to.filter(id => !from.includes(id))
    const removed = from.filter(id => !to.includes(id))
    return { added, removed }
  }

  const formatDetailedChange = (key, value) => {
    // value null və ya undefined olduqda return null
    if (value === null || value === undefined) return null

    // Task yaratma loqu
    if (key === 'created') {
      return [{ type: 'added', text: value?.to || 'Tapşırıq yaradıldı' }]
    }

    // Assignees - { added: [...], removed: [...] } formatı (Space/Folder/List üçün)
    if (key === 'assignees' && typeof value === 'object' && (value?.added !== undefined || value?.removed !== undefined)) {
      const parts = []

      if (value.added?.length > 0) {
        const names = value.added.map(id => userMap[id] || `User #${id}`).join(', ')
        parts.push({ type: 'added', text: `${names} təyin edildi` })
      }
      if (value.removed?.length > 0) {
        const names = value.removed.map(id => userMap[id] || `User #${id}`).join(', ')
        parts.push({ type: 'removed', text: `${names} təyinatdan çıxarıldı` })
      }

      return parts.length > 0 ? parts : null
    }

    // Assignees - { from: [...], to: [...] } formatı (Task üçün)
    if (key === 'assignees' && typeof value === 'object' && value?.from !== undefined) {
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

    if (key === 'statusId' && typeof value === 'object' && value?.from !== undefined) {
      const fromStatus = statuses.find((s) => s.id === value.from)
      const toStatus = statuses.find((s) => s.id === value.to)
      return [
        {
          type: 'statusChange',
          fromStatus,
          toStatus,
          fromId: value.from,
          toId: value.to,
        },
      ]
    }

    if (key === 'startAt' || key === 'dueAt') {
      if (typeof value === 'object' && value?.from !== undefined) {
        const fromDate = value.from ? formatDateValue(value.from) : 'Təyin edilməmişdi'
        const toDate = value.to ? formatDateValue(value.to) : 'Silindi'

        if (!value.from && value.to) {
          return [{ type: 'added', text: `${toDate} olaraq təyin edildi` }]
        }
        if (value.from && !value.to) {
          return [{ type: 'removed', text: `${fromDate} silindi` }]
        }
        return [{ type: 'change', from: fromDate, to: toDate }]
      }
    }

    if (key === 'title' || key === 'description' || key === 'link' || key === 'name') {
      if (typeof value === 'object' && value?.from !== undefined) {
        const fromVal = value.from || 'Boş'
        const toVal = value.to || 'Boş'

        if (!value.from && value.to) {
          return [{ type: 'added', text: `"${truncate(toVal, 25)}" əlavə edildi` }]
        }
        if (value.from && !value.to) {
          return [{ type: 'removed', text: `"${truncate(fromVal, 25)}" silindi` }]
        }
        return [{ type: 'change', from: truncate(fromVal, 20), to: truncate(toVal, 20) }]
      }
    }

    if (key === 'parentId' && typeof value === 'object' && value !== null) {
      const fromName = value?.from || null
      const toName = value?.to || null

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

  const renderChangeValue = (value, key) => {
    if (value === null || value === undefined) return '-'
    if (key === 'assignees' && Array.isArray(value)) {
      return formatAssignees(value)
    }
    if (key === 'statusId') {
      const id = Number(value)
      if (Number.isNaN(id)) return String(value)
      const st = statuses.find((s) => s.id === id)
      return st ? (
        <TaskStatusBadge status={st} />
      ) : (
        <span className="text-xs text-gray-500">Status #{id}</span>
      )
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
        <p className="text-sm text-gray-500 mt-1">
          {isAdmin ? 'Sistemdə edilən bütün əməliyyatları izləyin' : 'Öz əməliyyat tarixçəniz'}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
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

          {/* User Filter — yalnız admin */}
          {isAdmin && (
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
          )}

          {/* Entity Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Element</label>
            <select
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {ENTITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Əməliyyat</label>
            <select
              value={filters.actionType}
              onChange={(e) => handleFilterChange('actionType', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {ACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status — tapşırıq status dəyişikliyi ilə əlaqəli loglar */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <TaskStatusFilterDropdown
              value={filters.statusId}
              onChange={(v) => handleFilterChange('statusId', v)}
              statuses={statuses}
              emptyLabel="Bütün statuslar"
            />
          </div>

          {/* Tarix — tapşırıq siyahısı ilə eyni ModalDatePicker (yalnız tarix, keçmiş günlər seçilə bilər) */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Başlama tarixi
            </label>
            <ModalDatePicker
              value={filters.startDate}
              onChange={(v) => handleFilterChange('startDate', v)}
              placeholder="Başlama tarixi"
              dateOnly
              disablePastDays={false}
              triggerClassName="cursor-pointer flex items-center gap-2 w-full min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-md hover:border-gray-400 transition-colors bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Bitmə tarixi
            </label>
            <ModalDatePicker
              value={filters.endDate}
              onChange={(v) => handleFilterChange('endDate', v)}
              placeholder="Bitmə tarixi"
              dateOnly
              disablePastDays={false}
              triggerClassName="cursor-pointer flex items-center gap-2 w-full min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-md hover:border-gray-400 transition-colors bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
                      {getActivityTypeLabel(log.type) || log.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {log.user?.username || 'Naməlum istifadəçi'} tərəfindən
                    </span>
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
                      <div className="space-y-1.5">
                        {Object.entries(log.changes).map(([key, value]) => {
                          const detailedChanges = formatDetailedChange(key, value)

                          return (
                            <div key={key} className="flex items-start gap-2 bg-white rounded-lg p-2">
                              <span className="flex-shrink-0 text-sm">{getChangeIcon(key)}</span>
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-gray-600">{getChangeLabel(key)}</span>
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
                                        {change.type === 'statusChange' && (
                                          <>
                                            {change.fromStatus ? (
                                              <TaskStatusBadge status={change.fromStatus} />
                                            ) : (
                                              <span className="text-xs text-gray-500">
                                                {change.fromId != null ? `Status #${change.fromId}` : 'Yoxdur'}
                                              </span>
                                            )}
                                            <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                            {change.toStatus ? (
                                              <TaskStatusBadge status={change.toStatus} />
                                            ) : (
                                              <span className="text-xs text-gray-500">
                                                {change.toId != null ? `Status #${change.toId}` : 'Yoxdur'}
                                              </span>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : typeof value === 'object' && value !== null && value?.from !== undefined ? (
                                  <div className="mt-1 flex items-center gap-1 flex-wrap">
                                    {key === 'statusId' ? (
                                      <>
                                        {renderChangeValue(value?.from, key)}
                                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                        {renderChangeValue(value?.to, key)}
                                      </>
                                    ) : (
                                      <>
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 text-xs">
                                          {renderChangeValue(value?.from, key)}
                                        </span>
                                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                                          {renderChangeValue(value?.to, key)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <span className="ml-1 text-gray-700 inline-flex items-center gap-1 flex-wrap">
                                    {renderChangeValue(value, key)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Time */}
                <div className="relative group">
                  <div className="text-xs text-gray-400 flex-shrink-0 cursor-help">
                    {formatRelativeTimeAgo(log.createdAt)}
                  </div>
                  <div className="absolute right-0 bottom-full mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10">
                    {formatFullDate(log.createdAt)}
                  </div>
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
