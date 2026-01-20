import { NavLink, useNavigate, useLocation } from 'react-router'
import { toast } from 'react-toastify'
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  useGetMySpacesQuery,
  useCreateSpaceMutation,
  useUpdateSpaceMutation,
  useDeleteSpaceMutation,
  useReorderSpacesMutation,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
  useReorderFoldersMutation,
  useMoveFolderMutation,
  useCreateTaskListMutation,
  useUpdateTaskListMutation,
  useDeleteTaskListMutation,
  useReorderTaskListsMutation,
  useMoveTaskListMutation,
  useArchiveSpaceMutation,
  useArchiveFolderMutation,
  useArchiveListMutation,
  adminApi
} from '../services/adminApi'
import { useVerifyQuery, authApi } from '../services/authApi'
import { useDispatch } from 'react-redux'
import Modal from './Modal'
import { useConfirm } from '../context/ConfirmContext'
import { disconnectSocket } from '../hooks/useWebSocket'

// Path-dan list ID və folder ID-ni çıxarır
const getListIdFromPath = (pathname) => {
  const match = pathname.match(/\/list\/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

const getFolderIdFromPath = (pathname) => {
  const match = pathname.match(/\/folder\/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { confirm } = useConfirm()
  const [isTasksOpen, setIsTasksOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false)
  const [editingSpace, setEditingSpace] = useState(null)
  const [hoveredSpace, setHoveredSpace] = useState(null)
  const [expandedSpaces, setExpandedSpaces] = useState({})

  const { data: currentUser } = useVerifyQuery()
  const { data: spaces = [] } = useGetMySpacesQuery()
  const [createSpace, { isLoading: isCreatingSpace }] = useCreateSpaceMutation()
  const [updateSpace, { isLoading: isUpdatingSpace }] = useUpdateSpaceMutation()
  const [deleteSpace] = useDeleteSpaceMutation()
  const [reorderSpaces] = useReorderSpacesMutation()
  const [reorderFolders] = useReorderFoldersMutation()
  const [moveFolder] = useMoveFolderMutation()
  const [reorderTaskLists] = useReorderTaskListsMutation()
  const [moveTaskList] = useMoveTaskListMutation()

  const [draggedItem, setDraggedItem] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  // Drag start - item-i tutub başlayanda
  const handleDragStart = (e, type, item, parentInfo = null) => {
    e.stopPropagation()
    const dragData = { type, item, parentInfo }
    setDraggedItem(dragData)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData))
  }

  // Drag end - buraxanda və ya ləğv edəndə
  const handleDragEnd = () => {
    setDraggedItem(null)
    setDropTarget(null)
  }

  // Drag over - üzərindən keçəndə
  const handleDragOver = (e, type, item, parentInfo = null) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'

    // Drop target-i yalnız fərqli item üçün göstər
    if (!draggedItem) return
    if (draggedItem.type === type && draggedItem.item.id === item.id) return

    // Mouse pozisiyasına görə above/below təyin et
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height
    const position = y < height / 2 ? 'above' : 'below'

    setDropTarget({ type, item, parentInfo, position })
  }

  // Drag leave - sahəni tərk edəndə
  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Yalnız parent-ə çıxanda target-i sil
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget(null)
    }
  }

  // Drop - item-i buraxanda
  const handleDrop = async (e, targetType, targetItem, targetParentInfo = null) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedItem) return

    const { type: sourceType, item: sourceItem, parentInfo: sourceParentInfo } = draggedItem

    // Eyni item-in üzərinə drop etmə
    if (sourceType === targetType && sourceItem.id === targetItem.id) {
      handleDragEnd()
      return
    }

    try {
      // SPACE -> SPACE: Reorder spaces
      if (sourceType === 'space' && targetType === 'space') {
        const spaceIds = spaces.map(s => s.id)
        const fromIndex = spaceIds.indexOf(sourceItem.id)
        let toIndex = spaceIds.indexOf(targetItem.id)
        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
          spaceIds.splice(fromIndex, 1)
          // Position-a görə düzəlt
          if (fromIndex < toIndex) toIndex--
          if (dropTarget?.position === 'below') toIndex++
          spaceIds.splice(toIndex, 0, sourceItem.id)
          await reorderSpaces(spaceIds).unwrap()
        }
      }

      // FOLDER -> FOLDER: Reorder or move folders
      else if (sourceType === 'folder' && targetType === 'folder') {
        const sourceSpaceId = sourceParentInfo
        const targetSpaceId = targetParentInfo

        if (sourceSpaceId === targetSpaceId) {
          // Eyni space içində reorder
          const space = spaces.find(s => s.id === sourceSpaceId)
          if (space?.folders) {
            const folderIds = space.folders.map(f => f.id)
            const fromIndex = folderIds.indexOf(sourceItem.id)
            let toIndex = folderIds.indexOf(targetItem.id)
            if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
              folderIds.splice(fromIndex, 1)
              // Position-a görə düzəlt
              if (fromIndex < toIndex) toIndex--
              if (dropTarget?.position === 'below') toIndex++
              folderIds.splice(toIndex, 0, sourceItem.id)
              await reorderFolders({ spaceId: sourceSpaceId, folderIds }).unwrap()
            }
          }
        } else {
          // Başqa space-ə köçür
          await moveFolder({ id: sourceItem.id, targetSpaceId }).unwrap()
          toast.success('Qovluq köçürüldü!')
        }
      }

      // FOLDER -> SPACE: Move folder to different space
      else if (sourceType === 'folder' && targetType === 'space') {
        const sourceSpaceId = sourceParentInfo
        if (sourceSpaceId !== targetItem.id) {
          await moveFolder({ id: sourceItem.id, targetSpaceId: targetItem.id }).unwrap()
          toast.success('Qovluq köçürüldü!')
        }
      }

      // LIST -> LIST: Reorder or move lists
      else if (sourceType === 'list' && targetType === 'list') {
        const sourceFolderId = sourceParentInfo?.folderId
        const sourceSpaceId = sourceParentInfo?.spaceId
        const targetFolderId = targetParentInfo?.folderId
        const targetSpaceId = targetParentInfo?.spaceId

        // Eyni konteyner içindəmi?
        const isSameFolder = sourceFolderId && targetFolderId && sourceFolderId === targetFolderId
        const isSameSpace = !sourceFolderId && !targetFolderId && sourceSpaceId && targetSpaceId && sourceSpaceId === targetSpaceId

        if (isSameFolder || isSameSpace) {
          // Reorder
          let lists = []
          if (isSameFolder) {
            const space = spaces.find(s => s.folders?.some(f => f.id === sourceFolderId))
            const folder = space?.folders?.find(f => f.id === sourceFolderId)
            lists = folder?.taskLists || []
          } else {
            const space = spaces.find(s => s.id === sourceSpaceId)
            lists = space?.taskLists || []
          }

          const listIds = lists.map(l => l.id)
          const fromIndex = listIds.indexOf(sourceItem.id)
          let toIndex = listIds.indexOf(targetItem.id)

          if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
            listIds.splice(fromIndex, 1)
            // Position-a görə düzəlt
            if (fromIndex < toIndex) toIndex--
            if (dropTarget?.position === 'below') toIndex++
            listIds.splice(toIndex, 0, sourceItem.id)
            await reorderTaskLists(listIds).unwrap()
          }
        } else {
          // Fərqli konteynerə köçür
          await moveTaskList({
            id: sourceItem.id,
            targetFolderId: targetFolderId || null,
            targetSpaceId: targetFolderId ? null : targetSpaceId
          }).unwrap()
          toast.success('Siyahı köçürüldü!')
        }
      }

      // LIST -> FOLDER: Move list to folder
      else if (sourceType === 'list' && targetType === 'folder') {
        const sourceFolderId = sourceParentInfo?.folderId
        if (sourceFolderId !== targetItem.id) {
          await moveTaskList({
            id: sourceItem.id,
            targetFolderId: targetItem.id,
            targetSpaceId: null
          }).unwrap()
          toast.success('Siyahı köçürüldü!')
        }
      }

      // LIST -> SPACE: Move list directly to space
      else if (sourceType === 'list' && targetType === 'space') {
        const sourceSpaceId = sourceParentInfo?.spaceId
        const sourceFolderId = sourceParentInfo?.folderId
        // Yalnız fərqli yerə köçürəndə
        if (sourceFolderId || sourceSpaceId !== targetItem.id) {
          await moveTaskList({
            id: sourceItem.id,
            targetFolderId: null,
            targetSpaceId: targetItem.id
          }).unwrap()
          toast.success('Siyahı köçürüldü!')
        }
      }
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }

    handleDragEnd()
  }

  // Drop target olub-olmadığını yoxla
  const isDropTarget = (type, itemId) => {
    return dropTarget?.type === type && dropTarget?.item?.id === itemId
  }

  // Drop indicator class-ını al
  const getDropIndicatorClass = (type, itemId) => {
    if (dropTarget?.type !== type || dropTarget?.item?.id !== itemId) return ''
    return dropTarget.position === 'above'
      ? 'border-t-2 border-t-blue-500'
      : 'border-b-2 border-b-blue-500'
  }

  // Login olduqda bütün space-ləri açıq şəkildə göstər
  useEffect(() => {
    if (spaces.length > 0) {
      const allExpanded = {}
      spaces.forEach(space => {
        allExpanded[space.id] = true
      })
      setExpandedSpaces(allExpanded)
      setIsTasksOpen(true)
    }
  }, [spaces])

  const userRole = useMemo(() => {
    const role = currentUser?.role?.role || currentUser?.role || 'user'
    return typeof role === 'string' ? role.toLowerCase() : 'user'
  }, [currentUser])

  const filteredSpaces = useMemo(() => {
    if (!searchQuery.trim()) return spaces

    const query = searchQuery.toLowerCase()

    return spaces.map(space => {
      const spaceMatches = space.name.toLowerCase().includes(query)

      // Folder-ləri və onların task list-lərini filtr et
      const filteredFolders = (space.folders || []).map(folder => {
        const folderMatches = folder.name.toLowerCase().includes(query)

        // Task list-ləri filtr et
        const filteredTaskLists = (folder.taskLists || []).filter(list =>
          list.name.toLowerCase().includes(query)
        )

        // Folder özü və ya içindəki list uyğun gəlirsə göstər
        if (folderMatches || filteredTaskLists.length > 0) {
          return {
            ...folder,
            taskLists: folderMatches ? folder.taskLists : filteredTaskLists
          }
        }
        return null
      }).filter(Boolean)

      // Birbaşa space-ə bağlı task list-ləri filtr et
      const filteredDirectLists = (space.taskLists || []).filter(list =>
        list.name.toLowerCase().includes(query)
      )

      // Space özü, folder-lər və ya task list-lər uyğun gəlirsə göstər
      if (spaceMatches || filteredFolders.length > 0 || filteredDirectLists.length > 0) {
        return {
          ...space,
          folders: spaceMatches ? space.folders : filteredFolders,
          taskLists: spaceMatches ? space.taskLists : filteredDirectLists
        }
      }
      return null
    }).filter(Boolean)
  }, [spaces, searchQuery])

  const toggleSpace = useCallback((spaceId, e) => {
    e?.stopPropagation()
    setExpandedSpaces(prev => ({
      ...prev,
      [spaceId]: !prev[spaceId]
    }))
  }, [])

  const expandSpace = useCallback((spaceId) => {
    setExpandedSpaces(prev => ({
      ...prev,
      [spaceId]: true
    }))
  }, [])

  const handleOpenSpaceModal = (space = null) => {
    setEditingSpace(space)
    setIsSpaceModalOpen(true)
  }

  const handleCloseSpaceModal = () => {
    setEditingSpace(null)
    setIsSpaceModalOpen(false)
  }

  const handleDeleteSpace = async (e, id) => {
    e.stopPropagation()
    const confirmed = await confirm({
      title: 'Sahəni sil',
      message: 'Bu sahəni silmək istədiyinizdən əminsiniz?',
      confirmText: 'Sil',
      cancelText: 'Ləğv et',
      type: 'danger'
    })

    if (confirmed) {
      try {
        await deleteSpace(id).unwrap()
        toast.success('Sahə silindi!')
        if (location.pathname.includes(`/space/${id}`)) {
          navigate('/')
        }
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  const handleLogout = () => {
    // Disconnect WebSocket before logout
    disconnectSocket()
    localStorage.removeItem('token')
    // RTK Query cache-ni təmizlə
    dispatch(adminApi.util.resetApiState())
    dispatch(authApi.util.resetApiState())
    toast.success('Çıxış edildi!')
    onClose() // Close sidebar before navigation
    navigate('/login')
  }

  const allNavItems = [
    {
      path: '/users',
      label: 'İstifadəçilər',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      adminOnly: true,
    },
    {
      path: '/statuses',
      label: 'Statuslar',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      adminOnly: true,
    },
    {
      path: '/settings',
      label: 'Tənzimləmələr',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      adminOnly: true,
    },
    {
      path: '/trash',
      label: 'Zibil qabı',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
    },
    {
      path: '/archive',
      label: 'Arxiv',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
    },
    {
      path: '/activity-logs',
      label: 'Əməliyyat tarixçəsi',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  // Filter nav items based on user role
  const navItems = useMemo(() => {
    const isAdmin = userRole === 'admin'
    return allNavItems.filter(item => !item.adminOnly || isAdmin)
  }, [userRole])

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-20 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-blue-50 border-r border-blue-100 h-screen flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo/Header */}
        <div className="h-16 flex items-center px-6 border-b border-blue-100">
          <h2 className="text-lg font-semibold text-blue-900">Task Manager</h2>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="ml-auto md:hidden text-blue-900 hover:text-blue-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-900 hover:bg-blue-100'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}

          {/* Tasks Dropdown */}
          <li>
            <button
              onClick={() => setIsTasksOpen(!isTasksOpen)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname.startsWith('/tasks')
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-900 hover:bg-blue-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="flex-1 text-left">Tapşırıqlar</span>
              <svg
                className={`w-4 h-4 transition-transform ${isTasksOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Spaces List */}
            {isTasksOpen && (
              <div className="mt-2 ml-3 space-y-2">
                {/* Search Input with Add Button */}
                <div className="px-2 flex gap-1">
                  <input
                    type="text"
                    placeholder="Sahə axtar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-xs border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                  <button
                    onClick={() => handleOpenSpaceModal()}
                    className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    title="Yeni sahə"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* Spaces */}
                <ul className="space-y-1">
                  {filteredSpaces.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-gray-500">
                      {searchQuery ? 'Nəticə tapılmadı' : 'Sahə yoxdur'}
                    </li>
                  ) : (
                    filteredSpaces.map((space) => (
                      <SpaceItem
                        key={space.id}
                        space={space}
                        spaces={spaces}
                        isExpanded={expandedSpaces[space.id]}
                        onToggle={toggleSpace}
                        onExpand={expandSpace}
                        isHovered={hoveredSpace === space.id}
                        onHover={setHoveredSpace}
                        onDelete={handleDeleteSpace}
                        onNavigate={(path) => {
                          navigate(path)
                          onClose()
                        }}
                        location={location}
                        onUpdateSpace={updateSpace}
                        draggedItem={draggedItem}
                        dropTarget={dropTarget}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDragEnd={handleDragEnd}
                        onDrop={handleDrop}
                        isDropTarget={isDropTarget}
                        getDropIndicatorClass={getDropIndicatorClass}
                      />
                    ))
                  )}
                </ul>
              </div>
            )}
          </li>
        </ul>
      </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-blue-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-blue-900 hover:bg-blue-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Çıxış</span>
          </button>
        </div>
      </div>

      {/* Space Form Modal */}
      <SpaceFormModal
        isOpen={isSpaceModalOpen}
        onClose={handleCloseSpaceModal}
        space={editingSpace}
        createSpace={createSpace}
        updateSpace={updateSpace}
        isCreating={isCreatingSpace}
        isUpdating={isUpdatingSpace}
        onSpaceCreated={expandSpace}
        onNavigate={(path) => {
          navigate(path)
          onClose()
        }}
      />
    </>
  )
}

const SpaceItem = ({
  space,
  spaces,
  isExpanded,
  onToggle,
  onExpand,
  isHovered,
  onHover,
  onDelete,
  onNavigate,
  location,
  onUpdateSpace,
  draggedItem,
  dropTarget,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
  isDropTarget,
  getDropIndicatorClass,
}) => {
  const folders = space.folders || []
  const directLists = space.taskLists || []

  const [createFolder, { isLoading: isCreatingFolder }] = useCreateFolderMutation()
  const [updateFolder, { isLoading: isUpdatingFolder }] = useUpdateFolderMutation()
  const [deleteFolder] = useDeleteFolderMutation()
  const [createTaskList, { isLoading: isCreatingList }] = useCreateTaskListMutation()
  const [updateTaskList, { isLoading: isUpdatingList }] = useUpdateTaskListMutation()
  const [deleteTaskList] = useDeleteTaskListMutation()
  const [archiveSpace] = useArchiveSpaceMutation()
  const [archiveFolder] = useArchiveFolderMutation()
  const [archiveList] = useArchiveListMutation()

  // Inline edit states
  const [isEditingSpace, setIsEditingSpace] = useState(false)
  const [editSpaceName, setEditSpaceName] = useState(space.name)
  const spaceInputRef = useRef(null)

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState(null)
  const [isDirectListModalOpen, setIsDirectListModalOpen] = useState(false)
  const [editingList, setEditingList] = useState(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState(() => {
    // Başlanğıcda bütün folder-ləri açıq göstər
    const initial = {}
    folders.forEach(folder => {
      initial[folder.id] = true
    })
    return initial
  })

  // Yeni folder əlavə olunduqda avtomatik aç
  useEffect(() => {
    setExpandedFolders(prev => {
      const updated = { ...prev }
      let hasChanges = false
      folders.forEach(folder => {
        if (updated[folder.id] === undefined) {
          updated[folder.id] = true
          hasChanges = true
        }
      })
      return hasChanges ? updated : prev
    })
  }, [folders])
  const [hoveredFolder, setHoveredFolder] = useState(null)
  const [hoveredList, setHoveredList] = useState(null)

  // List inline edit states
  const [editingListId, setEditingListId] = useState(null)
  const [editListName, setEditListName] = useState('')
  const listInputRef = useRef(null)

  // Space assignee modal state
  const [isSpaceAssigneeModalOpen, setIsSpaceAssigneeModalOpen] = useState(false)

  // List assignee modal state (for direct space lists)
  const [assigneeListId, setAssigneeListId] = useState(null)

  const isActive = location.pathname.startsWith(`/tasks/space/${space.id}`)

  // Space inline edit
  useEffect(() => {
    if (isEditingSpace && spaceInputRef.current) {
      spaceInputRef.current.focus()
      spaceInputRef.current.select()
    }
  }, [isEditingSpace])

  const handleSpaceNameClick = (e) => {
    e.stopPropagation()
    setIsEditingSpace(true)
    setEditSpaceName(space.name)
  }

  const handleSpaceNameSave = async () => {
    if (editSpaceName.trim() && editSpaceName !== space.name) {
      try {
        await onUpdateSpace({ id: space.id, name: editSpaceName.trim() }).unwrap()
        toast.success('Sahə adı yeniləndi!')
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
        setEditSpaceName(space.name)
      }
    }
    setIsEditingSpace(false)
  }

  const handleSpaceNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSpaceNameSave()
    } else if (e.key === 'Escape') {
      setEditSpaceName(space.name)
      setIsEditingSpace(false)
    }
  }

  // List inline edit
  useEffect(() => {
    if (editingListId && listInputRef.current) {
      listInputRef.current.focus()
      listInputRef.current.select()
    }
  }, [editingListId])

  const handleListNameClick = (e, list) => {
    e.stopPropagation()
    setEditingListId(list.id)
    setEditListName(list.name)
  }

  const handleListNameSave = async (listId) => {
    if (editListName.trim() && editListName !== directLists.find(l => l.id === listId)?.name) {
      try {
        await updateTaskList({ id: listId, name: editListName.trim() }).unwrap()
        toast.success('Siyahı adı yeniləndi!')
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
    setEditingListId(null)
  }

  const handleListNameKeyDown = (e, listId) => {
    if (e.key === 'Enter') {
      handleListNameSave(listId)
    } else if (e.key === 'Escape') {
      setEditingListId(null)
    }
  }

  const toggleFolder = (folderId, e) => {
    e?.stopPropagation()
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }))
  }

  const handleOpenFolderModal = (folder = null) => {
    setEditingFolder(folder)
    setIsFolderModalOpen(true)
  }

  const handleCloseFolderModal = () => {
    setEditingFolder(null)
    setIsFolderModalOpen(false)
  }

  const handleDeleteFolder = async (e, id) => {
    e.stopPropagation()
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
        if (location.pathname.includes(`/folder/${id}`)) {
          onNavigate(`/tasks/space/${space.id}`)
        }
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  const handleOpenListModal = (list = null) => {
    setEditingList(list)
    setIsDirectListModalOpen(true)
  }

  const handleCloseListModal = () => {
    setEditingList(null)
    setIsDirectListModalOpen(false)
  }

  const handleDeleteList = async (e, id, folderId = null) => {
    e.stopPropagation()
    const confirmed = await confirm({
      title: 'Siyahını sil',
      message: 'Bu siyahını silmək istədiyinizdən əminsiniz?',
      confirmText: 'Sil',
      cancelText: 'Ləğv et',
      type: 'danger'
    })

    if (confirmed) {
      try {
        await deleteTaskList(id).unwrap()
        toast.success('Siyahı silindi!')
        if (location.pathname.includes(`/list/${id}`)) {
          if (folderId) {
            onNavigate(`/tasks/space/${space.id}/folder/${folderId}`)
          } else {
            onNavigate(`/tasks/space/${space.id}`)
          }
        }
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  const handleArchiveSpace = async (e) => {
    e.stopPropagation()
    try {
      await archiveSpace(space.id).unwrap()
      toast.success('Sahə arxivləndi!')
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const handleArchiveFolder = async (e, id) => {
    e.stopPropagation()
    try {
      await archiveFolder(id).unwrap()
      toast.success('Qovluq arxivləndi!')
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const handleArchiveList = async (e, id) => {
    e.stopPropagation()
    try {
      await archiveList(id).unwrap()
      toast.success('Siyahı arxivləndi!')
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const isDragging = draggedItem?.type === 'space' && draggedItem?.item?.id === space.id
  const canDropHere = draggedItem && (draggedItem.type === 'space' || draggedItem.type === 'folder' || draggedItem.type === 'list')
  const isCurrentDropTarget = isDropTarget('space', space.id)

  return (
    <li
      onMouseEnter={() => onHover(space.id)}
      onMouseLeave={() => onHover(null)}
      className={isDragging ? 'opacity-50' : ''}
    >
      <div
        draggable
        onDragStart={(e) => onDragStart(e, 'space', space, null)}
        onDragOver={(e) => canDropHere && onDragOver(e, 'space', space, null)}
        onDragLeave={onDragLeave}
        onDragEnd={onDragEnd}
        onDrop={(e) => canDropHere && onDrop(e, 'space', space, null)}
        onClick={() => {
          if (!isEditingSpace) {
            onExpand(space.id)
            onNavigate(`/tasks/space/${space.id}`)
          }
        }}
        className={`group flex items-center gap-1 px-2 py-2 rounded-md text-sm transition-colors cursor-pointer ${
          isActive
            ? 'bg-blue-200 text-blue-900 font-medium'
            : 'text-blue-800 hover:bg-blue-100'
        } ${isCurrentDropTarget && !isDragging ? getDropIndicatorClass('space', space.id) : ''}`}
      >
        {/* Ox buttonu */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(space.id, e) }}
          className="p-0.5 hover:bg-blue-300 rounded transition-all duration-200"
          title={isExpanded ? 'Bağla' : 'Aç'}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Space adı */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <svg
            className="w-4 h-4 shrink-0 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          {isEditingSpace ? (
            <input
              ref={spaceInputRef}
              type="text"
              value={editSpaceName}
              onChange={(e) => setEditSpaceName(e.target.value)}
              onBlur={handleSpaceNameSave}
              onKeyDown={handleSpaceNameKeyDown}
              className="flex-1 min-w-0 px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate">
              {space.name}
            </span>
          )}
        </div>

        {isHovered && !isEditingSpace && (
          <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleSpaceNameClick}
              className="p-1 hover:bg-blue-100 hover:text-blue-600 rounded transition-colors"
              title="Adı dəyiş"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => setIsSpaceAssigneeModalOpen(true)}
              className="p-1 hover:bg-blue-100 hover:text-blue-600 rounded transition-colors"
              title="İstifadəçiləri idarə et"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Space içəriyi: Folder-lər və birbaşa list-lər */}
      {isExpanded && (
        <ul className="ml-4 mt-1 space-y-0.5 border-l-2 border-purple-200 pl-3">
              {/* Folder-lər */}
              {folders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  spaceId={space.id}
                  isExpanded={expandedFolders[folder.id]}
                  onToggle={toggleFolder}
                  isHovered={hoveredFolder === folder.id}
                  onHover={setHoveredFolder}
                  onDelete={handleDeleteFolder}
                  onArchive={handleArchiveFolder}
                  onNavigate={onNavigate}
                  location={location}
                  onUpdateFolder={updateFolder}
                  draggedItem={draggedItem}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDragEnd={onDragEnd}
                  onDrop={onDrop}
                  isDropTarget={isDropTarget}
                  getDropIndicatorClass={getDropIndicatorClass}
                />
              ))}

              {/* Birbaşa Space-ə bağlı list-lər */}
              {directLists.map((list) => {
                const isListDragging = draggedItem?.type === 'list' && draggedItem?.item?.id === list.id
                const canDropList = draggedItem?.type === 'list'
                const isListCurrentDropTarget = isDropTarget('list', list.id)
                return (
                <li
                  key={list.id}
                  onMouseEnter={() => setHoveredList(list.id)}
                  onMouseLeave={() => setHoveredList(null)}
                  className={`group ${isListDragging ? 'opacity-50' : ''}`}
                >
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, 'list', list, { spaceId: space.id, folderId: null })}
                    onDragOver={(e) => canDropList && onDragOver(e, 'list', list, { spaceId: space.id, folderId: null })}
                    onDragLeave={onDragLeave}
                    onDragEnd={onDragEnd}
                    onDrop={(e) => canDropList && onDrop(e, 'list', list, { spaceId: space.id, folderId: null })}
                    onClick={() => editingListId !== list.id && onNavigate(`/tasks/space/${space.id}/list/${list.id}`)}
                    className={`flex items-center gap-1 px-2 py-2 rounded text-sm transition-colors cursor-pointer ${
                      getListIdFromPath(location.pathname) === list.id && getFolderIdFromPath(location.pathname) === null
                        ? 'bg-blue-100 text-blue-800 font-medium'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    } ${isListCurrentDropTarget && !isListDragging ? getDropIndicatorClass('list', list.id) : ''}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <svg
                        className="w-4 h-4 shrink-0 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {editingListId === list.id ? (
                        <input
                          ref={listInputRef}
                          type="text"
                          value={editListName}
                          onChange={(e) => setEditListName(e.target.value)}
                          onBlur={() => handleListNameSave(list.id)}
                          onKeyDown={(e) => handleListNameKeyDown(e, list.id)}
                          className="flex-1 min-w-0 px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="truncate">
                          {list.name}
                        </span>
                      )}
                    </div>
                    {hoveredList === list.id && editingListId !== list.id && (
                      <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleListNameClick(e, list)}
                          className="p-1 hover:bg-blue-100 hover:text-blue-600 rounded transition-colors"
                          title="Adı dəyiş"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setAssigneeListId(list.id)}
                          className="p-1 hover:bg-blue-100 hover:text-blue-600 rounded transition-colors"
                          title="İstifadəçiləri idarə et"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  {/* List Assignee Modal */}
                  <AssigneeModal
                    isOpen={assigneeListId === list.id}
                    onClose={() => setAssigneeListId(null)}
                    entity={list}
                    entityType="list"
                    onUpdate={updateTaskList}
                  />
                </li>
              )})}

              {/* Əlavə et menu */}
              <li className="relative">
                <button
                  onClick={() => setAddMenuOpen(!addMenuOpen)}
                  className="w-full text-left px-2 py-1.5 rounded text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2 mt-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Əlavə et</span>
                </button>
                {addMenuOpen && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
                    <button
                      onClick={() => { handleOpenFolderModal(); setAddMenuOpen(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      Qovluq
                    </button>
                    <button
                      onClick={() => { setIsDirectListModalOpen(true); setAddMenuOpen(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Siyahı
                    </button>
                  </div>
                )}
              </li>
        </ul>
      )}

      {/* Folder Form Modal */}
      <FolderFormModal
        isOpen={isFolderModalOpen}
        onClose={handleCloseFolderModal}
        folder={editingFolder}
        spaceId={space.id}
        createFolder={createFolder}
        updateFolder={updateFolder}
        isCreating={isCreatingFolder}
        isUpdating={isUpdatingFolder}
        onNavigate={onNavigate}
      />

      {/* Direct List Form Modal */}
      <TaskListFormModal
        isOpen={isDirectListModalOpen}
        onClose={handleCloseListModal}
        spaceId={space.id}
        list={editingList}
        createTaskList={createTaskList}
        updateTaskList={updateTaskList}
        isCreating={isCreatingList}
        isUpdating={isUpdatingList}
        onListCreated={(listId) => onNavigate(`/tasks/space/${space.id}/list/${listId}`)}
      />

      {/* Space Assignee Modal */}
      <AssigneeModal
        isOpen={isSpaceAssigneeModalOpen}
        onClose={() => setIsSpaceAssigneeModalOpen(false)}
        entity={space}
        entityType="space"
        onUpdate={onUpdateSpace}
      />
    </li>
  )
}

const FolderItem = ({
  folder,
  spaceId,
  isExpanded,
  onToggle,
  isHovered,
  onHover,
  onDelete,
  onArchive,
  onNavigate,
  location,
  onUpdateFolder,
  draggedItem,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
  isDropTarget,
  getDropIndicatorClass,
}) => {
  const taskLists = folder.taskLists || []

  const [createTaskList, { isLoading: isCreatingList }] = useCreateTaskListMutation()
  const [updateTaskList, { isLoading: isUpdatingList }] = useUpdateTaskListMutation()
  const [deleteTaskList] = useDeleteTaskListMutation()
  const [archiveList] = useArchiveListMutation()

  const [isListModalOpen, setIsListModalOpen] = useState(false)
  const [editingList, setEditingList] = useState(null)
  const [hoveredList, setHoveredList] = useState(null)

  // Inline edit states
  const [isEditingFolder, setIsEditingFolder] = useState(false)
  const [editFolderName, setEditFolderName] = useState(folder.name)
  const folderInputRef = useRef(null)

  // List inline edit states
  const [editingListId, setEditingListId] = useState(null)
  const [editListName, setEditListName] = useState('')
  const listInputRef = useRef(null)

  // Folder assignee modal state
  const [isFolderAssigneeModalOpen, setIsFolderAssigneeModalOpen] = useState(false)

  // List assignee modal state (for folder lists)
  const [assigneeListId, setAssigneeListId] = useState(null)

  const isActive = location.pathname.includes(`/folder/${folder.id}`)

  // Folder inline edit
  useEffect(() => {
    if (isEditingFolder && folderInputRef.current) {
      folderInputRef.current.focus()
      folderInputRef.current.select()
    }
  }, [isEditingFolder])

  // List inline edit
  useEffect(() => {
    if (editingListId && listInputRef.current) {
      listInputRef.current.focus()
      listInputRef.current.select()
    }
  }, [editingListId])

  const handleFolderNameClick = (e) => {
    e.stopPropagation()
    setIsEditingFolder(true)
    setEditFolderName(folder.name)
  }

  const handleFolderNameSave = async () => {
    if (editFolderName.trim() && editFolderName !== folder.name) {
      try {
        await onUpdateFolder({ id: folder.id, name: editFolderName.trim() }).unwrap()
        toast.success('Qovluq adı yeniləndi!')
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
        setEditFolderName(folder.name)
      }
    }
    setIsEditingFolder(false)
  }

  const handleFolderNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleFolderNameSave()
    } else if (e.key === 'Escape') {
      setEditFolderName(folder.name)
      setIsEditingFolder(false)
    }
  }

  // List inline edit functions
  const handleListNameClick = (e, list) => {
    e.stopPropagation()
    setEditingListId(list.id)
    setEditListName(list.name)
  }

  const handleListNameSave = async (listId) => {
    if (editListName.trim() && editListName !== taskLists.find(l => l.id === listId)?.name) {
      try {
        await updateTaskList({ id: listId, name: editListName.trim() }).unwrap()
        toast.success('Siyahı adı yeniləndi!')
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
    setEditingListId(null)
  }

  const handleListNameKeyDown = (e, listId) => {
    if (e.key === 'Enter') {
      handleListNameSave(listId)
    } else if (e.key === 'Escape') {
      setEditingListId(null)
    }
  }

  const handleOpenListModal = (list = null) => {
    setEditingList(list)
    setIsListModalOpen(true)
  }

  const handleCloseListModal = () => {
    setEditingList(null)
    setIsListModalOpen(false)
  }

  const handleDeleteList = async (e, id) => {
    e.stopPropagation()
    const confirmed = await confirm({
      title: 'Siyahını sil',
      message: 'Bu siyahını silmək istədiyinizdən əminsiniz?',
      confirmText: 'Sil',
      cancelText: 'Ləğv et',
      type: 'danger'
    })

    if (confirmed) {
      try {
        await deleteTaskList(id).unwrap()
        toast.success('Siyahı silindi!')
        if (location.pathname.includes(`/list/${id}`)) {
          onNavigate(`/tasks/space/${spaceId}/folder/${folder.id}`)
        }
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  const handleArchiveList = async (e, id) => {
    e.stopPropagation()
    try {
      await archiveList(id).unwrap()
      toast.success('Siyahı arxivləndi!')
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const isFolderDragging = draggedItem?.type === 'folder' && draggedItem?.item?.id === folder.id
  const canDropHere = draggedItem && (draggedItem.type === 'folder' || draggedItem.type === 'list')
  const isFolderCurrentDropTarget = isDropTarget('folder', folder.id)

  return (
    <li
      onMouseEnter={() => onHover(folder.id)}
      onMouseLeave={() => onHover(null)}
      className={isFolderDragging ? 'opacity-50' : ''}
    >
      <div
        draggable
        onDragStart={(e) => onDragStart(e, 'folder', folder, spaceId)}
        onDragOver={(e) => canDropHere && onDragOver(e, 'folder', folder, spaceId)}
        onDragLeave={onDragLeave}
        onDragEnd={onDragEnd}
        onDrop={(e) => canDropHere && onDrop(e, 'folder', folder, spaceId)}
        onClick={() => !isEditingFolder && onNavigate(`/tasks/space/${spaceId}/folder/${folder.id}`)}
        className={`group flex items-center gap-1.5 px-2 py-2 rounded-md text-sm transition-colors cursor-pointer ${
          isActive
            ? 'bg-blue-100 text-blue-900 font-medium'
            : 'text-blue-800 hover:bg-blue-50'
        } ${isFolderCurrentDropTarget && !isFolderDragging ? getDropIndicatorClass('folder', folder.id) : ''}`}
      >
        {/* Ox buttonu */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(folder.id, e) }}
          className="p-0.5 hover:bg-blue-200 rounded transition-all duration-200"
          title={isExpanded ? 'Bağla' : 'Aç'}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Folder adı */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <svg
            className="w-4 h-4 shrink-0 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          {isEditingFolder ? (
            <input
              ref={folderInputRef}
              type="text"
              value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
              onBlur={handleFolderNameSave}
              onKeyDown={handleFolderNameKeyDown}
              className="flex-1 min-w-0 px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate">
              {folder.name}
            </span>
          )}
        </div>

        {isHovered && !isEditingFolder && (
          <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleFolderNameClick}
              className="p-1 hover:bg-blue-100 hover:text-blue-600 rounded transition-colors"
              title="Adı dəyiş"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => setIsFolderAssigneeModalOpen(true)}
              className="p-1 hover:bg-blue-100 hover:text-blue-600 rounded transition-colors"
              title="İstifadəçiləri idarə et"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Task listləri */}
      {isExpanded && (
        <ul className="ml-3 mt-1 space-y-0.5 border-l-2 border-blue-100 pl-3">
          {taskLists.length === 0 ? (
            <li>
              <button
                onClick={() => setIsListModalOpen(true)}
                className="w-full text-left px-2 py-1.5 rounded text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Siyahı əlavə et</span>
              </button>
            </li>
          ) : (
            <>
              {taskLists.map((list) => {
                const isListDragging = draggedItem?.type === 'list' && draggedItem?.item?.id === list.id
                const canDropList = draggedItem?.type === 'list'
                const isListCurrentDropTarget = isDropTarget('list', list.id)
                return (
                <li
                  key={list.id}
                  onMouseEnter={() => setHoveredList(list.id)}
                  onMouseLeave={() => setHoveredList(null)}
                  className={`group ${isListDragging ? 'opacity-50' : ''}`}
                >
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, 'list', list, { folderId: folder.id, spaceId: null })}
                    onDragOver={(e) => canDropList && onDragOver(e, 'list', list, { folderId: folder.id, spaceId: null })}
                    onDragLeave={onDragLeave}
                    onDragEnd={onDragEnd}
                    onDrop={(e) => canDropList && onDrop(e, 'list', list, { folderId: folder.id, spaceId: null })}
                    onClick={() => editingListId !== list.id && onNavigate(`/tasks/space/${spaceId}/folder/${folder.id}/list/${list.id}`)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded text-sm transition-colors cursor-pointer ${
                      getListIdFromPath(location.pathname) === list.id && getFolderIdFromPath(location.pathname) === folder.id
                        ? 'bg-blue-100 text-blue-800 font-medium'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    } ${isListCurrentDropTarget && !isListDragging ? getDropIndicatorClass('list', list.id) : ''}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <svg
                        className="w-4 h-4 shrink-0 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {editingListId === list.id ? (
                        <input
                          ref={listInputRef}
                          type="text"
                          value={editListName}
                          onChange={(e) => setEditListName(e.target.value)}
                          onBlur={() => handleListNameSave(list.id)}
                          onKeyDown={(e) => handleListNameKeyDown(e, list.id)}
                          className="flex-1 min-w-0 px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="truncate">
                          {list.name}
                        </span>
                      )}
                    </div>
                    {hoveredList === list.id && editingListId !== list.id && (
                      <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleListNameClick(e, list)}
                          className="p-1 hover:bg-blue-100 hover:text-blue-600 rounded transition-colors"
                          title="Adı dəyiş"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setAssigneeListId(list.id)}
                          className="p-1 hover:bg-blue-100 hover:text-blue-600 rounded transition-colors"
                          title="İstifadəçiləri idarə et"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  {/* List Assignee Modal */}
                  <AssigneeModal
                    isOpen={assigneeListId === list.id}
                    onClose={() => setAssigneeListId(null)}
                    entity={list}
                    entityType="list"
                    onUpdate={updateTaskList}
                  />
                </li>
              )})}
              <li>
                <button
                  onClick={() => handleOpenListModal()}
                  className="w-full text-left px-2 py-1 rounded text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Siyahı əlavə et</span>
                </button>
              </li>
            </>
          )}
        </ul>
      )}

      <TaskListFormModal
        isOpen={isListModalOpen}
        onClose={handleCloseListModal}
        folderId={folder.id}
        list={editingList}
        createTaskList={createTaskList}
        updateTaskList={updateTaskList}
        isCreating={isCreatingList}
        isUpdating={isUpdatingList}
        onListCreated={(listId) => onNavigate(`/tasks/space/${spaceId}/folder/${folder.id}/list/${listId}`)}
      />

      {/* Folder Assignee Modal */}
      <AssigneeModal
        isOpen={isFolderAssigneeModalOpen}
        onClose={() => setIsFolderAssigneeModalOpen(false)}
        entity={folder}
        entityType="folder"
        onUpdate={onUpdateFolder}
      />
    </li>
  )
}

