import { NavLink, useNavigate, useLocation } from 'react-router'
import { toast } from 'react-toastify'
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  useGetMySpacesQuery,
  useCreateSpaceMutation,
  useUpdateSpaceMutation,
  useDeleteSpaceMutation,
  useGetFoldersBySpaceQuery,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
  useGetTaskListsByFolderQuery,
  useGetTaskListsBySpaceQuery,
  useCreateTaskListMutation,
  useUpdateTaskListMutation,
  useDeleteTaskListMutation
} from '../services/adminApi'
import { useVerifyQuery } from '../services/authApi'
import Modal from './Modal'
import { disconnectSocket } from '../hooks/useWebSocket'
import { disconnectNotificationSocket } from '../hooks/useNotificationSocket.jsx'

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const location = useLocation()
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

  // Get user role (handle both nested and direct role)
  const userRole = useMemo(() => {
    const role = currentUser?.role?.role || currentUser?.role || 'user'
    return typeof role === 'string' ? role.toLowerCase() : 'user'
  }, [currentUser])

  const filteredSpaces = useMemo(() => {
    if (!searchQuery.trim()) return spaces
    return spaces.filter(space =>
      space.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
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
    if (window.confirm('Bu sahəni silmək istədiyinizdən əminsiniz?')) {
      try {
        await deleteSpace(id).unwrap()
        toast.success('Sahə silindi!')
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  const handleLogout = () => {
    // Disconnect WebSockets before logout
    disconnectSocket()
    disconnectNotificationSocket()
    localStorage.removeItem('token')
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
                        isExpanded={expandedSpaces[space.id]}
                        onToggle={toggleSpace}
                        onExpand={expandSpace}
                        isHovered={hoveredSpace === space.id}
                        onHover={setHoveredSpace}
                        onEdit={handleOpenSpaceModal}
                        onDelete={handleDeleteSpace}
                        onNavigate={(path) => {
                          navigate(path)
                          onClose()
                        }}
                        location={location}
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
  isExpanded,
  onToggle,
  onExpand,
  isHovered,
  onHover,
  onEdit,
  onDelete,
  onNavigate,
  location,
}) => {
  const { data: folders = [], isLoading: isFoldersLoading } = useGetFoldersBySpaceQuery(
    space.id,
    { skip: !isExpanded }
  )
  const { data: directLists = [], isLoading: isDirectListsLoading } = useGetTaskListsBySpaceQuery(
    space.id,
    { skip: !isExpanded }
  )
  const [createFolder, { isLoading: isCreatingFolder }] = useCreateFolderMutation()
  const [updateFolder, { isLoading: isUpdatingFolder }] = useUpdateFolderMutation()
  const [deleteFolder] = useDeleteFolderMutation()
  const [createTaskList, { isLoading: isCreatingList }] = useCreateTaskListMutation()
  const [updateTaskList, { isLoading: isUpdatingList }] = useUpdateTaskListMutation()
  const [deleteTaskList] = useDeleteTaskListMutation()

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState(null)
  const [isDirectListModalOpen, setIsDirectListModalOpen] = useState(false)
  const [editingList, setEditingList] = useState(null)
  const [expandedFolders, setExpandedFolders] = useState({})
  const [hoveredFolder, setHoveredFolder] = useState(null)
  const [hoveredList, setHoveredList] = useState(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  const isActive = location.pathname.startsWith(`/tasks/space/${space.id}`)
  const isLoading = isFoldersLoading || isDirectListsLoading

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
    setAddMenuOpen(false)
  }

  const handleCloseFolderModal = () => {
    setEditingFolder(null)
    setIsFolderModalOpen(false)
  }

  const handleDeleteFolder = async (e, id) => {
    e.stopPropagation()
    if (window.confirm('Bu qovluğu silmək istədiyinizdən əminsiniz?')) {
      try {
        await deleteFolder(id).unwrap()
        toast.success('Qovluq silindi!')
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

  const handleDeleteList = async (e, id) => {
    e.stopPropagation()
    if (window.confirm('Bu siyahını silmək istədiyinizdən əminsiniz?')) {
      try {
        await deleteTaskList(id).unwrap()
        toast.success('Siyahı silindi!')
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  return (
    <li
      onMouseEnter={() => onHover(space.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div
        className={`group flex items-center gap-1 px-2 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-blue-200 text-blue-900 font-medium'
            : 'text-blue-800 hover:bg-blue-100'
        }`}
      >
        {/* Ox buttonu */}
        <button
          onClick={(e) => onToggle(space.id, e)}
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
        <button
          onClick={() => {
            onExpand(space.id)
            onNavigate(`/tasks/space/${space.id}`)
          }}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <svg className="w-4 h-4 shrink-0 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="truncate">{space.name}</span>
        </button>

        {/* Edit/Delete buttonları */}
        {isHovered && (
          <div className="flex gap-0.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(space)
              }}
              className="p-1 hover:bg-blue-300 rounded transition-colors"
              title="Redaktə et"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => onDelete(e, space.id)}
              className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
              title="Sil"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Space içəriyi: Folder-lər və birbaşa list-lər */}
      {isExpanded && (
        <ul className="ml-4 mt-1 space-y-0.5 border-l-2 border-purple-200 pl-3">
          {isLoading ? (
            <li className="px-2 py-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Yüklənir...
              </div>
            </li>
          ) : (
            <>
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
                  onEdit={handleOpenFolderModal}
                  onDelete={handleDeleteFolder}
                  onNavigate={onNavigate}
                  location={location}
                />
              ))}

              {/* Birbaşa Space-ə bağlı list-lər */}
              {directLists.map((list) => (
                <li
                  key={list.id}
                  onMouseEnter={() => setHoveredList(list.id)}
                  onMouseLeave={() => setHoveredList(null)}
                  className="group"
                >
                  <div
                    className={`flex items-center gap-1 px-2 py-2 rounded text-sm transition-colors ${
                      location.pathname.includes(`/list/${list.id}`)
                        ? 'bg-blue-100 text-blue-800 font-medium'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    <button
                      onClick={() => onNavigate(`/tasks/space/${space.id}/list/${list.id}`)}
                      className="flex items-center gap-2 flex-1 min-w-0"
                    >
                      <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="truncate">{list.name}</span>
                    </button>
                    {hoveredList === list.id && (
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenListModal(list)
                          }}
                          className="p-1 hover:bg-blue-200 rounded transition-colors"
                          title="Redaktə et"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDeleteList(e, list.id)}
                          className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                          title="Sil"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}

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
                      onClick={() => handleOpenFolderModal()}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      Qovluq
                    </button>
                    <button
                      onClick={() => {
                        setIsDirectListModalOpen(true)
                        setAddMenuOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Siyahı
                    </button>
                  </div>
                )}
              </li>
            </>
          )}
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
  onEdit,
  onDelete,
  onNavigate,
  location,
}) => {
  const { data: taskLists = [], isLoading } = useGetTaskListsByFolderQuery(
    { folderId: folder.id },
    { skip: !isExpanded }
  )
  const [createTaskList, { isLoading: isCreatingList }] = useCreateTaskListMutation()
  const [updateTaskList, { isLoading: isUpdatingList }] = useUpdateTaskListMutation()
  const [deleteTaskList] = useDeleteTaskListMutation()

  const [isListModalOpen, setIsListModalOpen] = useState(false)
  const [editingList, setEditingList] = useState(null)
  const [hoveredList, setHoveredList] = useState(null)

  const isActive = location.pathname.includes(`/folder/${folder.id}`)

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
    if (window.confirm('Bu siyahını silmək istədiyinizdən əminsiniz?')) {
      try {
        await deleteTaskList(id).unwrap()
        toast.success('Siyahı silindi!')
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  return (
    <li
      onMouseEnter={() => onHover(folder.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div
        className={`group flex items-center gap-1.5 px-2 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-blue-100 text-blue-900 font-medium'
            : 'text-blue-800 hover:bg-blue-50'
        }`}
      >
        {/* Ox buttonu */}
        <button
          onClick={(e) => onToggle(folder.id, e)}
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
        <button
          onClick={() => onNavigate(`/tasks/space/${spaceId}/folder/${folder.id}`)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <svg className="w-4 h-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="truncate">{folder.name}</span>
        </button>

        {/* Edit/Delete buttonları */}
        {isHovered && (
          <div className="flex gap-0.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(folder)
              }}
              className="p-1 hover:bg-blue-200 rounded transition-colors"
              title="Redaktə et"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => onDelete(e, folder.id)}
              className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
              title="Sil"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Task listləri */}
      {isExpanded && (
        <ul className="ml-3 mt-1 space-y-0.5 border-l-2 border-blue-100 pl-3">
          {isLoading ? (
            <li className="px-2 py-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Yüklənir...
              </div>
            </li>
          ) : taskLists.length === 0 ? (
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
              {taskLists.map((list) => (
                <li
                  key={list.id}
                  onMouseEnter={() => setHoveredList(list.id)}
                  onMouseLeave={() => setHoveredList(null)}
                >
                  <div
                    className={`flex items-center gap-1 px-2 py-1.5 rounded text-sm transition-colors ${
                      location.pathname.includes(`/list/${list.id}`)
                        ? 'bg-blue-100 text-blue-800 font-medium'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    <button
                      onClick={() => onNavigate(`/tasks/space/${spaceId}/folder/${folder.id}/list/${list.id}`)}
                      className="flex items-center gap-2 flex-1 min-w-0"
                    >
                      <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="truncate">{list.name}</span>
                    </button>
                    {hoveredList === list.id && (
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenListModal(list)
                          }}
                          className="p-1 hover:bg-blue-200 rounded transition-colors"
                          title="Redaktə et"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDeleteList(e, list.id)}
                          className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                          title="Sil"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
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
  const [name, setName] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (list) {
        setName(list.name || '')
      } else {
        setName('')
      }
    }
  }, [isOpen, list])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      if (list) {
        await updateTaskList({ id: list.id, name: name.trim() }).unwrap()
        toast.success('Siyahı yeniləndi!')
        onClose()
      } else {
        const payload = { name: name.trim() }
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
        await createFolder({ ...formData, spaceId }).unwrap()
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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    if (isOpen) {
      if (space) {
        setFormData({
          name: space.name || '',
          description: space.description || '',
        })
      } else {
        setFormData({
          name: '',
          description: '',
        })
      }
    }
  }, [space, isOpen])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (space) {
        // Update
        await updateSpace({ id: space.id, ...formData }).unwrap()
        toast.success('Sahə yeniləndi!')
      } else {
        // Create space
        const newSpace = await createSpace(formData).unwrap()

        // Create default folder
        const newFolder = await createFolder({
          name: 'Folder',
          spaceId: newSpace.id
        }).unwrap()

        toast.success('Sahə yaradıldı!')

        if (onSpaceCreated && newSpace?.id) {
          onSpaceCreated(newSpace.id)
        }

        // Navigate to the new folder
        if (onNavigate && newFolder?.id) {
          onNavigate(`/tasks/space/${newSpace.id}/folder/${newFolder.id}`)
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

export default Sidebar
