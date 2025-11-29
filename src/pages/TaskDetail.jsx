import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  useGetTasksByListQuery,
  useGetUsersQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useReorderTaskMutation,
} from '../services/adminApi'
import Modal from '../components/Modal'
import TaskNotifications from '../components/TaskNotifications'
import { toast } from 'react-toastify'

const TaskDetail = () => {
  const { folderId, taskListId } = useParams()
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [parentTaskId, setParentTaskId] = useState(null)
  const [draggedTask, setDraggedTask] = useState(null)
  const [expandedTasks, setExpandedTasks] = useState(new Set())

  // Filters
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { data: tasks = [], isLoading } = useGetTasksByListQuery({
    taskListId,
    search,
    startDate,
    endDate,
  })
  const { data: users = [] } = useGetUsersQuery()
  const [createTask] = useCreateTaskMutation()
  const [updateTask] = useUpdateTaskMutation()
  const [deleteTask] = useDeleteTaskMutation()
  const [reorderTask] = useReorderTaskMutation()

  const handleClearFilters = () => {
    setSearch('')
    setStartDate('')
    setEndDate('')
  }

  const handleOpenModal = (task = null, parentId = null) => {
    setEditingTask(task)
    setParentTaskId(parentId)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setEditingTask(null)
    setParentTaskId(null)
    setIsModalOpen(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Bu tapşırığı silmək istədiyinizdən əminsiniz?')) {
      try {
        await deleteTask(id).unwrap()
        toast.success('Tapşırıq silindi!')
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  const handleStatusChange = async (taskId, newStatus) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    try {
      await updateTask({
        id: taskId,
        title: task.title,
        description: task.description,
        startAt: task.startAt,
        dueAt: task.dueAt,
        taskListId: task.taskListId,
        assigneeId: task.assigneeId,
        status: newStatus,
      }).unwrap()
      toast.success('Status yeniləndi!')
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  // Drag and Drop handlers
  const handleDragStart = (e, task, index) => {
    setDraggedTask({ task, index })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault()

    if (!draggedTask || draggedTask.index === targetIndex) {
      setDraggedTask(null)
      return
    }

    try {
      await reorderTask({
        taskId: draggedTask.task.id,
        targetIndex: targetIndex,
      }).unwrap()
      toast.success('Sıralama yeniləndi!')
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }

    setDraggedTask(null)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('az-AZ', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId)
    return user?.username || '-'
  }

  // Get root tasks (tasks with parentId === null)
  const rootTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return []
    return tasks.filter(task => !task.parentId || task.parentId === null)
  }, [tasks])

  // Toggle task expansion
  const toggleTask = (taskId) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  // Recursive function to render task rows
  const renderTaskRow = (task, depth = 0, index = 0) => {
    const indent = depth * 24
    const hasChildren = task.children && task.children.length > 0
    const isExpanded = expandedTasks.has(task.id)
    
    return (
      <>
        <tr
          key={task.id}
          draggable
          onDragStart={(e) => handleDragStart(e, task, index)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
          className={`hover:bg-gray-50 transition-colors cursor-move ${
            draggedTask?.task.id === task.id ? 'opacity-50' : ''
          }`}
        >
          <td className="px-6 py-4">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${indent}px` }}>
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleTask(task.id)
                  }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title={isExpanded ? 'Bağla' : 'Aç'}
                >
                  <svg 
                    className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="w-6" /> // Spacer for alignment
              )}
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </td>
          <td className="px-6 py-4">
            <div>
              <div className="text-sm font-medium text-gray-900">{task.title}</div>
              {task.description && (
                <div className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</div>
              )}
            </div>
          </td>
          <td className="px-6 py-4">
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(task.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="text-xs border-0 rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="open">Açıq</option>
              <option value="in_progress">Davam edir</option>
              <option value="done">Bitdi</option>
            </select>
          </td>
          <td className="px-6 py-4 text-sm text-gray-600">
            {getUserName(task.assigneeId)}
          </td>
          <td className="px-6 py-4 text-sm text-gray-600">
            {formatDate(task.startAt)}
          </td>
          <td className="px-6 py-4 text-sm text-gray-600">
            {formatDate(task.dueAt)}
          </td>
          <td className="px-6 py-4 text-right text-sm">
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenModal(null, task.id)
                }}
                className="text-green-600 hover:text-green-700 font-medium text-xs"
                title="Sub-task əlavə et"
              >
                + Sub-task
              </button>
              <button
                onClick={() => handleOpenModal(task)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Redaktə
              </button>
              <button
                onClick={() => handleDelete(task.id)}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Sil
              </button>
            </div>
          </td>
        </tr>
        {hasChildren && isExpanded && task.children.map((child, idx) => renderTaskRow(child, depth + 1, idx))}
      </>
    )
  }

  // Recursive function to render task cards
  const renderTaskCard = (task, depth = 0, index = 0) => {
    const indent = depth * 16
    const hasChildren = task.children && task.children.length > 0
    const isExpanded = expandedTasks.has(task.id)
    
    return (
      <div key={task.id}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, task, index)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
          className={`bg-white rounded-lg border border-gray-200 p-4 mb-3 ${
            draggedTask?.task.id === task.id ? 'opacity-50' : ''
          }`}
          style={{ marginLeft: `${indent}px` }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="pt-1 flex items-center gap-1">
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleTask(task.id)
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                  title={isExpanded ? 'Bağla' : 'Aç'}
                >
                  <svg 
                    className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="w-5" /> // Spacer for alignment
              )}
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 mb-1">{task.title}</h3>
              {task.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>
              )}

              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Status:</span>
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="open">Açıq</option>
                    <option value="in_progress">Davam edir</option>
                    <option value="done">Bitdi</option>
                  </select>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Təyin edilib:</span>
                  <span className="text-gray-900 font-medium">{getUserName(task.assigneeId)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Başlama:</span>
                  <span className="text-gray-900">{formatDate(task.startAt)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Bitmə:</span>
                  <span className="text-gray-900">{formatDate(task.dueAt)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenModal(null, task.id)
                  }}
                  className="px-3 py-2 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                >
                  + Sub-task
                </button>
                <button
                  onClick={() => handleOpenModal(task)}
                  className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Redaktə
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="flex-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && task.children.map((child, idx) => renderTaskCard(child, depth + 1, idx))}
      </div>
    )
  }

  return (
    <>
      <TaskNotifications tasks={tasks} />
      <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <button
            onClick={() => navigate(`/tasks/folder/${folderId}`)}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Tapşırıqlar</h1>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Yeni Tapşırıq</span>
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
                placeholder="Tapşırıq axtar..."
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
            {tasks.length} tapşırıq
            {(search || startDate || endDate) && (
              <span className="text-blue-600 ml-1">(filtrlənmiş)</span>
            )}
          </p>
        </div>
      </div>

      {/* Tasks Table */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tapşırıq yoxdur</h3>
          <p className="text-gray-500 mb-4">İlk tapşırığınızı yaradın</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Tapşırıq Yarat
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 w-10"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Başlıq</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Təyin edilib</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Başlama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Bitmə</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rootTasks.map((task, index) => renderTaskRow(task, 0, index))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {rootTasks.map((task, index) => renderTaskCard(task, 0, index))}
          </div>
        </>
      )}

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={editingTask}
        parentTaskId={parentTaskId}
        taskListId={taskListId}
        users={users}
        tasks={tasks}
        createTask={createTask}
        updateTask={updateTask}
      />
      </div>
    </>
  )
}

const TaskFormModal = ({
  isOpen,
  onClose,
  task,
  parentTaskId,
  taskListId,
  users,
  tasks = [],
  createTask,
  updateTask,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startAt: '',
    dueAt: '',
    taskListId: 0,
    assigneeId: 0,
    status: 'open',
    parentId: 0,
  })

  const [isLoading, setIsLoading] = useState(false)

  // Helper function to convert date to datetime-local format
  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        startAt: formatDateTimeLocal(task.startAt),
        dueAt: formatDateTimeLocal(task.dueAt),
        taskListId: task.taskListId || parseInt(taskListId),
        assigneeId: task.assigneeId || 0,
        status: task.status || 'open',
        parentId: task.parentId || 0,
      })
    } else {
      setFormData({
        title: '',
        description: '',
        startAt: '',
        dueAt: '',
        taskListId: parseInt(taskListId),
        assigneeId: 0,
        status: 'open',
        parentId: parentTaskId || 0,
      })
    }
  }, [task, taskListId, parentTaskId])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Prepare payload - exclude parentId if it's 0 or not set
      const payload = { ...formData }
      
      // Convert parentId to number, exclude if 0
      if (payload.parentId) {
        payload.parentId = parseInt(payload.parentId)
        if (payload.parentId === 0) {
          delete payload.parentId
        }
      } else {
        delete payload.parentId
      }
      
      // Convert assigneeId to number, use 0 if not set
      if (payload.assigneeId) {
        payload.assigneeId = parseInt(payload.assigneeId)
      } else {
        payload.assigneeId = 0
      }
      
      // Convert taskListId to number
      payload.taskListId = parseInt(payload.taskListId)
      
      // Convert dates to ISO string format
      if (payload.startAt) {
        payload.startAt = new Date(payload.startAt).toISOString()
      }
      if (payload.dueAt) {
        payload.dueAt = new Date(payload.dueAt).toISOString()
      }

      if (task) {
        await updateTask({ id: task.id, ...payload }).unwrap()
        toast.success('Tapşırıq yeniləndi!')
      } else {
        await createTask(payload).unwrap()
        toast.success('Tapşırıq yaradıldı!')
      }
      onClose()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Tapşırığı redaktə et' : 'Yeni tapşırıq'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Başlıq
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Tapşırıq başlığı"
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
            placeholder="Tapşırıq haqqında ətraflı məlumat..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlama tarixi
            </label>
            <input
              type="datetime-local"
              name="startAt"
              value={formData.startAt}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bitmə tarixi
            </label>
            <input
              type="datetime-local"
              name="dueAt"
              value={formData.dueAt}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Təyin et
          </label>
          <select
            name="assigneeId"
            value={formData.assigneeId}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={0}>Təyin edilməyib</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="open">Açıq</option>
            <option value="in_progress">Davam edir</option>
            <option value="done">Bitdi</option>
          </select>
        </div>

        {parentTaskId && !task && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Bu tapşırıq <strong>{tasks.find(t => t.id === parentTaskId)?.title || 'seçilmiş task'}</strong> üçün sub-task kimi yaradılacaq
              </span>
            </div>
          </div>
        )}
        {!parentTaskId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ana Tapşırıq (Parent)
            </label>
            <select
              name="parentId"
              value={formData.parentId}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>Ana tapşırıq yoxdur</option>
              {tasks
                .filter((t) => !task || t.id !== task.id) // Exclude current task if editing
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          </div>
        )}

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
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Yüklənir...' : task ? 'Yenilə' : 'Yarat'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default TaskDetail
