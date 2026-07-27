import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  useGetSpaceFullDetailsQuery,
  useGetFolderFullDetailsQuery,
  useCreateTaskListMutation,
  useUpdateTaskListMutation,
  useDeleteTaskListMutation,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
  useArchiveFolderMutation,
  useArchiveListMutation,
  useArchiveTaskMutation,
  useUpdateSpaceMutation,
  useDeleteSpaceMutation,
  useArchiveSpaceMutation,
  useGetUsersQuery,
  useGetTaskStatusesQuery,
} from '../services/adminApi'
import { useVerifyQuery } from '../services/authApi'
import Modal from '../components/Modal'
import ModalDatePicker from '../components/ModalDatePicker'
import { TaskStatusFilterDropdown } from '../components/TaskStatusBadge'
import { useConfirm } from '../context/ConfirmContext'
import { toast } from 'react-toastify'
import { parseServerTimestamp, filterEndDateParam, filterStartDateParam } from '../utils/bakuTime'

const BAKU_TZ = 'Asia/Baku'

const SPACE_ENTITY_TYPES = [
  { value: 'all', label: 'Hamısı' },
  { value: 'folders', label: 'Qovluq' },
  { value: 'lists', label: 'Siyahı' },
  { value: 'tasks', label: 'Tapşırıq' },
]

const FOLDER_ENTITY_TYPES = [
  { value: 'all', label: 'Hamısı' },
  { value: 'lists', label: 'Siyahı' },
  { value: 'tasks', label: 'Tapşırıq' },
]

function formatTaskTableDate(raw) {
  const d = parseServerTimestamp(raw)
  if (!d) return '—'
  return d.toLocaleDateString('en-GB', { timeZone: BAKU_TZ, day: 'numeric', month: 'numeric', year: '2-digit' })
}

function rootTasksForOverview(tasks) {
  const list = tasks || []
  return list
    .filter((t) => !t.parentId)
    .map((t) => ({
      ...t,
      _subCount: list.filter((st) => st.parentId === t.id).length,
    }))
}

