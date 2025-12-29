import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import {
  useGetFoldersQuery,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
} from '../services/adminApi'
import Modal from '../components/Modal'
import { useConfirm } from '../context/ConfirmContext'
import { toast } from 'react-toastify'

const Tasks = () => {
  const navigate = useNavigate()
  const { confirm } = useConfirm()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState(null)

  const { data: folders = [], isLoading } = useGetFoldersQuery()
  const [createFolder, { isLoading: isCreating }] = useCreateFolderMutation()
  const [updateFolder, { isLoading: isUpdating }] = useUpdateFolderMutation()
  const [deleteFolder] = useDeleteFolderMutation()

  const handleOpenModal = (folder = null) => {
    setEditingFolder(folder)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setEditingFolder(null)
    setIsModalOpen(false)
  }

  const handleDelete = async (id) => {
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

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Tapşırıqlar</h1>
          <button
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Yeni Qovluq
          </button>
        </div>
      </div>

      {/* Folders Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : folders.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Qovluq yoxdur</h3>
          <p className="text-gray-500 mb-4">İlk qovluğunuzu yaratmaqla başlayın</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Qovluq Yarat
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {folders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => navigate(`/tasks/folder/${folder.id}`)}
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
                      handleOpenModal(folder)
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
                      handleDelete(folder.id)
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <h3 className="font-medium text-gray-900 mb-1 truncate">{folder.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{folder.description || 'Açıqlama yoxdur'}</p>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>0 tapşırıq</span>
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
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

export default Tasks
