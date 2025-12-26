import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  useGetTaskListsByFolderQuery,
  useGetTaskListsBySpaceQuery,
  useGetFoldersBySpaceQuery,
  useGetSpaceQuery,
  useCreateTaskListMutation,
  useUpdateTaskListMutation,
  useDeleteTaskListMutation,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
} from '../services/adminApi'
import Modal from '../components/Modal'
import { toast } from 'react-toastify'

const TaskLists = () => {
  const { spaceId, folderId } = useParams()
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTaskList, setEditingTaskList] = useState(null)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterType, setFilterType] = useState('all') // 'all', 'folders', 'lists'

  // Space and folder data
  const { data: space } = useGetSpaceQuery(spaceId, { skip: !spaceId })
  const { data: folders = [], isLoading: isFoldersLoading } = useGetFoldersBySpaceQuery(spaceId, { skip: !spaceId })

  // Task lists based on context
  const { data: folderTaskLists = [], isLoading: isFolderLoading } = useGetTaskListsByFolderQuery(
    { folderId, search, startDate, endDate },
    { skip: !folderId }
  )
  const { data: spaceDirectLists = [], isLoading: isSpaceLoading } = useGetTaskListsBySpaceQuery(
    spaceId,
    { skip: !spaceId || !!folderId }
  )

  const taskLists = folderId ? folderTaskLists : spaceDirectLists
  const isLoading = folderId ? isFolderLoading : (isSpaceLoading || isFoldersLoading)

  // Check if space is empty (no folders and no lists)
  const isSpaceEmpty = !folderId && folders.length === 0 && spaceDirectLists.length === 0

  const [createTaskList, { isLoading: isCreating }] = useCreateTaskListMutation()
  const [updateTaskList, { isLoading: isUpdating }] = useUpdateTaskListMutation()
  const [deleteTaskList] = useDeleteTaskListMutation()
  const [createFolder, { isLoading: isCreatingFolder }] = useCreateFolderMutation()
  const [updateFolder, { isLoading: isUpdatingFolder }] = useUpdateFolderMutation()
  const [deleteFolder] = useDeleteFolderMutation()

  const currentFolder = useMemo(() => {
    return folders.find((f) => f.id === parseInt(folderId))
  }, [folders, folderId])

  const pageTitle = useMemo(() => {
    if (folderId && currentFolder) {
      return currentFolder.name
    }
    if (space) {
      return space.name
    }
    return 'Tapşırıqlar'
  }, [folderId, currentFolder, space])

  const pageDescription = useMemo(() => {
    if (folderId && currentFolder) {
      return currentFolder.description
    }
    if (space) {
      return space.description
    }
    return null
  }, [folderId, currentFolder, space])

  // Filtered items for space view (folders + lists)
  const filteredItems = useMemo(() => {
    if (folderId) return [] // Not used in folder view

    let items = []

    // Add folders
    if (filterType === 'all' || filterType === 'folders') {
      const filteredFolders = folders.filter(folder =>
        !search || folder.name.toLowerCase().includes(search.toLowerCase())
      ).map(folder => ({ ...folder, type: 'folder' }))
      items = [...items, ...filteredFolders]
    }

    // Add lists
    if (filterType === 'all' || filterType === 'lists') {
      const filteredLists = spaceDirectLists.filter(list =>
        !search || list.name.toLowerCase().includes(search.toLowerCase())
      ).map(list => ({ ...list, type: 'list' }))
      items = [...items, ...filteredLists]
    }

    return items
  }, [folders, spaceDirectLists, search, filterType, folderId])

  const handleClearFilters = () => {
    setSearch('')
    setStartDate('')
    setEndDate('')
    setFilterType('all')
  }

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
    if (window.confirm('Bu tapşırıq siyahısını silmək istədiyinizdən əminsiniz?')) {
      try {
        await deleteTaskList(id).unwrap()
        toast.success('Tapşırıq siyahısı silindi!')
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  const handleDeleteFolder = async (id) => {
    if (window.confirm('Bu qovluğu silmək istədiyinizdən əminsiniz?')) {
      try {
        await deleteFolder(id).unwrap()
        toast.success('Qovluq silindi!')
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  // Empty state for space
  if (!folderId && isSpaceEmpty && !isLoading) {
    return (
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/tasks')}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900 truncate">
                {pageTitle}
              </h1>
              {pageDescription && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{pageDescription}</p>
              )}
            </div>
          </div>
        </div>

        {/* Empty State with Create Options */}
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-xl font-medium text-gray-900 mb-2">Bu sahə boşdur</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Başlamaq üçün qovluq və ya siyahı yaradın. Qovluqlar siyahıları qruplaşdırmaq üçün istifadə olunur.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
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

        {/* Modals */}
        <TaskListFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          taskList={editingTaskList}
          spaceId={spaceId}
          createTaskList={createTaskList}
          updateTaskList={updateTaskList}
          isCreating={isCreating}
          isUpdating={isUpdating}
        />
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
      </div>
    )
  }

  // Space view (folders + lists combined)
  if (!folderId) {
    return (
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/tasks')}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900 truncate">
                {pageTitle}
              </h1>
              {pageDescription && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{pageDescription}</p>
              )}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleOpenFolderModal()}
                className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Qovluq</span>
              </button>
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

          {/* Filters Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 mb-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-3">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Axtar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Type Filter Buttons */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filterType === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Hamısı
                </button>
                <button
                  onClick={() => setFilterType('folders')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                    filterType === 'folders'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Qovluqlar
                </button>
                <button
                  onClick={() => setFilterType('lists')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                    filterType === 'lists'
                      ? 'bg-white text-green-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Siyahılar
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-gray-600">
              {filteredItems.length} element
              {(search || filterType !== 'all') && (
                <span className="text-blue-600 ml-1">(filtrlənmiş)</span>
              )}
            </p>
          </div>
        </div>

        {/* Items Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nəticə tapılmadı</h3>
            <p className="text-gray-500">Axtarış kriteriyalarını dəyişdirin</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              item.type === 'folder' ? (
                <div
                  key={`folder-${item.id}`}
                  onClick={() => navigate(`/tasks/space/${spaceId}/folder/${item.id}`)}
                  className="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenFolderModal(item)
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteFolder(item.id)
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1 truncate">{item.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{item.description || 'Açıqlama yoxdur'}</p>
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">Qovluq</span>
                  </div>
                </div>
              ) : (
                <div
                  key={`list-${item.id}`}
                  onClick={() => navigate(`/tasks/space/${spaceId}/list/${item.id}`)}
                  className="bg-white rounded-lg border border-gray-200 p-5 hover:border-green-300 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenModal(item)
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(item.id)
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">{item.name}</h3>
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <span>0 tapşırıq</span>
                    <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full">Siyahı</span>
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {/* Modals */}
        <TaskListFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          taskList={editingTaskList}
          spaceId={spaceId}
          createTaskList={createTaskList}
          updateTaskList={updateTaskList}
          isCreating={isCreating}
          isUpdating={isUpdating}
        />
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
      </div>
    )
  }

  // Folder view (only lists)
  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <button
            onClick={() => {
              if (folderId && spaceId) {
                navigate(`/tasks/space/${spaceId}`)
              } else {
                navigate('/tasks')
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900 truncate">
              {pageTitle}
            </h1>
            {pageDescription && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{pageDescription}</p>
            )}
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Yeni Siyahı</span>
            <span className="sm:hidden">Yeni</span>
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 mb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Siyahı axtar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-1 sm:flex-initial px-4 py-2 text-sm font-medium border rounded-md transition-colors flex items-center justify-center gap-2 ${
                  showFilters
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="hidden sm:inline">Filtr</span>
              </button>
              {(search || startDate || endDate) && (
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  title="Filterləri təmizlə"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Date Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-200">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Başlama tarixi
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Bitmə tarixi
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-600">
            {taskLists.length} tapşırıq siyahısı
            {(search || startDate || endDate) && (
              <span className="text-blue-600 ml-1">(filtrlənmiş)</span>
            )}
          </p>
        </div>
      </div>

      {/* Task Lists */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : taskLists.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tapşırıq siyahısı yoxdur</h3>
          <p className="text-gray-500 mb-4">İlk tapşırıq siyahınızı yaratmaqla başlayın</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Siyahı Yarat
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {taskLists.map((taskList) => (
            <div
              key={taskList.id}
              onClick={() => {
                if (folderId) {
                  navigate(`/tasks/space/${spaceId}/folder/${folderId}/list/${taskList.id}`)
                } else {
                  navigate(`/tasks/space/${spaceId}/list/${taskList.id}`)
                }
              }}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:border-green-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenModal(taskList)
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(taskList.id)
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">{taskList.name}</h3>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                <span>0 tapşırıq</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task List Form Modal */}
      <TaskListFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        taskList={editingTaskList}
        folderId={folderId}
        spaceId={spaceId}
        createTaskList={createTaskList}
        updateTaskList={updateTaskList}
        isCreating={isCreating}
        isUpdating={isUpdating}
      />
    </div>
  )
}

const TaskListFormModal = ({
  isOpen,
  onClose,
  taskList,
  folderId,
  spaceId,
  createTaskList,
  updateTaskList,
  isCreating,
  isUpdating,
}) => {
  const [formData, setFormData] = useState({
    name: '',
  })

  useEffect(() => {
    if (isOpen) {
      if (taskList) {
        setFormData({
          name: taskList.name || '',
        })
      } else {
        setFormData({
          name: '',
        })
      }
    }
  }, [taskList, isOpen])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (taskList) {
        // Update
        await updateTaskList({ id: taskList.id, ...formData }).unwrap()
        toast.success('Tapşırıq siyahısı yeniləndi!')
      } else {
        // Create
        const payload = { name: formData.name }
        if (folderId) {
          payload.folderId = parseInt(folderId)
        } else if (spaceId) {
          payload.spaceId = parseInt(spaceId)
        }
        await createTaskList(payload).unwrap()
        toast.success('Tapşırıq siyahısı yaradıldı!')
      }
      onClose()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={taskList ? 'Siyahını redaktə et' : 'Yeni siyahı'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Siyahı adı
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Məsələn: Sprint 1 Taskları"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Ləğv et
          </button>
          <button
            type="submit"
            disabled={isCreating || isUpdating}
            className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isCreating || isUpdating ? 'Yüklənir...' : taskList ? 'Yenilə' : 'Yarat'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

const FolderFormModal = ({
  isOpen,
  onClose,
  folder,
  spaceId,
  createFolder,
  updateFolder,
  isCreating,
  isUpdating,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    if (isOpen) {
      if (folder) {
        setFormData({
          name: folder.name || '',
          description: folder.description || '',
        })
      } else {
        setFormData({
          name: '',
          description: '',
        })
      }
    }
  }, [folder, isOpen])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (folder) {
        // Update
        await updateFolder({ id: folder.id, ...formData }).unwrap()
        toast.success('Qovluq yeniləndi!')
      } else {
        // Create
        await createFolder({ ...formData, spaceId: parseInt(spaceId) }).unwrap()
        toast.success('Qovluq yaradıldı!')
      }
      onClose()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={folder ? 'Qovluğu redaktə et' : 'Yeni qovluq'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Qovluq adı
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Məsələn: Marketing Layihəsi"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Açıqlama
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="Qovluq haqqında qısa açıqlama..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Ləğv et
          </button>
          <button
            type="submit"
            disabled={isCreating || isUpdating}
            className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isCreating || isUpdating ? 'Yüklənir...' : folder ? 'Yenilə' : 'Yarat'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default TaskLists
