import { useState, useEffect } from 'react'
import {
  useGetTaskStatusesQuery,
  useCreateTaskStatusMutation,
  useUpdateTaskStatusMutation,
  useDeleteTaskStatusMutation,
} from '../services/adminApi'
import Modal from '../components/Modal'
import { toast } from 'react-toastify'

const ICON_OPTIONS = [
  { value: 'circle', label: 'Dairə', icon: '●' },
  { value: 'check', label: 'Tik', icon: '✓' },
  { value: 'clock', label: 'Saat', icon: '⏱' },
  { value: 'star', label: 'Ulduz', icon: '★' },
  { value: 'flag', label: 'Bayraq', icon: '⚑' },
  { value: 'arrow', label: 'Ox', icon: '→' },
  { value: 'pause', label: 'Pauza', icon: '⏸' },
  { value: 'play', label: 'Oynat', icon: '▶' },
]

const COLOR_PRESETS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#14B8A6', // Teal
]

const TaskStatuses = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState(null)
  const [inlineEditId, setInlineEditId] = useState(null)
  const [inlineEditValue, setInlineEditValue] = useState('')

  const { data: statuses = [], isLoading } = useGetTaskStatusesQuery()
  const [createStatus, { isLoading: isCreating }] = useCreateTaskStatusMutation()
  const [updateStatus, { isLoading: isUpdating }] = useUpdateTaskStatusMutation()
  const [deleteStatus] = useDeleteTaskStatusMutation()

  const handleOpenModal = (status = null) => {
    setEditingStatus(status)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setEditingStatus(null)
    setIsModalOpen(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Bu statusu silmək istədiyinizdən əminsiniz?')) {
      try {
        await deleteStatus(id).unwrap()
        toast.success('Status silindi!')
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  const handleInlineEditStart = (status) => {
    setInlineEditId(status.id)
    setInlineEditValue(status.name)
  }

  const handleInlineEditSave = async (status) => {
    if (inlineEditValue.trim() && inlineEditValue !== status.name) {
      try {
        await updateStatus({ id: status.id, name: inlineEditValue.trim() }).unwrap()
        toast.success('Status adı yeniləndi!')
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
    setInlineEditId(null)
    setInlineEditValue('')
  }

  const handleInlineEditCancel = () => {
    setInlineEditId(null)
    setInlineEditValue('')
  }

  const getIconDisplay = (iconValue) => {
    const iconOption = ICON_OPTIONS.find(opt => opt.value === iconValue)
    return iconOption ? iconOption.icon : '●'
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Statuslar</h1>
            <p className="text-sm text-gray-500 mt-1">Tapşırıq statuslarını idarə edin</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Yeni status
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yüklənir...</p>
        </div>
      ) : statuses.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-500">Heç bir status tapılmadı</p>
          <button
            onClick={() => handleOpenModal()}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            İlk statusu yaradın
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {statuses.map((status) => (
            <div
              key={status.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                  style={{ backgroundColor: status.color }}
                >
                  {getIconDisplay(status.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  {inlineEditId === status.id ? (
                    <input
                      type="text"
                      value={inlineEditValue}
                      onChange={(e) => setInlineEditValue(e.target.value)}
                      onBlur={() => handleInlineEditSave(status)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleInlineEditSave(status)
                        if (e.key === 'Escape') handleInlineEditCancel()
                      }}
                      autoFocus
                      className="w-full h-6 px-1 -ml-1 text-sm font-medium border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  ) : (
                    <h3
                      onClick={() => handleInlineEditStart(status)}
                      className="h-6 leading-6 font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600 hover:underline decoration-blue-300 decoration-dashed underline-offset-2 transition-colors"
                    >
                      {status.name}
                    </h3>
                  )}
                  <p className="text-xs text-gray-500">{status.color}</p>
                </div>
                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenModal(status)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Tam redaktə"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(status.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Sil"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status Form Modal */}
      <StatusFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        status={editingStatus}
        createStatus={createStatus}
        updateStatus={updateStatus}
        isCreating={isCreating}
        isUpdating={isUpdating}
      />
    </div>
  )
}

const StatusFormModal = ({
  isOpen,
  onClose,
  status,
  createStatus,
  updateStatus,
  isCreating,
  isUpdating,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    icon: 'circle',
  })

  useEffect(() => {
    if (isOpen) {
      if (status) {
        setFormData({
          name: status.name || '',
          color: status.color || '#3B82F6',
          icon: status.icon || 'circle',
        })
      } else {
        setFormData({
          name: '',
          color: '#3B82F6',
          icon: 'circle',
        })
      }
    }
  }, [status, isOpen])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (status) {
        await updateStatus({ id: status.id, ...formData }).unwrap()
        toast.success('Status yeniləndi!')
      } else {
        await createStatus(formData).unwrap()
        toast.success('Status yaradıldı!')
      }
      onClose()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const getIconDisplay = (iconValue) => {
    const iconOption = ICON_OPTIONS.find(opt => opt.value === iconValue)
    return iconOption ? iconOption.icon : '●'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={status ? 'Statusu redaktə et' : 'Yeni status'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Preview */}
        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
            style={{ backgroundColor: formData.color }}
          >
            {getIconDisplay(formData.icon)}
          </div>
          <span className="ml-3 font-medium text-gray-700">
            {formData.name || 'Status adı'}
          </span>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status adı
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Məs: Gözləmədə, Tamamlandı"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rəng
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData({ ...formData, color })}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  formData.color === color
                    ? 'border-gray-900 scale-110'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className="w-10 h-10 rounded cursor-pointer border-0"
            />
            <input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              placeholder="#3B82F6"
            />
          </div>
        </div>

        {/* Icon */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            İkon
          </label>
          <div className="grid grid-cols-4 gap-2">
            {ICON_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData({ ...formData, icon: option.value })}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  formData.icon === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-xl block mb-1">{option.icon}</span>
                <span className="text-xs text-gray-500">{option.label}</span>
              </button>
            ))}
          </div>
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
            {isCreating || isUpdating ? 'Yüklənir...' : status ? 'Yenilə' : 'Yarat'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default TaskStatuses