const TaskLists = () => {
  const { spaceId, folderId } = useParams()
  const navigate = useNavigate()
  const { confirm } = useConfirm()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTaskList, setEditingTaskList] = useState(null)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [collapsedListIds, setCollapsedListIds] = useState(() => new Set())

  const { data: currentUser } = useVerifyQuery()
  const isAdmin = currentUser?.role === 'admin'
  const isOverviewPage = !!(spaceId && !folderId) || !!folderId
  const entityTypes = folderId ? FOLDER_ENTITY_TYPES : SPACE_ENTITY_TYPES

  const { data: users = [] } = useGetUsersQuery(undefined, { skip: !isOverviewPage })
  const { data: statuses = [] } = useGetTaskStatusesQuery(undefined, { skip: !isOverviewPage })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const startDateParam = filterStartDateParam(startDate)
  const endDateParam = filterEndDateParam(endDate)

  const hasActiveFilters = !!(
    debouncedSearch ||
    statusFilter ||
    assigneeFilter ||
    startDate ||
    endDate
  )

  const { data: spaceData, isLoading: isSpaceLoading } = useGetSpaceFullDetailsQuery(
    {
      id: spaceId,
      search: debouncedSearch,
      startDate: startDateParam,
      endDate: endDateParam,
      statusId: statusFilter,
      assigneeId: assigneeFilter,
    },
    { skip: !spaceId || !!folderId }
  )

  const { data: folderData, isLoading: isFolderLoading } = useGetFolderFullDetailsQuery(
    {
      id: folderId,
      search: debouncedSearch,
      startDate: startDateParam,
      endDate: endDateParam,
      statusId: statusFilter,
      assigneeId: assigneeFilter,
    },
    { skip: !folderId }
  )

  const handleClearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setAssigneeFilter('')
    setStartDate('')
    setEndDate('')
    setFilterType('all')
  }

  const data = folderId ? folderData : spaceData
  const isLoading = folderId ? isFolderLoading : isSpaceLoading

  const [createTaskList, { isLoading: isCreating }] = useCreateTaskListMutation()
  const [updateTaskList, { isLoading: isUpdating }] = useUpdateTaskListMutation()
  const [deleteTaskList] = useDeleteTaskListMutation()
  const [createFolder, { isLoading: isCreatingFolder }] = useCreateFolderMutation()
  const [updateFolder, { isLoading: isUpdatingFolder }] = useUpdateFolderMutation()
  const [deleteFolder] = useDeleteFolderMutation()
  const [archiveFolder] = useArchiveFolderMutation()
  const [archiveList] = useArchiveListMutation()
  const [archiveTask] = useArchiveTaskMutation()
  const [updateSpace] = useUpdateSpaceMutation()
  const [deleteSpace] = useDeleteSpaceMutation()
  const [archiveSpace] = useArchiveSpaceMutation()

  // Space/Folder edit modal state
  const [isEditingPageTitle, setIsEditingPageTitle] = useState(false)
  const [pageTitleForm, setPageTitleForm] = useState({ name: '', description: '' })

  const pageTitle = data?.name || 'Yüklənir...'
  const pageDescription = data?.description

  const listBreadcrumb = folderId
    ? [data?.space?.name, data?.name].filter(Boolean).join(' / ')
    : ''

  const navigateToList = (listId, listType = 'list') => {
    // Meeting note ayrı səhifədə açılır
    const segment = listType === 'meeting' ? 'note' : 'list'
    if (folderId && !spaceId) {
      navigate(`/tasks/folder/${folderId}/${segment}/${listId}`)
    } else if (folderId) {
      navigate(`/tasks/space/${spaceId}/folder/${folderId}/${segment}/${listId}`)
    } else {
      navigate(`/tasks/space/${spaceId}/${segment}/${listId}`)
    }
  }

  const toggleListCollapsed = (id) => {
    setCollapsedListIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const folders = data?.folders || []
  const directLists = data?.directLists || data?.taskLists || []
  const allTasks = data?.allTasks || []

  const filteredData = useMemo(() => {
    let items = { folders: [], lists: [], tasks: [] }

    if (filterType === 'all' || filterType === 'folders') {
      items.folders = folders
    }
    if (filterType === 'all' || filterType === 'lists') {
      items.lists = directLists
    }
    if (filterType === 'all' || filterType === 'tasks') {
      items.tasks = allTasks
    }

    return items
  }, [folders, directLists, allTasks, filterType])

  const handleOpenModal = (taskList = null) => {
    setEditingTaskList(taskList)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setEditingTaskList(null)
    setIsModalOpen(false)
  }

  const handleOpenFolderModal = (folder = null) => {
    setEditingFolder(folder)
    setIsFolderModalOpen(true)
  }

  const handleCloseFolderModal = () => {
    setEditingFolder(null)
    setIsFolderModalOpen(false)
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Siyahını sil',
      message: 'Bu tapşırıq siyahısını silmək istədiyinizdən əminsiniz?',
      confirmText: 'Sil',
      cancelText: 'Ləğv et',
      type: 'danger'
    })

    if (confirmed) {
      try {
        await deleteTaskList(id).unwrap()
        toast.success('Tapşırıq siyahısı silindi!')
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  const handleDeleteFolder = async (id) => {
    const confirmed = await confirm({
      title: 'Qovluğu sil',
      message: 'Bu qovluğu silmək istədiyinizdən əminsiniz?',
      confirmText: 'Sil',
      cancelText: 'Ləğv et',
      type: 'danger'
    })

    if (confirmed) {
      try {
        await deleteFolder(id).unwrap()
        toast.success('Qovluq silindi!')
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  const handleArchiveFolder = async (id, name) => {
    try {
      await archiveFolder(id).unwrap()
      toast.success(`"${name}" arxivə əlavə edildi!`)
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const handleArchiveList = async (id, name) => {
    try {
      await archiveList(id).unwrap()
      toast.success(`"${name}" arxivə əlavə edildi!`)
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const handleArchiveTask = async (id, name) => {
    try {
      await archiveTask(id).unwrap()
      toast.success(`"${name}" arxivə əlavə edildi!`)
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  // Space/Folder page title handlers
  const handleOpenPageTitleEdit = () => {
    setPageTitleForm({ name: data?.name || '', description: data?.description || '' })
    setIsEditingPageTitle(true)
  }

  const handleClosePageTitleEdit = () => {
    setIsEditingPageTitle(false)
    setPageTitleForm({ name: '', description: '' })
  }

  const handleUpdatePageTitle = async (e) => {
    e.preventDefault()
    try {
      if (folderId) {
        await updateFolder({ id: parseInt(folderId), ...pageTitleForm }).unwrap()
        toast.success('Qovluq yeniləndi!')
      } else {
        await updateSpace({ id: parseInt(spaceId), ...pageTitleForm }).unwrap()
        toast.success('Sahə yeniləndi!')
      }
      handleClosePageTitleEdit()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const handleDeletePageItem = async () => {
    const itemType = folderId ? 'qovluğu' : 'sahəni'
    const confirmed = await confirm({
      title: folderId ? 'Qovluğu sil' : 'Sahəni sil',
      message: `Bu ${itemType} silmək istədiyinizdən əminsiniz?`,
      confirmText: 'Sil',
      cancelText: 'Ləğv et',
      type: 'danger'
    })

    if (confirmed) {
      try {
        if (folderId) {
          await deleteFolder(parseInt(folderId)).unwrap()
          toast.success('Qovluq silindi!')
          navigate(`/tasks/space/${spaceId}`)
        } else {
          await deleteSpace(parseInt(spaceId)).unwrap()
          toast.success('Sahə silindi!')
          navigate('/projects')
        }
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  const handleArchivePageItem = async () => {
    try {
      if (folderId) {
        await archiveFolder(parseInt(folderId)).unwrap()
        toast.success(`"${data?.name}" arxivə əlavə edildi!`)
        navigate(`/tasks/space/${spaceId}`)
      } else {
        await archiveSpace(parseInt(spaceId)).unwrap()
        toast.success(`"${data?.name}" arxivə əlavə edildi!`)
        navigate('/projects')
      }
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const isEmpty = !folderId
    ? folders.length === 0 && directLists.length === 0 && allTasks.length === 0
    : directLists.length === 0 && allTasks.length === 0

  if (isEmpty && !isLoading && !debouncedSearch && !(isOverviewPage && hasActiveFilters)) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <button
              onClick={() => folderId ? navigate(`/tasks/space/${spaceId}`) : navigate('/projects')}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900 truncate">{pageTitle}</h1>
                <div className="flex gap-1">
                  <button
                    onClick={handleOpenPageTitleEdit}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Redaktə et"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={handleArchivePageItem}
                    className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                    title="Arxivə at"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </button>
                  <button
                    onClick={handleDeletePageItem}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Sil"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              {pageDescription && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{pageDescription}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-xl font-medium text-gray-900 mb-2">{folderId ? 'Bu qovluq boşdur' : 'Bu sahə boşdur'}</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">Başlamaq üçün {!folderId && 'qovluq və ya '}siyahı yaradın.</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            {!folderId && (
              <button
                onClick={() => handleOpenFolderModal()}
                className="flex-1 flex flex-col items-center gap-3 p-6 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div>
                  <span className="font-medium text-gray-900 block">Qovluq yarat</span>
                  <span className="text-xs text-gray-500">Siyahıları qruplaşdır</span>
                </div>
              </button>
            )}
            <button
              onClick={() => handleOpenModal()}
              className="flex-1 flex flex-col items-center gap-3 p-6 border-2 border-dashed border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all group"
            >
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <span className="font-medium text-gray-900 block">Siyahı yarat</span>
                <span className="text-xs text-gray-500">Tapşırıqları izlə</span>
              </div>
            </button>
          </div>
        </div>

        <TaskListFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          taskList={editingTaskList}
          spaceId={spaceId}
          folderId={folderId}
          createTaskList={createTaskList}
          updateTaskList={updateTaskList}
          isCreating={isCreating}
          isUpdating={isUpdating}
        />
        {!folderId && (
          <FolderFormModal
            isOpen={isFolderModalOpen}
            onClose={handleCloseFolderModal}
            folder={editingFolder}
            spaceId={spaceId}
            createFolder={createFolder}
            updateFolder={updateFolder}
            isCreating={isCreatingFolder}
            isUpdating={isUpdatingFolder}
          />
        )}

        {/* Space/Folder Edit Modal */}
        <Modal
          isOpen={isEditingPageTitle}
          onClose={handleClosePageTitleEdit}
          title={folderId ? 'Qovluğu redaktə et' : 'Sahəni redaktə et'}
        >
          <form onSubmit={handleUpdatePageTitle} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ad</label>
              <input
                type="text"
                value={pageTitleForm.name}
                onChange={(e) => setPageTitleForm({ ...pageTitleForm, name: e.target.value })}
                required
                placeholder={folderId ? 'Qovluq adı' : 'Sahə adı'}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıqlama</label>
              <textarea
                value={pageTitleForm.description}
                onChange={(e) => setPageTitleForm({ ...pageTitleForm, description: e.target.value })}
                rows={3}
                placeholder="Açıqlama..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={handleClosePageTitleEdit} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50">Ləğv et</button>
              <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Yenilə
              </button>
            </div>
          </form>
        </Modal>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <button
            onClick={() => folderId ? navigate(`/tasks/space/${spaceId}`) : navigate('/projects')}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900 truncate">{pageTitle}</h1>
              <div className="flex gap-1">
                <button
                  onClick={handleOpenPageTitleEdit}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Redaktə et"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={handleArchivePageItem}
                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                  title="Arxivə at"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </button>
                <button
                  onClick={handleDeletePageItem}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Sil"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            {pageDescription && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{pageDescription}</p>}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {!folderId && (
              <button
                onClick={() => handleOpenFolderModal()}
                className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Qovluq</span>
              </button>
            )}
            <button
              onClick={() => handleOpenModal()}
              className="flex-1 sm:flex-initial px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Siyahı</span>
            </button>
          </div>
        </div>

        {isOverviewPage && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex flex-col xl:flex-row xl:items-end gap-4">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Axtar</label>
                <input
                  type="text"
                  placeholder={folderId ? 'Siyahı və ya tapşırıq axtar...' : 'Qovluq, siyahı və ya tapşırıq axtar...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {isAdmin ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">İstifadəçi</label>
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
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
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Təyin edilmiş</label>
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Hamısı</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Element</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {entityTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <TaskStatusFilterDropdown
                  value={statusFilter}
                  onChange={setStatusFilter}
                  statuses={statuses}
                  emptyLabel="Bütün statuslar"
                />
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

            <button
              type="button"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="shrink-0 w-full xl:w-auto px-4 py-2 text-sm font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              Filterləri sıfırla
            </button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredData.folders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Qovluqlar ({filteredData.folders.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredData.folders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => navigate(`/tasks/space/${spaceId}/folder/${folder.id}`)}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleArchiveFolder(folder.id, folder.name) }}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Arxivə at"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenFolderModal(folder) }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1 truncate">{folder.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-1">{folder.description || 'Açıqlama yoxdur'}</p>
                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span>{folder.taskLists?.length || 0} siyahı</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredData.lists.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Siyahılar ({filteredData.lists.length})
              </h2>
              <div className="space-y-4">
                {filteredData.lists.map((list) => {
                  const isCollapsed = collapsedListIds.has(list.id)
                  const rows = rootTasksForOverview(list.tasks)
                  return (
                    <div key={list.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      {listBreadcrumb && (
                        <div className="px-3 pt-2.5 pb-0 text-[11px] text-gray-400 truncate" title={listBreadcrumb}>
                          {listBreadcrumb}
                        </div>
                      )}
                      <div className="flex items-center gap-1 px-2 sm:px-3 py-2 border-b border-gray-100 bg-gray-50/80">
                        <button
                          type="button"
                          onClick={() => toggleListCollapsed(list.id)}
                          className="p-1 rounded hover:bg-gray-200 text-gray-600 shrink-0"
                          title={isCollapsed ? 'Aç' : 'Bağla'}
                          aria-expanded={!isCollapsed}
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigateToList(list.id, list.type)}
                          className="flex-1 min-w-0 text-left font-medium text-gray-900 hover:text-blue-600 truncate text-sm py-0.5"
                        >
                          {list.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigateToList(list.id, list.type)}
                          className="hidden sm:inline text-xs text-blue-600 hover:underline shrink-0 px-2"
                        >
                          + Tapşırıq əlavə et
                        </button>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleArchiveList(list.id, list.name) }}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Arxivə at"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(list) }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Redaktə et"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(list.id) }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Sil"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {!isCollapsed && (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[720px] text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 bg-white">
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Başlıq</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 w-[28%] min-w-[120px]">Açıqlama</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Bitmə</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Status</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Yaradılıb</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Yenilənib</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {rows.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">
                                    Bu siyahıda tapşırıq yoxdur — tam görünüş üçün siyahıya daxil olun.
                                  </td>
                                </tr>
                              ) : (
                                rows.map((task) => (
                                  <tr
                                    key={task.id}
                                    className="hover:bg-gray-50 cursor-pointer"
                                    onClick={() => navigateToList(list.id, list.type)}
                                  >
                                    <td className="px-3 py-2 align-top">
                                      <div className="flex items-start gap-2 min-w-0">
                                        <span className="font-medium text-gray-900 line-clamp-2">{task.title}</span>
                                        {task._subCount > 0 && (
                                          <span className="inline-flex items-center gap-0.5 shrink-0 text-[10px] text-gray-500 bg-gray-100 rounded px-1 py-0.5" title="Alt tapşırıq">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                            </svg>
                                            {task._subCount}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 align-top text-gray-600">
                                      <span className="line-clamp-2 text-xs">{task.description || '—'}</span>
                                    </td>
                                    <td className="px-3 py-2 align-top text-gray-600 whitespace-nowrap text-xs">
                                      {formatTaskTableDate(task.dueAt)}
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                      {task.status ? (
                                        <span
                                          className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded"
                                          style={{ backgroundColor: task.status.color + '20', color: task.status.color }}
                                        >
                                          {task.status.name}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 align-top text-gray-600 whitespace-nowrap text-xs">
                                      {formatTaskTableDate(task.createdAt)}
                                    </td>
                                    <td className="px-3 py-2 align-top text-gray-600 whitespace-nowrap text-xs">
                                      {formatTaskTableDate(task.updatedAt)}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {filterType === 'tasks' && filteredData.tasks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Tapşırıqlar ({filteredData.tasks.length})
              </h2>
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                {filteredData.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
                          {task.status && (
                            <span
                              className="px-2 py-0.5 text-xs font-medium rounded-full"
                              style={{ backgroundColor: task.status.color + '20', color: task.status.color }}
                            >
                              {task.status.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {task.folderName && <span className="text-blue-600">{task.folderName}</span>}
                          {task.folderName && <span>/</span>}
                          <span className="text-green-600">{task.listName}</span>
                          {task.assignees?.length > 0 && (
                            <>
                              <span className="mx-1">•</span>
                              <div className="flex -space-x-1">
                                {task.assignees.slice(0, 3).map((a) => (
                                  <div key={a.id} className="w-5 h-5 rounded-full bg-gray-300 border border-white flex items-center justify-center text-[10px] font-medium text-gray-600">
                                    {a.name?.charAt(0) || a.email?.charAt(0)}
                                  </div>
                                ))}
                                {task.assignees.length > 3 && (
                                  <div className="w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[10px] font-medium text-gray-600">
                                    +{task.assignees.length - 3}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleArchiveTask(task.id, task.title)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Arxivə at"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredData.folders.length === 0 && filteredData.lists.length === 0 && filteredData.tasks.length === 0 && (debouncedSearch || (isOverviewPage && hasActiveFilters)) && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nəticə tapılmadı</h3>
              <p className="text-gray-500">
                {debouncedSearch
                  ? `"${debouncedSearch}" üçün heç bir nəticə tapılmadı`
                  : 'Seçilmiş filterlər üzrə heç bir nəticə tapılmadı'}
              </p>
            </div>
          )}
        </div>
      )}

      <TaskListFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        taskList={editingTaskList}
        spaceId={spaceId}
        folderId={folderId}
        createTaskList={createTaskList}
        updateTaskList={updateTaskList}
        isCreating={isCreating}
        isUpdating={isUpdating}
      />
      {!folderId && (
        <FolderFormModal
          isOpen={isFolderModalOpen}
          onClose={handleCloseFolderModal}
          folder={editingFolder}
          spaceId={spaceId}
          createFolder={createFolder}
          updateFolder={updateFolder}
          isCreating={isCreatingFolder}
          isUpdating={isUpdatingFolder}
        />
      )}

      {/* Space/Folder Edit Modal */}
      <Modal
        isOpen={isEditingPageTitle}
        onClose={handleClosePageTitleEdit}
        title={folderId ? 'Qovluğu redaktə et' : 'Sahəni redaktə et'}
      >
        <form onSubmit={handleUpdatePageTitle} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ad</label>
            <input
              type="text"
              value={pageTitleForm.name}
              onChange={(e) => setPageTitleForm({ ...pageTitleForm, name: e.target.value })}
              required
              placeholder={folderId ? 'Qovluq adı' : 'Sahə adı'}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Açıqlama</label>
            <textarea
              value={pageTitleForm.description}
              onChange={(e) => setPageTitleForm({ ...pageTitleForm, description: e.target.value })}
              rows={3}
              placeholder="Açıqlama..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={handleClosePageTitleEdit} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50">Ləğv et</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Yenilə
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

const TaskListFormModal = ({ isOpen, onClose, taskList, folderId, spaceId, createTaskList, updateTaskList, isCreating, isUpdating }) => {
  const [formData, setFormData] = useState({ name: '' })

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: taskList?.name || '' })
    }
  }, [taskList, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (taskList) {
        await updateTaskList({ id: taskList.id, ...formData }).unwrap()
        toast.success('Tapşırıq siyahısı yeniləndi!')
      } else {
        const payload = { name: formData.name }
        if (folderId) payload.folderId = parseInt(folderId)
        else if (spaceId) payload.spaceId = parseInt(spaceId)
        await createTaskList(payload).unwrap()
        toast.success('Tapşırıq siyahısı yaradıldı!')
      }
      onClose()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={taskList ? 'Siyahını redaktə et' : 'Yeni siyahı'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Siyahı adı</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ name: e.target.value })}
            required
            placeholder="Məsələn: Sprint 1 Taskları"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50">Ləğv et</button>
          <button type="submit" disabled={isCreating || isUpdating} className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400">
            {isCreating || isUpdating ? 'Yüklənir...' : taskList ? 'Yenilə' : 'Yarat'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

const FolderFormModal = ({ isOpen, onClose, folder, spaceId, createFolder, updateFolder, isCreating, isUpdating }) => {
  const [formData, setFormData] = useState({ name: '', description: '' })

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: folder?.name || '', description: folder?.description || '' })
    }
  }, [folder, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (folder) {
        await updateFolder({ id: folder.id, ...formData }).unwrap()
        toast.success('Qovluq yeniləndi!')
      } else {
        await createFolder({ ...formData, spaceId: parseInt(spaceId) }).unwrap()
        toast.success('Qovluq yaradıldı!')
      }
      onClose()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={folder ? 'Qovluğu redaktə et' : 'Yeni qovluq'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Qovluq adı</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Məsələn: Marketing Layihəsi"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Açıqlama</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder="Qovluq haqqında qısa açıqlama..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50">Ləğv et</button>
          <button type="submit" disabled={isCreating || isUpdating} className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400">
            {isCreating || isUpdating ? 'Yüklənir...' : folder ? 'Yenilə' : 'Yarat'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default TaskLists
