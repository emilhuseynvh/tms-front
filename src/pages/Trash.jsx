import { useState, useMemo } from 'react'
import {
  useGetTrashQuery,
  useRestoreFolderMutation,
  useRestoreListMutation,
  useRestoreTaskMutation,
  usePermanentDeleteFolderMutation,
  usePermanentDeleteListMutation,
  usePermanentDeleteTaskMutation,
} from '../services/adminApi'
import { useVerifyQuery } from '../services/authApi'
import { toast } from 'react-toastify'

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day}.${month}.${year} ${hours}:${minutes}`
}

const getTypeLabel = (type) => {
  switch (type) {
    case 'folder': return 'Qovluq'
    case 'list': return 'Siyahı'
    case 'task': return 'Tapşırıq'
    default: return type
  }
}

const getTypeColor = (type) => {
  switch (type) {
    case 'folder': return 'bg-purple-100 text-purple-700'
    case 'list': return 'bg-blue-100 text-blue-700'
    case 'task': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const getTypeIcon = (type) => {
  switch (type) {
    case 'folder': return '📁'
    case 'list': return '📋'
    case 'task': return '✅'
    default: return '📄'
  }
}

const Trash = () => {
  const { data, isLoading } = useGetTrashQuery()
  const { data: currentUser } = useVerifyQuery()
  const [restoreFolder, { isLoading: isRestoringFolder }] = useRestoreFolderMutation()
  const [restoreList, { isLoading: isRestoringList }] = useRestoreListMutation()
  const [restoreTask, { isLoading: isRestoringTask }] = useRestoreTaskMutation()
  const [permanentDeleteFolder] = usePermanentDeleteFolderMutation()
  const [permanentDeleteList] = usePermanentDeleteListMutation()
  const [permanentDeleteTask] = usePermanentDeleteTaskMutation()

  const [selectedUserId, setSelectedUserId] = useState('all')

  const isAdmin = currentUser?.role === 'admin'

  const folders = data?.folders || []
  const lists = data?.lists || []
  const tasks = data?.tasks || []

  const handleRestore = async (type, id, name) => {
    try {
      if (type === 'folder') {
        await restoreFolder(id).unwrap()
      } else if (type === 'list') {
        await restoreList(id).unwrap()
      } else if (type === 'task') {
        await restoreTask(id).unwrap()
      }
      toast.success(`"${name}" bərpa edildi!`)
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const handlePermanentDelete = async (type, id, name) => {
    if (!window.confirm(`"${name}" həmişəlik silinəcək. Bu əməliyyat geri alına bilməz. Davam etmək istəyirsiniz?`)) {
      return
    }

    try {
      if (type === 'folder') {
        await permanentDeleteFolder(id).unwrap()
      } else if (type === 'list') {
        await permanentDeleteList(id).unwrap()
      } else if (type === 'task') {
        await permanentDeleteTask(id).unwrap()
      }
      toast.success(`"${name}" həmişəlik silindi!`)
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  // Combine all items into a single list sorted by deletedAt
  const allItems = useMemo(() => {
    return [
      ...folders.map(f => ({ ...f, type: 'folder' })),
      ...lists.map(l => ({ ...l, type: 'list' })),
      ...tasks.map(t => ({ ...t, type: 'task', name: t.title }))
    ].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
  }, [folders, lists, tasks])

  // Get unique users who deleted items (for admin filter)
  const deletedByUsers = useMemo(() => {
    const userMap = new Map()
    allItems.forEach(item => {
      if (item.deletedBy) {
        userMap.set(item.deletedBy.id, {
          id: item.deletedBy.id,
          name: item.deletedBy.name || item.deletedBy.username || item.deletedBy.email
        })
      }
    })
    return Array.from(userMap.values())
  }, [allItems])

  // Filter items by selected user
  const filteredItems = useMemo(() => {
    if (selectedUserId === 'all') return allItems
    return allItems.filter(item => item.deletedBy?.id === Number(selectedUserId))
  }, [allItems, selectedUserId])

  const isRestoring = isRestoringFolder || isRestoringList || isRestoringTask

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Zibil qabı</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              <span className="hidden sm:inline">Silinmiş elementləri bərpa edin və ya həmişəlik silin</span>
              <span className="sm:hidden">Silinmiş elementlər</span>
              {filteredItems.length > 0 && <span className="ml-1 sm:ml-2 text-gray-400">({filteredItems.length})</span>}
            </p>
          </div>
        </div>

        {/* Admin Filter */}
        {isAdmin && deletedByUsers.length > 0 && (
          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <label className="text-xs sm:text-sm text-gray-600">Silən şəxsə görə:</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
            >
              <option value="all">Hamısı</option>
              {deletedByUsers.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-6 sm:p-8 text-center bg-white rounded-lg border border-gray-200">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Yüklənir...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-6 sm:p-8 text-center bg-white rounded-lg border border-gray-200">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <p className="text-sm sm:text-base text-gray-500">Zibil qabı boşdur</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {filteredItems.map((item) => (
            <div key={`${item.type}-${item.id}`} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                {/* Icon */}
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-100 flex items-center justify-center text-base sm:text-lg flex-shrink-0">
                  {getTypeIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-medium text-sm sm:text-base text-gray-900 truncate max-w-[150px] sm:max-w-none">
                      {item.name || item.title}
                    </h3>
                    <span className={`inline-flex px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded ${getTypeColor(item.type)}`}>
                      {getTypeLabel(item.type)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-[10px] sm:text-xs text-gray-500">
                    <span>{formatDate(item.deletedAt)}</span>
                    {isAdmin && item.deletedBy && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-700 font-medium">
                          {item.deletedBy.name || item.deletedBy.username || item.deletedBy.email}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Mobile Actions */}
                  <div className="flex gap-2 mt-2 sm:hidden">
                    <button
                      onClick={() => handleRestore(item.type, item.id, item.name || item.title)}
                      disabled={isRestoring}
                      className="flex-1 px-2 py-1.5 text-[10px] font-medium text-green-600 border border-green-200 rounded-md hover:bg-green-50 transition-colors disabled:opacity-50"
                    >
                      Bərpa et
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(item.type, item.id, item.name || item.title)}
                      className="flex-1 px-2 py-1.5 text-[10px] font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                    >
                      Sil
                    </button>
                  </div>
                </div>

                {/* Desktop Actions */}
                <div className="hidden sm:flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRestore(item.type, item.id, item.name || item.title)}
                    disabled={isRestoring}
                    className="px-3 py-1.5 text-xs font-medium text-green-600 border border-green-200 rounded-md hover:bg-green-50 transition-colors disabled:opacity-50"
                  >
                    Bərpa et
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(item.type, item.id, item.name || item.title)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                  >
                    Həmişəlik sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      {filteredItems.length > 0 && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-2 sm:gap-3">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs sm:text-sm text-amber-800">
              <p className="font-medium mb-1">Qeyd</p>
              <p className="leading-relaxed">Silinmiş elementlər 30 gün sonra avtomatik olaraq həmişəlik silinəcək.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Trash
