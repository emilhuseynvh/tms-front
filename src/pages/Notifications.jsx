import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useGetUsersQuery,
} from '../services/adminApi'
import { formatFullDateTimeBaku, parseServerTimestamp, filterStartDateParam, filterEndDateParam } from '../utils/bakuTime'
import ModalDatePicker from '../components/ModalDatePicker'
import BrowserNotificationToggle from '../components/BrowserNotificationToggle'

const FILTERS = [
  { value: 'all', label: 'Hamısı' },
  { value: 'unread', label: 'Oxunmamış' },
  { value: 'read', label: 'Oxunmuş' },
]

const getNotificationIcon = (type) => {
  switch (type) {
    case 'task_assigned':
      return (
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
      )
    case 'task_unassigned':
      return (
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
          </svg>
        </div>
      )
    case 'task_deadline':
      return (
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
    case 'task_message':
      return (
        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      )
    default:
      return (
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      )
  }
}

const formatNotificationDate = (raw) => {
  const d = parseServerTimestamp(raw)
  if (!d) return '-'
  return formatFullDateTimeBaku(d)
}

const Notifications = () => {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [person, setPerson] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data: users = [] } = useGetUsersQuery()

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [filter, debouncedSearch, person, startDate, endDate])

  const { data, isLoading } = useGetNotificationsQuery({
    filter,
    page,
    limit,
    search: debouncedSearch,
    person,
    startDate: filterStartDateParam(startDate) || '',
    endDate: filterEndDateParam(endDate) || '',
  })

  const [markAsRead] = useMarkNotificationAsReadMutation()
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation()
  const [deleteNotification] = useDeleteNotificationMutation()

  const notifications = data?.data || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }

    let path = notification.url || null
    if (!path) {
      const taskList = notification.task?.taskList
      if (taskList) {
        const segment = taskList.type === 'meeting' ? 'note' : 'list'
        if (taskList.folderId && taskList.folder?.spaceId) {
          path = `/tasks/space/${taskList.folder.spaceId}/folder/${taskList.folderId}/${segment}/${taskList.id}`
        } else if (taskList.spaceId) {
          path = `/tasks/space/${taskList.spaceId}/${segment}/${taskList.id}`
        }
      } else if (notification.spaceId) {
        path = `/tasks/space/${notification.spaceId}`
      }
    }

    if (path) navigate(path)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    await deleteNotification(id)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Bildirişlər</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bütün bildirişləriniz burada görünür {total > 0 && <span className="text-gray-400">({total})</span>}
          </p>
        </div>
        <button
          onClick={() => markAllAsRead()}
          className="self-start sm:self-auto px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
        >
          Hamısını oxunmuş et
        </button>
      </div>

      {/* Brauzer bildirişləri */}
      <div className="mb-6">
        <BrowserNotificationToggle />
      </div>

      {/* Filters — Əməliyyat tarixçəsi ilə eyni üslub */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Axtar</label>
            <input
              type="text"
              placeholder="Bildiriş axtar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Şəxs</label>
            <select
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Bütün şəxslər</option>
              {users.map((user) => (
                <option key={user.id} value={user.username}>{user.username}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Vəziyyət</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Başlama tarixi</label>
            <ModalDatePicker
              value={startDate}
              onChange={setStartDate}
              placeholder="Başlama tarixi"
              dateOnly
              disablePastDays={false}
              triggerClassName="cursor-pointer flex items-center gap-2 w-full min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-md hover:border-gray-400 transition-colors bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Bitmə tarixi</label>
            <ModalDatePicker
              value={endDate}
              onChange={setEndDate}
              placeholder="Bitmə tarixi"
              dateOnly
              disablePastDays={false}
              triggerClassName="cursor-pointer flex items-center gap-2 w-full min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-md hover:border-gray-400 transition-colors bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yüklənir...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-gray-500">
            {debouncedSearch ? 'Axtarışa uyğun bildiriş tapılmadı' : 'Heç bir bildiriş yoxdur'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer group ${
                !notification.isRead ? 'bg-blue-50/50' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {notification.title}
                    </p>
                    {!notification.isRead && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0" title="Oxunmamış" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 wrap-break-word">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatNotificationDate(notification.createdAt)}</p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, notification.id)}
                  className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  title="Sil"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Əvvəlki
          </button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Növbəti
          </button>
        </div>
      )}
    </div>
  )
}

export default Notifications
