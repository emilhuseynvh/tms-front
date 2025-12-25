import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  useGetTasksByListQuery,
  useGetUsersQuery,
  useGetTaskStatusesQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useReorderTaskMutation,
} from '../services/adminApi'
import Modal from '../components/Modal'
import TaskNotifications from '../components/TaskNotifications'
import { toast } from 'react-toastify'

const TaskDetail = () => {
  const { spaceId, folderId, taskListId } = useParams()
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [parentTaskId, setParentTaskId] = useState(null)
  const [draggedTask, setDraggedTask] = useState(null)
  const [expandedTasks, setExpandedTasks] = useState(new Set())
  const [hoveredTaskId, setHoveredTaskId] = useState(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [editingField, setEditingField] = useState(null) // {taskId, field}
  const [editingValue, setEditingValue] = useState('')
  const newTaskInputRef = useRef(null)

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
  const { data: statuses = [] } = useGetTaskStatusesQuery()
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

  // Quick create task with just title
  const handleQuickCreate = async (e, parentId = null) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    try {
      const payload = {
        title: newTaskTitle.trim(),
        taskListId: parseInt(taskListId),
      }
      if (parentId) {
        payload.parentId = parentId
      }
      await createTask(payload).unwrap()
      setNewTaskTitle('')
      setIsAddingTask(false)
      toast.success('Tapşırıq yaradıldı!')
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  // Inline edit handlers
  const startEditing = (taskId, field, currentValue) => {
    setEditingField({ taskId, field })
    setEditingValue(currentValue || '')
  }

  const cancelEditing = () => {
    setEditingField(null)
    setEditingValue('')
  }

  const saveInlineEdit = async (taskId, field) => {
    const task = findTaskById(tasks, taskId)
    if (!task) return

    try {
      const payload = { id: taskId }

      if (field === 'title') {
        if (!editingValue.trim()) {
          cancelEditing()
          return
        }
        payload.title = editingValue.trim()
      } else if (field === 'description') {
        payload.description = editingValue
      } else if (field === 'link') {
        payload.link = editingValue
      } else if (field === 'startAt') {
        payload.startAt = editingValue ? new Date(editingValue).toISOString() : null
      } else if (field === 'dueAt') {
        payload.dueAt = editingValue ? new Date(editingValue).toISOString() : null
      }

      await updateTask(payload).unwrap()
      cancelEditing()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const handleKeyDown = (e, taskId, field) => {
    if (e.key === 'Enter' && field !== 'description') {
      e.preventDefault()
      saveInlineEdit(taskId, field)
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  // Find task by ID recursively
  const findTaskById = (taskList, id) => {
    for (const task of taskList) {
      if (task.id === id) return task
      if (task.children && task.children.length > 0) {
        const found = findTaskById(task.children, id)
        if (found) return found
      }
    }
    return null
  }

  const handleStatusChange = async (taskId, statusId) => {
    try {
      await updateTask({
        id: taskId,
        statusId: statusId ? parseInt(statusId) : null,
      }).unwrap()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const handleAssigneesChange = async (taskId, assigneeIds) => {
    try {
      await updateTask({
        id: taskId,
        assigneeIds,
      }).unwrap()
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
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }

    setDraggedTask(null)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const day = date.getDate()
    const months = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr']
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  }

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

  // Focus on new task input when adding
  useEffect(() => {
    if (isAddingTask && newTaskInputRef.current) {
      newTaskInputRef.current.focus()
    }
  }, [isAddingTask])

  // Recursive function to render task rows
  const renderTaskRow = (task, depth = 0, index = 0) => {
    const indent = depth * 20
    const hasChildren = task.children && task.children.length > 0
    const isExpanded = expandedTasks.has(task.id)
    const isHovered = hoveredTaskId === task.id
    const isEditingTitle = editingField?.taskId === task.id && editingField?.field === 'title'
    const isEditingDesc = editingField?.taskId === task.id && editingField?.field === 'description'
    const isEditingLink = editingField?.taskId === task.id && editingField?.field === 'link'
    const isEditingStartAt = editingField?.taskId === task.id && editingField?.field === 'startAt'
    const isEditingDueAt = editingField?.taskId === task.id && editingField?.field === 'dueAt'

    return (
      <>
        <tr
          key={task.id}
          draggable
          onDragStart={(e) => handleDragStart(e, task, index)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
          onMouseEnter={() => setHoveredTaskId(task.id)}
          onMouseLeave={() => setHoveredTaskId(null)}
          className={`hover:bg-gray-50 transition-colors cursor-move border-b border-gray-200 ${
            draggedTask?.task.id === task.id ? 'opacity-50' : ''
          }`}
        >
          <td className="px-2 py-2">
            <div className="flex items-center gap-1" style={{ paddingLeft: `${indent}px` }}>
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
                    className={`w-3.5 h-3.5 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="w-4" />
              )}
              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </td>
          <td className="px-2 py-2 min-w-[200px]">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={() => saveInlineEdit(task.id, 'title')}
                    onKeyDown={(e) => handleKeyDown(e, task.id, 'title')}
                    autoFocus
                    className="w-full px-1.5 py-0.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <div
                    onClick={() => startEditing(task.id, 'title', task.title)}
                    className="cursor-text hover:bg-gray-100 px-1.5 py-0.5 rounded -mx-1.5"
                  >
                    <div className="text-sm font-medium text-gray-900 truncate">{task.title}</div>
                  </div>
                )}
              </div>
              {/* Action buttons - Sub-task, Edit, Delete */}
              <div className={`flex-shrink-0 flex items-center gap-1 transition-all ${
                isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setParentTaskId(task.id)
                    setIsAddingTask(true)
                  }}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-xs rounded text-blue-600 bg-blue-50 hover:bg-blue-100"
                  title="Sub-task əlavə et"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Sub-task</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenModal(task)
                  }}
                  className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                  title="Redaktə et"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(task.id)
                  }}
                  className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                  title="Sil"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </td>
          <td className="px-2 py-2 whitespace-nowrap">
            <select
              value={task.statusId || ''}
              onChange={(e) => handleStatusChange(task.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="text-xs border border-gray-200 rounded px-1.5 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-gray-300"
              style={task.status ? { backgroundColor: task.status.color + '20', color: task.status.color } : {}}
            >
              <option value="">Status</option>
              {statuses.map(status => (
                <option key={status.id} value={status.id}>{status.name}</option>
              ))}
            </select>
          </td>
          <td className="px-2 py-2">
            <AssigneeSelector
              task={task}
              users={users}
              onUpdate={handleAssigneesChange}
            />
          </td>
          <td className="px-2 py-2 whitespace-nowrap">
            {isEditingStartAt ? (
              <input
                type="datetime-local"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => saveInlineEdit(task.id, 'startAt')}
                onKeyDown={(e) => handleKeyDown(e, task.id, 'startAt')}
                autoFocus
                className="text-xs border border-blue-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            ) : (
              <div
                onClick={() => startEditing(task.id, 'startAt', formatDateTimeLocal(task.startAt))}
                className="cursor-text hover:bg-gray-100 px-1.5 py-1 rounded text-xs text-gray-600"
              >
                {formatDate(task.startAt)}
              </div>
            )}
          </td>
          <td className="px-2 py-2 whitespace-nowrap">
            {isEditingDueAt ? (
              <input
                type="datetime-local"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => saveInlineEdit(task.id, 'dueAt')}
                onKeyDown={(e) => handleKeyDown(e, task.id, 'dueAt')}
                autoFocus
                className="text-xs border border-blue-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            ) : (
              <div
                onClick={() => startEditing(task.id, 'dueAt', formatDateTimeLocal(task.dueAt))}
                className="cursor-text hover:bg-gray-100 px-1.5 py-1 rounded text-xs text-gray-600"
              >
                {formatDate(task.dueAt)}
              </div>
            )}
          </td>
          <td className="px-2 py-2">
            {isEditingLink ? (
              <input
                type="url"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => saveInlineEdit(task.id, 'link')}
                onKeyDown={(e) => handleKeyDown(e, task.id, 'link')}
                autoFocus
                placeholder="https://..."
                className="w-full text-xs border border-blue-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            ) : (
              <div
                onClick={() => startEditing(task.id, 'link', task.link)}
                className="cursor-text hover:bg-gray-100 px-1.5 py-1 rounded"
              >
                {task.link ? (
                  <a
                    href={task.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-600 hover:underline truncate block max-w-[120px]"
                  >
                    {task.link}
                  </a>
                ) : (
                  <span className="text-xs text-gray-300">-</span>
                )}
              </div>
            )}
          </td>
        </tr>
        {hasChildren && isExpanded && task.children.map((child, idx) => renderTaskRow(child, depth + 1, idx))}
      </>
    )
  }

  // Recursive function to render task cards (mobile)
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
          <div className="flex items-start gap-3">
            <div className="pt-1 flex items-center gap-1">
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleTask(task.id)
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded transition-colors"
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
                <div className="w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className="text-sm font-medium text-gray-900 mb-1 cursor-pointer hover:text-blue-600"
                onClick={() => handleOpenModal(task)}
              >
                {task.title}
              </h3>
              {task.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>
              )}

              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Təyin edilib:</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {task.assignees && task.assignees.length > 0 ? (
                      task.assignees.map((assignee) => (
                        <span
                          key={assignee.id}
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700"
                        >
                          {assignee.username}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Başlama:</span>
                  <span className="text-gray-900">{formatDate(task.startAt)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Bitmə:</span>
                  <span className="text-gray-900">{formatDate(task.dueAt)}</span>
                </div>
                {task.link && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Link:</span>
                    <a
                      href={task.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate max-w-[150px]"
                    >
                      {task.link}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    setParentTaskId(task.id)
                    setIsAddingTask(true)
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  + Sub-task
                </button>
                <button
                  onClick={() => handleOpenModal(task)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  Redaktə
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
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
            onClick={() => {
              if (folderId) {
                navigate(`/tasks/space/${spaceId}/folder/${folderId}`)
              } else {
                navigate(`/tasks/space/${spaceId}`)
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Tapşırıqlar</h1>
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
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-x-auto overflow-y-visible">
            <table className="w-full" style={{ minWidth: '900px' }}>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 w-8"></th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Başlıq</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Təyin edilib</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Başlama</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Bitmə</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Link</th>
                </tr>
              </thead>
              <tbody>
                {rootTasks.map((task, index) => renderTaskRow(task, 0, index))}
              </tbody>
            </table>

            {/* Add Task Row */}
            <div className="border-t border-gray-200 px-4 py-3">
              {isAddingTask ? (
                <form onSubmit={(e) => handleQuickCreate(e, parentTaskId)} className="flex items-center gap-2">
                  <input
                    ref={newTaskInputRef}
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder={parentTaskId ? "Sub-task adı..." : "Tapşırıq adı..."}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsAddingTask(false)
                        setNewTaskTitle('')
                        setParentTaskId(null)
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim()}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Əlavə et
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTask(false)
                      setNewTaskTitle('')
                      setParentTaskId(null)
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Ləğv et
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingTask(true)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Tapşırıq əlavə et</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            <div className="space-y-3">
              {rootTasks.map((task, index) => renderTaskCard(task, 0, index))}
            </div>

            {/* Add Task Button for Mobile */}
            <div className="mt-4">
              {isAddingTask ? (
                <form onSubmit={(e) => handleQuickCreate(e, parentTaskId)} className="bg-white rounded-lg border border-gray-200 p-4">
                  <input
                    ref={newTaskInputRef}
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder={parentTaskId ? "Sub-task adı..." : "Tapşırıq adı..."}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={!newTaskTitle.trim()}
                      className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Əlavə et
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingTask(false)
                        setNewTaskTitle('')
                        setParentTaskId(null)
                      }}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Ləğv et
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingTask(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-gray-500 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:text-blue-600 hover:border-blue-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Tapşırıq əlavə et</span>
                </button>
              )}
            </div>
          </div>

          {tasks.length === 0 && !isAddingTask && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center mt-4">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tapşırıq yoxdur</h3>
              <p className="text-gray-500 mb-4">İlk tapşırığınızı yaradın</p>
              <button
                onClick={() => setIsAddingTask(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Tapşırıq Yarat
              </button>
            </div>
          )}
        </>
      )}

      {/* Task Form Modal - for detailed editing */}
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

// Assignee Selector Component
const AssigneeSelector = ({ task, users, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const ref = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX
      })
    }
    setIsOpen(!isOpen)
  }

  const toggleAssignee = (userId) => {
    const currentIds = task.assignees?.map(a => a.id) || []
    let newIds
    if (currentIds.includes(userId)) {
      newIds = currentIds.filter(id => id !== userId)
    } else {
      newIds = [...currentIds, userId]
    }
    onUpdate(task.id, newIds)
  }

  return (
    <div ref={ref} className="relative">
      <div
        ref={triggerRef}
        onClick={handleOpen}
        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded -mx-2"
      >
        <div className="flex flex-wrap gap-1">
          {task.assignees && task.assignees.length > 0 ? (
            task.assignees.map((assignee) => (
              <span
                key={assignee.id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700"
              >
                {assignee.username}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-300 italic">Təyin et...</span>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed z-[9999] w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 max-h-48 overflow-y-auto"
          style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
        >
          {users.map(user => (
            <label
              key={user.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={task.assignees?.some(a => a.id === user.id) || false}
                onChange={() => toggleAssignee(user.id)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{user.username}</span>
            </label>
          ))}
        </div>
      )}
    </div>
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
    assigneeIds: [],
    parentId: 0,
    link: '',
  })

  const [isLoading, setIsLoading] = useState(false)

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
        assigneeIds: task.assignees?.map(a => a.id) || [],
        parentId: task.parentId || 0,
        link: task.link || '',
      })
    } else {
      setFormData({
        title: '',
        description: '',
        startAt: '',
        dueAt: '',
        taskListId: parseInt(taskListId),
        assigneeIds: [],
        parentId: parentTaskId || 0,
        link: '',
      })
    }
  }, [task, taskListId, parentTaskId])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleAssigneeToggle = (userId) => {
    setFormData(prev => {
      const currentIds = prev.assigneeIds || []
      if (currentIds.includes(userId)) {
        return { ...prev, assigneeIds: currentIds.filter(id => id !== userId) }
      } else {
        return { ...prev, assigneeIds: [...currentIds, userId] }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = { ...formData }

      if (payload.parentId) {
        payload.parentId = parseInt(payload.parentId)
        if (payload.parentId === 0) {
          delete payload.parentId
        }
      } else {
        delete payload.parentId
      }

      payload.taskListId = parseInt(payload.taskListId)

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Link
          </label>
          <input
            type="url"
            name="link"
            value={formData.link}
            onChange={handleChange}
            placeholder="https://..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            Təyin et (bir neçə seçə bilərsiniz)
          </label>
          <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
            {users.length === 0 ? (
              <p className="text-sm text-gray-500 py-2 text-center">İstifadəçi yoxdur</p>
            ) : (
              <div className="space-y-1">
                {users.map((user) => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      formData.assigneeIds?.includes(user.id)
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.assigneeIds?.includes(user.id)}
                      onChange={() => handleAssigneeToggle(user.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{user.username}</span>
                    {user.email && (
                      <span className="text-xs text-gray-400 ml-auto">{user.email}</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
          {formData.assigneeIds?.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {formData.assigneeIds.length} istifadəçi seçildi
            </p>
          )}
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
