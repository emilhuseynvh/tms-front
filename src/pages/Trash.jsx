import {
  useGetTrashQuery,
  useRestoreFolderMutation,
  useRestoreListMutation,
  useRestoreTaskMutation,
  usePermanentDeleteFolderMutation,
  usePermanentDeleteListMutation,
  usePermanentDeleteTaskMutation,
} from '../services/adminApi'
import { toast } from 'react-toastify'

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('az-AZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
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
  const [restoreFolder, { isLoading: isRestoringFolder }] = useRestoreFolderMutation()
  const [restoreList, { isLoading: isRestoringList }] = useRestoreListMutation()
  const [restoreTask, { isLoading: isRestoringTask }] = useRestoreTaskMutation()
  const [permanentDeleteFolder] = usePermanentDeleteFolderMutation()
  const [permanentDeleteList] = usePermanentDeleteListMutation()
  const [permanentDeleteTask] = usePermanentDeleteTaskMutation()

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
  const allItems = [
    ...folders.map(f => ({ ...f, type: 'folder' })),
    ...lists.map(l => ({ ...l, type: 'list' })),
    ...tasks.map(t => ({ ...t, type: 'task', name: t.title }))
  ].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))

  const isRestoring = isRestoringFolder || isRestoringList || isRestoringTask

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Zibil qabı</h1>
            <p className="text-sm text-gray-500">
              Silinmiş elementləri bərpa edin və ya həmişəlik silin
              {allItems.length > 0 && <span className="ml-2 text-gray-400">({allItems.length} element)</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yüklənir...</p>
        </div>
      ) : allItems.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <p className="text-gray-500">Zibil qabı boşdur</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {allItems.map((item) => (
            <div key={`${item.type}-${item.id}`} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                  {getTypeIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-medium text-gray-900 truncate">
                      {item.name || item.title}
                    </h3>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getTypeColor(item.type)}`}>
                      {getTypeLabel(item.type)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Silinmə tarixi: {formatDate(item.deletedAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
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
      {allItems.length > 0 && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Qeyd</p>
              <p>Silinmiş elementlər 30 gün sonra avtomatik olaraq həmişəlik silinəcək. Bərpa etmək istədiyiniz elementləri vaxtında bərpa edin.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Trash
