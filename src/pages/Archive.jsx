import { useState, useMemo } from 'react'
import {
  useGetArchiveQuery,
  useUnarchiveSpaceMutation,
  useUnarchiveFolderMutation,
  useUnarchiveListMutation,
  useUnarchiveTaskMutation,
} from '../services/adminApi'
import { useVerifyQuery } from '../services/authApi'
import { toast } from 'react-toastify'

const formatDate = (dateString) => {
  if (!dateString) return '-'
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
    case 'space': return 'Sahə'
    case 'folder': return 'Qovluq'
    case 'list': return 'Siyahı'
    case 'task': return 'Tapşırıq'
    default: return type
  }
}

const getTypeColor = (type) => {
  switch (type) {
    case 'space': return 'bg-indigo-100 text-indigo-700'
    case 'folder': return 'bg-purple-100 text-purple-700'
    case 'list': return 'bg-blue-100 text-blue-700'
    case 'task': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const getTypeIcon = (type) => {
  switch (type) {
    case 'space': return '🗂️'
    case 'folder': return '📁'
    case 'list': return '📋'
    case 'task': return '✅'
    default: return '📄'
  }
}

const Archive = () => {
  const { data, isLoading } = useGetArchiveQuery()
  const { data: currentUser } = useVerifyQuery()
  const [unarchiveSpace, { isLoading: isUnarchivingSpace }] = useUnarchiveSpaceMutation()
  const [unarchiveFolder, { isLoading: isUnarchivingFolder }] = useUnarchiveFolderMutation()
  const [unarchiveList, { isLoading: isUnarchivingList }] = useUnarchiveListMutation()
  const [unarchiveTask, { isLoading: isUnarchivingTask }] = useUnarchiveTaskMutation()

  const [selectedUserId, setSelectedUserId] = useState('all')

  const isAdmin = currentUser?.role === 'admin'

  const spaces = data?.spaces || []
  const folders = data?.folders || []
  const lists = data?.lists || []
  const tasks = data?.tasks || []

  const handleUnarchive = async (type, id, name) => {
    try {
      if (type === 'space') {
        await unarchiveSpace(id).unwrap()
      } else if (type === 'folder') {
        await unarchiveFolder(id).unwrap()
      } else if (type === 'list') {
        await unarchiveList(id).unwrap()
      } else if (type === 'task') {
        await unarchiveTask(id).unwrap()
      }
      toast.success(`"${name}" arxivdən çıxarıldı!`)
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const allItems = useMemo(() => {
    return [
      ...spaces.map(s => ({ ...s, type: 'space' })),
      ...folders.map(f => ({ ...f, type: 'folder' })),
      ...lists.map(l => ({ ...l, type: 'list' })),
      ...tasks.map(t => ({ ...t, type: 'task', name: t.title }))
    ].sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt))
  }, [spaces, folders, lists, tasks])

  const archivedByUsers = useMemo(() => {
    const userMap = new Map()
    allItems.forEach(item => {
      if (item.archivedBy) {
        userMap.set(item.archivedBy.id, {
          id: item.archivedBy.id,
          name: item.archivedBy.name || item.archivedBy.username || item.archivedBy.email
        })
      }
    })
    return Array.from(userMap.values())
  }, [allItems])

  const filteredItems = useMemo(() => {
    if (selectedUserId === 'all') return allItems
    return allItems.filter(item => item.archivedBy?.id === Number(selectedUserId))
  }, [allItems, selectedUserId])

  const isUnarchiving = isUnarchivingSpace || isUnarchivingFolder || isUnarchivingList || isUnarchivingTask

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Arxiv</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              <span className="hidden sm:inline">Arxivləşdirilmiş elementləri bərpa edin</span>
              <span className="sm:hidden">Arxivləşdirilmiş elementlər</span>
              {filteredItems.length > 0 && <span className="ml-1 sm:ml-2 text-gray-400">({filteredItems.length})</span>}
            </p>
          </div>
        </div>

        {isAdmin && archivedByUsers.length > 0 && (
          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <label className="text-xs sm:text-sm text-gray-600">Arxivləyən şəxsə görə:</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
            >
              <option value="all">Hamısı</option>
              {archivedByUsers.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="p-6 sm:p-8 text-center bg-white rounded-lg border border-gray-200">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Yüklənir...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-6 sm:p-8 text-center bg-white rounded-lg border border-gray-200">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <p className="text-sm sm:text-base text-gray-500">Arxiv boşdur</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {filteredItems.map((item) => (
            <div key={`${item.type}-${item.id}`} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-100 flex items-center justify-center text-base sm:text-lg flex-shrink-0">
                  {getTypeIcon(item.type)}
                </div>

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
                    <span>{formatDate(item.archivedAt)}</span>
                    {isAdmin && item.archivedBy && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-700 font-medium">
                          {item.archivedBy.name || item.archivedBy.username || item.archivedBy.email}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-2 sm:hidden">
                    <button
                      onClick={() => handleUnarchive(item.type, item.id, item.name || item.title)}
                      disabled={isUnarchiving}
                      className="flex-1 px-2 py-1.5 text-[10px] font-medium text-amber-600 border border-amber-200 rounded-md hover:bg-amber-50 transition-colors disabled:opacity-50"
                    >
                      Arxivdən çıxar
                    </button>
                  </div>
                </div>

                <div className="hidden sm:flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleUnarchive(item.type, item.id, item.name || item.title)}
                    disabled={isUnarchiving}
                    className="px-3 py-1.5 text-xs font-medium text-amber-600 border border-amber-200 rounded-md hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    Arxivdən çıxar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredItems.length > 0 && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-2 sm:gap-3">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs sm:text-sm text-blue-800">
              <p className="font-medium mb-1">Qeyd</p>
              <p className="leading-relaxed">Arxivləşdirilmiş elementlər həmişəlik saxlanılır və avtomatik silinmir. İstənilən vaxt bərpa edə bilərsiniz.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Archive