const TaskListFormModal = ({
  isOpen,
  onClose,
  folderId,
  spaceId,
  list,
  createTaskList,
  updateTaskList,
  isCreating,
  isUpdating,
  onListCreated,
}) => {
  const { data: users = [] } = adminApi.useGetUsersQuery()
  const [name, setName] = useState('')
  const [selectedAssignees, setSelectedAssignees] = useState([])
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (list) {
        setName(list.name || '')
        setSelectedAssignees(list.assignees?.map(a => a.id) || [])
      } else {
        setName('')
        setSelectedAssignees([])
      }
    }
  }, [isOpen, list])

  const toggleAssignee = (userId) => {
    setSelectedAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      if (list) {
        await updateTaskList({ id: list.id, name: name.trim(), assigneeIds: selectedAssignees }).unwrap()
        toast.success('Siyahı yeniləndi!')
        onClose()
      } else {
        const payload = { name: name.trim(), assigneeIds: selectedAssignees }
        if (folderId) {
          payload.folderId = folderId
        } else if (spaceId) {
          payload.spaceId = spaceId
        }
        const newList = await createTaskList(payload).unwrap()
        toast.success('Siyahı yaradıldı!')
        onClose()
        if (onListCreated && newList?.id) {
          onListCreated(newList.id)
        }
      }
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={list ? 'Siyahını redaktə et' : 'Yeni siyahı'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Siyahı adı
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder="Məsələn: Ediləcəklər"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            İstifadəçilər
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
              className="w-full px-3 py-2 text-sm text-left border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {selectedAssignees.length > 0
                ? `${selectedAssignees.length} istifadəçi seçildi`
                : 'İstifadəçi seçin...'}
            </button>
            {showAssigneeDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {users.map(user => (
                  <label
                    key={user.id}
                    className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssignees.includes(user.id)}
                      onChange={() => toggleAssignee(user.id)}
                      className="mr-2"
                    />
                    <span className="text-sm">{user.name || user.email}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {selectedAssignees.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedAssignees.map(userId => {
                const user = users.find(u => u.id === userId)
                return user ? (
                  <span
                    key={userId}
                    className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    {user.name || user.email}
                    <button
                      type="button"
                      onClick={() => toggleAssignee(userId)}
                      className="ml-1 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ) : null
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Ləğv et
          </button>
          <button
            type="submit"
            disabled={isCreating || isUpdating || !name.trim()}
            className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isCreating || isUpdating ? 'Yüklənir...' : list ? 'Yenilə' : 'Yarat'}
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
  onNavigate,
}) => {
  const { data: users = [] } = adminApi.useGetUsersQuery()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [selectedAssignees, setSelectedAssignees] = useState([])
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (folder) {
        setFormData({
          name: folder.name || '',
          description: folder.description || '',
        })
        setSelectedAssignees(folder.assignees?.map(a => a.id) || [])
      } else {
        setFormData({
          name: '',
          description: '',
        })
        setSelectedAssignees([])
      }
    }
  }, [folder, isOpen])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const toggleAssignee = (userId) => {
    setSelectedAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (folder) {
        // Update
        await updateFolder({ id: folder.id, ...formData, assigneeIds: selectedAssignees }).unwrap()
        toast.success('Qovluq yeniləndi!')
      } else {
        // Create - navigate to default list after creation
        const newFolder = await createFolder({ ...formData, spaceId, assigneeIds: selectedAssignees }).unwrap()
        console.log('New folder created:', newFolder)
        toast.success('Qovluq yaradıldı!')

        // Navigate to default list if available
        if (onNavigate && newFolder?.defaultListId) {
          const url = `/tasks/space/${spaceId}/folder/${newFolder.id}/list/${newFolder.defaultListId}`
          console.log('Navigating to:', url)
          onNavigate(url)
        } else {
          console.log('onNavigate:', onNavigate, 'defaultListId:', newFolder?.defaultListId)
        }
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            İstifadəçilər
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
              className="w-full px-3 py-2 text-sm text-left border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {selectedAssignees.length > 0
                ? `${selectedAssignees.length} istifadəçi seçildi`
                : 'İstifadəçi seçin...'}
            </button>
            {showAssigneeDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {users.map(user => (
                  <label
                    key={user.id}
                    className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssignees.includes(user.id)}
                      onChange={() => toggleAssignee(user.id)}
                      className="mr-2"
                    />
                    <span className="text-sm">{user.name || user.email}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {selectedAssignees.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedAssignees.map(userId => {
                const user = users.find(u => u.id === userId)
                return user ? (
                  <span
                    key={userId}
                    className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    {user.name || user.email}
                    <button
                      type="button"
                      onClick={() => toggleAssignee(userId)}
                      className="ml-1 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ) : null
              })}
            </div>
          )}
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

const SpaceFormModal = ({
  isOpen,
  onClose,
  space,
  createSpace,
  updateSpace,
  isCreating,
  isUpdating,
  onSpaceCreated,
  onNavigate,
}) => {
  const [createFolder] = useCreateFolderMutation()
  const { data: users = [] } = adminApi.useGetUsersQuery()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [selectedAssignees, setSelectedAssignees] = useState([])
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (space) {
        setFormData({
          name: space.name || '',
          description: space.description || '',
        })
        setSelectedAssignees(space.assignees?.map(a => a.id) || [])
      } else {
        setFormData({
          name: '',
          description: '',
        })
        setSelectedAssignees([])
      }
    }
  }, [space, isOpen])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const toggleAssignee = (userId) => {
    setSelectedAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (space) {
        // Update
        await updateSpace({ id: space.id, ...formData, assigneeIds: selectedAssignees }).unwrap()
        toast.success('Sahə yeniləndi!')
      } else {
        // Create space (backend avtomatik list yaradır)
        const newSpace = await createSpace({ ...formData, assigneeIds: selectedAssignees }).unwrap()

        toast.success('Sahə yaradıldı!')

        if (onSpaceCreated && newSpace?.id) {
          onSpaceCreated(newSpace.id)
        }

        // Navigate to the new list (backend tərəfindən yaradılıb)
        if (onNavigate && newSpace?.taskLists?.[0]?.id) {
          onNavigate(`/tasks/space/${newSpace.id}/list/${newSpace.taskLists[0].id}`)
        } else if (onNavigate && newSpace?.id) {
          onNavigate(`/tasks/space/${newSpace.id}`)
        }
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
      title={space ? 'Sahəni redaktə et' : 'Yeni sahə'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sahə adı
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Məsələn: Marketing"
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
            placeholder="Sahə haqqında qısa açıqlama..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            İstifadəçilər
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
              className="w-full px-3 py-2 text-sm text-left border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {selectedAssignees.length > 0
                ? `${selectedAssignees.length} istifadəçi seçildi`
                : 'İstifadəçi seçin...'}
            </button>
            {showAssigneeDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {users.map(user => (
                  <label
                    key={user.id}
                    className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssignees.includes(user.id)}
                      onChange={() => toggleAssignee(user.id)}
                      className="mr-2"
                    />
                    <span className="text-sm">{user.name || user.email}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {selectedAssignees.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedAssignees.map(userId => {
                const user = users.find(u => u.id === userId)
                return user ? (
                  <span
                    key={userId}
                    className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    {user.name || user.email}
                    <button
                      type="button"
                      onClick={() => toggleAssignee(userId)}
                      className="ml-1 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ) : null
              })}
            </div>
          )}
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
            {isCreating || isUpdating ? 'Yüklənir...' : space ? 'Yenilə' : 'Yarat'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

const AssigneeModal = ({
  isOpen,
  onClose,
  entity,
  entityType, // 'space', 'folder', 'list'
  onUpdate,
}) => {
  const { data: users = [] } = adminApi.useGetUsersQuery()
  const [selectedAssignees, setSelectedAssignees] = useState([])
  const [isUpdating, setIsUpdating] = useState(false)

  const entityNames = {
    space: 'Sahə',
    folder: 'Qovluq',
    list: 'Siyahı'
  }

  useEffect(() => {
    if (isOpen && entity) {
      setSelectedAssignees(entity.assignees?.map(a => a.id) || [])
    }
  }, [isOpen, entity])

  const toggleAssignee = (userId) => {
    setSelectedAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsUpdating(true)

    try {
      await onUpdate({ id: entity.id, assigneeIds: selectedAssignees }).unwrap()
      toast.success('İstifadəçilər yeniləndi!')
      onClose()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${entityNames[entityType]} istifadəçiləri`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            İstifadəçilər
          </label>
          {/* Scrollable user list - dropdown yerinə birbaşa siyahı */}
          <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
            {users.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500">İstifadəçi yoxdur</p>
            ) : (
              users.map(user => (
                <label
                  key={user.id}
                  className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedAssignees.includes(user.id)}
                    onChange={() => toggleAssignee(user.id)}
                    className="mr-2"
                  />
                  <span className="text-sm">{user.name || user.email}</span>
                </label>
              ))
            )}
          </div>
          {selectedAssignees.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedAssignees.map(userId => {
                const user = users.find(u => u.id === userId)
                return user ? (
                  <span
                    key={userId}
                    className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    {user.name || user.email}
                    <button
                      type="button"
                      onClick={() => toggleAssignee(userId)}
                      className="ml-1 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ) : null
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Ləğv et
          </button>
          <button
            type="submit"
            disabled={isUpdating}
            className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Yüklənir...' : 'Yadda saxla'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default Sidebar
