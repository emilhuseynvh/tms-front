import { NavLink, useNavigate, useLocation } from 'react-router'
import { toast } from 'react-toastify'
import { useState, useMemo, useEffect } from 'react'
import { useGetFoldersQuery, useCreateFolderMutation, useUpdateFolderMutation, useDeleteFolderMutation } from '../services/adminApi'
import Modal from './Modal'
import { disconnectSocket } from '../hooks/useWebSocket'

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isTasksOpen, setIsTasksOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState(null)
  const [hoveredFolder, setHoveredFolder] = useState(null)

  const { data: folders = [] } = useGetFoldersQuery()
  const [createFolder, { isLoading: isCreating }] = useCreateFolderMutation()
  const [updateFolder, { isLoading: isUpdating }] = useUpdateFolderMutation()
  const [deleteFolder] = useDeleteFolderMutation()

  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return folders
    return folders.filter(folder =>
      folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [folders, searchQuery])

  const handleOpenModal = (folder = null) => {
    setEditingFolder(folder)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setEditingFolder(null)
    setIsModalOpen(false)
  }

  const handleDelete = async (e, id) => {
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

  const handleLogout = () => {
    // Disconnect WebSocket before logout
    disconnectSocket()
    localStorage.removeItem('token')
    toast.success('Çıxış edildi!')
    onClose() // Close sidebar before navigation
    navigate('/login')
  }

  const navItems = [
    {
      path: '/users',
      label: 'İstifadəçilər',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      path: '/chat',
      label: 'Mesajlar',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      path: '/profile',
      label: 'Profil',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

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
        className={`fixed md:static inset-y-0 left-0 z-50 w-60 bg-blue-50 border-r border-blue-100 h-screen flex flex-col transform transition-transform duration-300 ease-in-out ${
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

            {/* Folders List */}
            {isTasksOpen && (
              <div className="mt-2 ml-3 space-y-2">
                {/* Search Input with Add Button */}
                <div className="px-2 flex gap-1">
                  <input
                    type="text"
                    placeholder="Qovluq axtar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-xs border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                  <button
                    onClick={() => handleOpenModal()}
                    className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    title="Yeni qovluq"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* Folders */}
                <ul className="space-y-1">
                  {filteredFolders.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-gray-500">
                      {searchQuery ? 'Nəticə tapılmadı' : 'Qovluq yoxdur'}
                    </li>
                  ) : (
                    filteredFolders.map((folder) => (
                      <li
                        key={folder.id}
                        onMouseEnter={() => setHoveredFolder(folder.id)}
                        onMouseLeave={() => setHoveredFolder(null)}
                      >
                        <div
                          className={`group flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                            location.pathname.startsWith(`/tasks/folder/${folder.id}`)
                              ? 'bg-blue-200 text-blue-900 font-medium'
                              : 'text-blue-800 hover:bg-blue-100'
                          }`}
                        >
                          <button
                            onClick={() => {
                              navigate(`/tasks/folder/${folder.id}`)
                              onClose()
                            }}
                            className="flex items-center gap-2 flex-1 min-w-0"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <span className="truncate">{folder.name}</span>
                          </button>

                          {hoveredFolder === folder.id && (
                            <div className="flex gap-0.5 flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenModal(folder)
                                }}
                                className="p-1 hover:bg-blue-300 rounded transition-colors"
                                title="Redaktə et"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => handleDelete(e, folder.id)}
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

      {/* Folder Form Modal */}
      <FolderFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        folder={editingFolder}
        createFolder={createFolder}
        updateFolder={updateFolder}
        isCreating={isCreating}
        isUpdating={isUpdating}
      />
    </>
  )
}

const FolderFormModal = ({
  isOpen,
  onClose,
  folder,
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
  }, [folder])

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
        await createFolder(formData).unwrap()
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

export default Sidebar
