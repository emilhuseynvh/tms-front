import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
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
import TaskActivityTooltip from '../components/TaskActivityTooltip'
import { useConfirm } from '../context/ConfirmContext'
import { toast } from 'react-toastify'

const TaskDetail = () => {
  const { spaceId, folderId, taskListId } = useParams()
  const navigate = useNavigate()
  const { confirm } = useConfirm()
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

  // Column resize state
  const [columnWidths, setColumnWidths] = useState({
    checkbox: 48,
    title: 250,
    description: 200,
    status: 130,
    assignee: 160,
    updatedAt: 150,
    startDate: 160,
    endDate: 160,
    link: 180,
  })
  const [resizing, setResizing] = useState(null) // { column, startX, startWidth }
  const tableRef = useRef(null)

  // Filters
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { data: tasks = [], isLoading } = useGetTasksByListQuery({
    taskListId,
    search,
    startDate,
    endDate,
    statusId: statusFilter,
    assigneeId: assigneeFilter,
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
    setStatusFilter('')
    setAssigneeFilter('')
  }

  // Column resize handlers
  const handleResizeStart = (e, column) => {
    e.preventDefault()
    setResizing({
      column,
      startX: e.clientX,
      startWidth: columnWidths[column]
    })
  }

  useEffect(() => {
    if (!resizing) return

    const handleMouseMove = (e) => {
      const diff = e.clientX - resizing.startX
      const newWidth = Math.max(50, resizing.startWidth + diff) // Minimum 50px
      setColumnWidths(prev => ({
        ...prev,
        [resizing.column]: newWidth
      }))
    }

    const handleMouseUp = () => {
      setResizing(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizing])

  // Calculate total table width
  const totalTableWidth = Object.values(columnWidths).reduce((sum, w) => sum + w, 0)

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
    const confirmed = await confirm({
      title: 'Tapşırığı sil',
      message: 'Bu tapşırığı silmək istədiyinizdən əminsiniz?',
      confirmText: 'Sil',
      cancelText: 'Ləğv et',
      type: 'danger'
    })

    if (confirmed) {
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

  const handleDateChange = async (taskId, field, value) => {
    try {
      const payload = { id: taskId }
      payload[field] = value ? new Date(value).toISOString() : null
      await updateTask(payload).unwrap()
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

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '-'

    // Sadəcə Date parse et - backend timezone ilə göndərir
    const date = new Date(dateString)

    const now = new Date()
    let diff = now.getTime() - date.getTime()

    // Mənfi fərq varsa (gələcək tarix), 0 qəbul et
    if (diff < 0) diff = 0

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'İndicə'
    if (minutes < 60) return `${minutes} dəq əvvəl`
    if (hours < 24) {
      const remainingMinutes = minutes % 60
      if (remainingMinutes === 0) return `${hours} saat əvvəl`
      return `${hours}s ${remainingMinutes}dəq`
    }
    if (days < 7) {
      const remainingHours = hours % 24
      if (remainingHours === 0) return `${days} gün əvvəl`
      return `${days}g ${remainingHours}s`
    }
    if (days < 30) return `${Math.floor(days / 7)} həftə əvvəl`

    return date.toLocaleDateString('az-AZ', {
      day: 'numeric',
      month: 'short'
    })
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
    const isEditingDescription = editingField?.taskId === task.id && editingField?.field === 'description'
    const isEditingLink = editingField?.taskId === task.id && editingField?.field === 'link'

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
          <td style={{ width: columnWidths.checkbox }} className="px-2 py-2">
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
          <td style={{ width: columnWidths.title }} className="px-2 py-2">
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
          <td style={{ width: columnWidths.description }} className="px-2 py-2">
            {isEditingDescription ? (
              <textarea
                autoFocus
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => saveInlineEdit(task.id, 'description')}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    cancelEditing()
                  } else if (e.key === 'Enter' && e.ctrlKey) {
                    saveInlineEdit(task.id, 'description')
                  }
                }}
                className="w-full px-1.5 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                rows={2}
              />
            ) : (
              <div
                onClick={() => startEditing(task.id, 'description', task.description)}
                className="cursor-text hover:bg-gray-100 px-1.5 py-0.5 rounded -mx-1.5 min-h-[24px]"
                title={task.description || 'Açıqlama əlavə et'}
              >
                <div className="text-xs text-gray-600 truncate">
                  {task.description || <span className="text-gray-400 italic">Açıqlama yoxdur</span>}
                </div>
              </div>
            )}
          </td>
          <td style={{ width: columnWidths.status }} className="px-2 py-2 whitespace-nowrap">
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
          <td style={{ width: columnWidths.assignee }} className="px-2 py-2">
            <AssigneeSelector
              task={task}
              users={users}
              onUpdate={handleAssigneesChange}
            />
          </td>
          <td style={{ width: columnWidths.updatedAt }} className="px-2 py-2">
            <TaskActivityTooltip taskId={task.id}>
              <div className="flex items-center gap-1.5 cursor-pointer group">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 group-hover:from-blue-100 group-hover:to-indigo-200 transition-all duration-200 shadow-sm">
                  <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700 transition-colors">
                    {formatRelativeTime(task.updatedAt)}
                  </span>
                </div>
                <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </TaskActivityTooltip>
          </td>
          <td style={{ width: columnWidths.startDate }} className="px-2 py-2 whitespace-nowrap">
            <InlineDatePicker
              value={task.startAt}
              onChange={(value) => handleDateChange(task.id, 'startAt', value)}
              placeholder="Başlama"
            />
          </td>
          <td style={{ width: columnWidths.endDate }} className="px-2 py-2 whitespace-nowrap">
            <InlineDatePicker
              value={task.dueAt}
              onChange={(value) => handleDateChange(task.id, 'dueAt', value)}
              placeholder="Bitmə"
            />
          </td>
          <td style={{ width: columnWidths.link }} className="px-2 py-2">
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
              {(search || startDate || endDate || statusFilter || assigneeFilter) && (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-200">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Hamısı</option>
                  {statuses.map(status => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Təyin edilmiş
                </label>
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Hamısı</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name || user.username}</option>
                  ))}
                </select>
              </div>
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
            {(search || startDate || endDate || statusFilter || assigneeFilter) && (
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
          <div className={`hidden md:block bg-white rounded-lg border border-gray-200 overflow-x-auto overflow-y-visible ${resizing ? 'select-none' : ''}`}>
            <table ref={tableRef} className="table-fixed" style={{ minWidth: `${totalTableWidth}px` }}>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th style={{ width: columnWidths.checkbox }} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'checkbox')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths.title }} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    Başlıq
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'title')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths.description }} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    Açıqlama
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'description')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths.status }} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    Status
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'status')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths.assignee }} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    Təyin edilib
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'assignee')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths.updatedAt }} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    Son yenilənmə
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'updatedAt')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths.startDate }} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    Başlama
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'startDate')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths.endDate }} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    Bitmə
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'endDate')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={{ width: columnWidths.link }} className="px-2 py-2 text-left text-xs font-medium text-gray-500">
                    Link
                  </th>
                </tr>
              </thead>
              <tbody>
                {rootTasks.map((task, index) => renderTaskRow(task, 0, index))}
              </tbody>
            </table>

            {/* Add Task Row */}
            <div className="border-t border-gray-200 px-4 py-3">
              {isAddingTask ? (
                <form onSubmit={(e) => handleQuickCreate(e, parentTaskId)} className="flex items-center gap-2" style={{ marginLeft: parentTaskId ? '40px' : '0' }}>
                  {parentTaskId && (
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  )}
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
                <form onSubmit={(e) => handleQuickCreate(e, parentTaskId)} className="bg-white rounded-lg border border-gray-200 p-4" style={{ marginLeft: parentTaskId ? '24px' : '0' }}>
                  {parentTaskId && (
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                      <span>Sub-task</span>
                    </div>
                  )}
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
            <ModalDatePicker
              value={formData.startAt}
              onChange={(value) => setFormData({ ...formData, startAt: value })}
              placeholder="Başlama tarixi seç"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bitmə tarixi
            </label>
            <ModalDatePicker
              value={formData.dueAt}
              onChange={(value) => setFormData({ ...formData, dueAt: value })}
              placeholder="Bitmə tarixi seç"
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

// Modal Date Picker Component - fuller style for modals
const ModalDatePicker = ({ value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const now = new Date()
  const [selectedTime, setSelectedTime] = useState({
    hours: String(now.getHours()).padStart(2, '0'),
    minutes: String(now.getMinutes()).padStart(2, '0')
  })
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        setSelectedDate(date)
        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
        setSelectedTime({
          hours: String(date.getHours()).padStart(2, '0'),
          minutes: String(date.getMinutes()).padStart(2, '0')
        })
      }
    } else {
      setSelectedDate(null)
      const currentTime = new Date()
      setSelectedTime({
        hours: String(currentTime.getHours()).padStart(2, '0'),
        minutes: String(currentTime.getMinutes()).padStart(2, '0')
      })
    }
  }, [value])

  useEffect(() => {
    if (isOpen && !value) {
      const currentTime = new Date()
      setSelectedTime({
        hours: String(currentTime.getHours()).padStart(2, '0'),
        minutes: String(currentTime.getMinutes()).padStart(2, '0')
      })
    }
  }, [isOpen, value])

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const isMobileView = window.innerWidth < 640
      const dropdownWidth = isMobileView ? window.innerWidth - 32 : 520
      const dropdownHeight = isMobileView ? 500 : 420

      let top = rect.bottom + 4
      let left = isMobileView ? 16 : rect.left

      if (top + dropdownHeight > window.innerHeight) {
        top = Math.max(16, rect.top - dropdownHeight - 4)
      }

      if (!isMobileView && left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 16
      }

      if (left < 16) {
        left = 16
      }

      setPosition({ top, left, width: dropdownWidth })
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const getQuickOptions = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const addDays = (date, days) => {
      const result = new Date(date)
      result.setDate(result.getDate() + days)
      return result
    }

    const getNextWeekday = (dayOfWeek) => {
      const result = new Date(today)
      const currentDay = result.getDay()
      const daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7
      result.setDate(result.getDate() + daysUntil)
      return result
    }

    const formatShortDate = (date) => {
      const days = ['Baz', 'B.e', 'Ç.a', 'Çər', 'C.a', 'Cüm', 'Şən']
      const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24))
      if (diffDays < 7) {
        return days[date.getDay()]
      }
      return `${date.getDate()} ${['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'][date.getMonth()]}`
    }

    const laterToday = new Date(now)
    laterToday.setHours(20, 16, 0, 0)
    if (laterToday <= now) {
      laterToday.setDate(laterToday.getDate() + 1)
    }

    return [
      { label: 'Bugün', date: today, shortDate: formatShortDate(today) },
      { label: 'Sonra', date: laterToday, shortDate: `${laterToday.getHours()}:${String(laterToday.getMinutes()).padStart(2, '0')}` },
      { label: 'Sabah', date: addDays(today, 1), shortDate: formatShortDate(addDays(today, 1)) },
      { label: 'Bu həftə sonu', date: getNextWeekday(6), shortDate: formatShortDate(getNextWeekday(6)) },
      { label: 'Gələn həftə', date: getNextWeekday(1), shortDate: formatShortDate(getNextWeekday(1)) },
      { label: 'Gələn həftə sonu', date: addDays(getNextWeekday(6), 7), shortDate: formatShortDate(addDays(getNextWeekday(6), 7)) },
      { label: '2 həftə', date: addDays(today, 14), shortDate: formatShortDate(addDays(today, 14)) },
      { label: '4 həftə', date: addDays(today, 28), shortDate: formatShortDate(addDays(today, 28)) },
    ]
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

    const days = []

    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i)
      })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      })
    }

    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      })
    }

    return days
  }

  const isToday = (date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isPastDate = (date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  const isSelected = (date) => {
    if (!selectedDate) return false
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  const handleQuickSelect = (option) => {
    const date = new Date(option.date)
    if (option.label === 'Sonra') {
      setSelectedTime({
        hours: String(date.getHours()).padStart(2, '0'),
        minutes: String(date.getMinutes()).padStart(2, '0')
      })
    } else {
      date.setHours(parseInt(selectedTime.hours), parseInt(selectedTime.minutes), 0, 0)
    }
    setSelectedDate(date)
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    applyDate(date)
  }

  const handleDayClick = (dayInfo) => {
    if (isPastDate(dayInfo.date)) return
    const date = new Date(dayInfo.date)
    date.setHours(parseInt(selectedTime.hours), parseInt(selectedTime.minutes), 0, 0)
    setSelectedDate(date)
    if (!dayInfo.isCurrentMonth) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  const applyDate = (date) => {
    if (date) {
      const finalDate = new Date(date)
      finalDate.setHours(parseInt(selectedTime.hours), parseInt(selectedTime.minutes), 0, 0)
      // Format as ISO string with timezone offset
      const year = finalDate.getFullYear()
      const month = String(finalDate.getMonth() + 1).padStart(2, '0')
      const day = String(finalDate.getDate()).padStart(2, '0')
      const hours = String(finalDate.getHours()).padStart(2, '0')
      const minutes = String(finalDate.getMinutes()).padStart(2, '0')
      // Get timezone offset in ±HH:MM format
      const tzOffset = -finalDate.getTimezoneOffset()
      const tzSign = tzOffset >= 0 ? '+' : '-'
      const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0')
      const tzMins = String(Math.abs(tzOffset) % 60).padStart(2, '0')
      const formatted = `${year}-${month}-${day}T${hours}:${minutes}:00${tzSign}${tzHours}:${tzMins}`
      onChange(formatted)
    }
    setIsOpen(false)
  }

  const handleClear = () => {
    setSelectedDate(null)
    onChange('')
    setIsOpen(false)
  }

  const formatDisplayValue = () => {
    if (!value) return placeholder
    const date = new Date(value)
    if (isNaN(date.getTime())) return placeholder

    const day = date.getDate()
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']
    const month = months[date.getMonth()]
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${day} ${month} ${hours}:${minutes}`
  }

  const monthNames = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
    'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ]

  const dayNames = ['B.e', 'Ç.a', 'Çər', 'C.a', 'Cüm', 'Şən', 'Baz']

  const quickOptions = getQuickOptions()
  const calendarDays = getDaysInMonth(currentMonth)

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors bg-white"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={`text-sm flex-1 ${value ? 'text-gray-900' : 'text-gray-400'}`}>
          {formatDisplayValue()}
        </span>
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
            className="p-0.5 hover:bg-gray-100 rounded"
          >
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] overflow-y-auto"
          style={{ top: position.top, left: position.left, width: position.width || 520 }}
        >
          <div className="flex flex-col sm:flex-row">
            <div className="w-full sm:w-[200px] border-b sm:border-b-0 sm:border-r border-gray-100 py-2 bg-gray-50/50">
              <div className="flex flex-wrap sm:flex-col gap-1 px-2 sm:px-0">
                {quickOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickSelect(option)}
                    className="flex-1 sm:flex-none sm:w-full flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-white transition-colors whitespace-nowrap rounded sm:rounded-none"
                  >
                    <span className="text-gray-700">{option.label}</span>
                    <span className="text-gray-400 text-[10px] sm:text-xs ml-2 sm:ml-3 hidden sm:inline">{option.shortDate}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-semibold text-gray-800">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const today = new Date()
                      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                    }}
                    className="px-2 py-1 text-[10px] sm:text-xs text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Bugün
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map((day, index) => (
                  <div key={index} className="text-center text-[10px] sm:text-xs font-medium text-gray-400 py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {calendarDays.map((dayInfo, index) => {
                  const isPast = isPastDate(dayInfo.date)
                  return (
                    <button
                      key={index}
                      onClick={() => handleDayClick(dayInfo)}
                      disabled={isPast}
                      className={`
                        w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm rounded-full flex items-center justify-center transition-all
                        ${isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                        ${!dayInfo.isCurrentMonth && !isPast ? 'text-gray-300' : ''}
                        ${dayInfo.isCurrentMonth && !isPast ? 'text-gray-700' : ''}
                        ${isToday(dayInfo.date) && !isSelected(dayInfo.date) ? 'bg-red-100 text-red-600 font-medium' : ''}
                        ${isSelected(dayInfo.date) ? 'bg-blue-500 text-white font-medium' : ''}
                        ${dayInfo.isCurrentMonth && !isSelected(dayInfo.date) && !isToday(dayInfo.date) && !isPast ? 'hover:bg-gray-100' : ''}
                      `}
                    >
                      {dayInfo.day}
                    </button>
                  )
                })}
              </div>

              {selectedDate && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] sm:text-xs text-gray-500">
                      {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={selectedTime.hours}
                        onChange={(e) => setSelectedTime({ ...selectedTime, hours: e.target.value.padStart(2, '0') })}
                        className="w-10 px-1 py-1 text-xs text-center border border-gray-200 rounded"
                      />
                      <span className="text-gray-400">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={selectedTime.minutes}
                        onChange={(e) => setSelectedTime({ ...selectedTime, minutes: e.target.value.padStart(2, '0') })}
                        className="w-10 px-1 py-1 text-xs text-center border border-gray-200 rounded"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClear}
                      className="flex-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Təmizlə
                    </button>
                    <button
                      onClick={() => applyDate(selectedDate)}
                      className="flex-1 px-3 py-1.5 text-xs text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                    >
                      Təsdiqlə
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// Inline Date Picker Component for table cells
const InlineDatePicker = ({ value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const now = new Date()
  const [selectedTime, setSelectedTime] = useState({
    hours: String(now.getHours()).padStart(2, '0'),
    minutes: String(now.getMinutes()).padStart(2, '0')
  })
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)

  // Parse initial value
  useEffect(() => {
    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        setSelectedDate(date)
        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
        setSelectedTime({
          hours: String(date.getHours()).padStart(2, '0'),
          minutes: String(date.getMinutes()).padStart(2, '0')
        })
      }
    } else {
      setSelectedDate(null)
      const currentTime = new Date()
      setSelectedTime({
        hours: String(currentTime.getHours()).padStart(2, '0'),
        minutes: String(currentTime.getMinutes()).padStart(2, '0')
      })
    }
  }, [value])

  useEffect(() => {
    if (isOpen && !value) {
      const currentTime = new Date()
      setSelectedTime({
        hours: String(currentTime.getHours()).padStart(2, '0'),
        minutes: String(currentTime.getMinutes()).padStart(2, '0')
      })
    }
  }, [isOpen, value])

  // Position dropdown
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const isMobileView = window.innerWidth < 640
      const dropdownWidth = isMobileView ? window.innerWidth - 32 : 520
      const dropdownHeight = isMobileView ? 500 : 420

      let top = rect.bottom + 4
      let left = isMobileView ? 16 : rect.left

      if (top + dropdownHeight > window.innerHeight) {
        top = Math.max(16, rect.top - dropdownHeight - 4)
      }

      if (!isMobileView && left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 16
      }

      if (left < 16) {
        left = 16
      }

      setPosition({ top, left, width: dropdownWidth })
    }
  }, [isOpen])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const getQuickOptions = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const addDays = (date, days) => {
      const result = new Date(date)
      result.setDate(result.getDate() + days)
      return result
    }

    const getNextWeekday = (dayOfWeek) => {
      const result = new Date(today)
      const currentDay = result.getDay()
      const daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7
      result.setDate(result.getDate() + daysUntil)
      return result
    }

    const formatShortDate = (date) => {
      const days = ['Baz', 'B.e', 'Ç.a', 'Çər', 'C.a', 'Cüm', 'Şən']
      const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24))
      if (diffDays < 7) {
        return days[date.getDay()]
      }
      return `${date.getDate()} ${['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'][date.getMonth()]}`
    }

    const laterToday = new Date(now)
    laterToday.setHours(20, 16, 0, 0)
    if (laterToday <= now) {
      laterToday.setDate(laterToday.getDate() + 1)
    }

    return [
      { label: 'Bugün', date: today, shortDate: formatShortDate(today) },
      { label: 'Sonra', date: laterToday, shortDate: `${laterToday.getHours()}:${String(laterToday.getMinutes()).padStart(2, '0')}` },
      { label: 'Sabah', date: addDays(today, 1), shortDate: formatShortDate(addDays(today, 1)) },
      { label: 'Bu həftə sonu', date: getNextWeekday(6), shortDate: formatShortDate(getNextWeekday(6)) },
      { label: 'Gələn həftə', date: getNextWeekday(1), shortDate: formatShortDate(getNextWeekday(1)) },
      { label: 'Gələn həftə sonu', date: addDays(getNextWeekday(6), 7), shortDate: formatShortDate(addDays(getNextWeekday(6), 7)) },
      { label: '2 həftə', date: addDays(today, 14), shortDate: formatShortDate(addDays(today, 14)) },
      { label: '4 həftə', date: addDays(today, 28), shortDate: formatShortDate(addDays(today, 28)) },
    ]
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

    const days = []

    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i)
      })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      })
    }

    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      })
    }

    return days
  }

  const isToday = (date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isPastDate = (date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  const isSelected = (date) => {
    if (!selectedDate) return false
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  const handleQuickSelect = (option) => {
    const date = new Date(option.date)
    if (option.label === 'Sonra') {
      setSelectedTime({
        hours: String(date.getHours()).padStart(2, '0'),
        minutes: String(date.getMinutes()).padStart(2, '0')
      })
    } else {
      date.setHours(parseInt(selectedTime.hours), parseInt(selectedTime.minutes), 0, 0)
    }
    setSelectedDate(date)
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    applyDate(date)
  }

  const handleDayClick = (dayInfo) => {
    if (isPastDate(dayInfo.date)) return
    const date = new Date(dayInfo.date)
    date.setHours(parseInt(selectedTime.hours), parseInt(selectedTime.minutes), 0, 0)
    setSelectedDate(date)
    if (!dayInfo.isCurrentMonth) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  const applyDate = (date) => {
    if (date) {
      const finalDate = new Date(date)
      finalDate.setHours(parseInt(selectedTime.hours), parseInt(selectedTime.minutes), 0, 0)
      // Format as ISO string with timezone offset
      const year = finalDate.getFullYear()
      const month = String(finalDate.getMonth() + 1).padStart(2, '0')
      const day = String(finalDate.getDate()).padStart(2, '0')
      const hours = String(finalDate.getHours()).padStart(2, '0')
      const minutes = String(finalDate.getMinutes()).padStart(2, '0')
      // Get timezone offset in ±HH:MM format
      const tzOffset = -finalDate.getTimezoneOffset()
      const tzSign = tzOffset >= 0 ? '+' : '-'
      const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0')
      const tzMins = String(Math.abs(tzOffset) % 60).padStart(2, '0')
      const formatted = `${year}-${month}-${day}T${hours}:${minutes}:00${tzSign}${tzHours}:${tzMins}`
      onChange(formatted)
    }
    setIsOpen(false)
  }

  const handleClear = () => {
    setSelectedDate(null)
    onChange('')
    setIsOpen(false)
  }

  const formatDisplayValue = () => {
    if (!value) return placeholder
    const date = new Date(value)
    if (isNaN(date.getTime())) return placeholder

    const day = date.getDate()
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']
    const month = months[date.getMonth()]
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${day} ${month} ${hours}:${minutes}`
  }

  const monthNames = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
    'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ]

  const dayNames = ['B.e', 'Ç.a', 'Çər', 'C.a', 'Cüm', 'Şən', 'Baz']

  const quickOptions = getQuickOptions()
  const calendarDays = getDaysInMonth(currentMonth)

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
      >
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={`text-xs ${value ? 'text-gray-700' : 'text-gray-400'}`}>
          {formatDisplayValue()}
        </span>
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] overflow-y-auto"
          style={{ top: position.top, left: position.left, width: position.width || 520 }}
        >
          <div className="flex flex-col sm:flex-row">
            {/* Left - Quick options */}
            <div className="w-full sm:w-[200px] border-b sm:border-b-0 sm:border-r border-gray-100 py-2 bg-gray-50/50">
              <div className="flex flex-wrap sm:flex-col gap-1 px-2 sm:px-0">
                {quickOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickSelect(option)}
                    className="flex-1 sm:flex-none sm:w-full flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-white transition-colors whitespace-nowrap rounded sm:rounded-none"
                  >
                    <span className="text-gray-700">{option.label}</span>
                    <span className="text-gray-400 text-[10px] sm:text-xs ml-2 sm:ml-3 hidden sm:inline">{option.shortDate}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right - Calendar */}
            <div className="flex-1 p-3 sm:p-4">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-semibold text-gray-800">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const today = new Date()
                      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                    }}
                    className="px-2 py-1 text-[10px] sm:text-xs text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Bugün
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map((day, index) => (
                  <div key={index} className="text-center text-[10px] sm:text-xs font-medium text-gray-400 py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {calendarDays.map((dayInfo, index) => {
                  const isPast = isPastDate(dayInfo.date)
                  return (
                    <button
                      key={index}
                      onClick={() => handleDayClick(dayInfo)}
                      disabled={isPast}
                      className={`
                        w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm rounded-full flex items-center justify-center transition-all
                        ${isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                        ${!dayInfo.isCurrentMonth && !isPast ? 'text-gray-300' : ''}
                        ${dayInfo.isCurrentMonth && !isPast ? 'text-gray-700' : ''}
                        ${isToday(dayInfo.date) && !isSelected(dayInfo.date) ? 'bg-red-100 text-red-600 font-medium' : ''}
                        ${isSelected(dayInfo.date) ? 'bg-blue-500 text-white font-medium' : ''}
                        ${dayInfo.isCurrentMonth && !isSelected(dayInfo.date) && !isToday(dayInfo.date) && !isPast ? 'hover:bg-gray-100' : ''}
                      `}
                    >
                      {dayInfo.day}
                    </button>
                  )
                })}
              </div>

              {/* Time & Actions */}
              {selectedDate && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] sm:text-xs text-gray-500">
                      {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={selectedTime.hours}
                        onChange={(e) => setSelectedTime({ ...selectedTime, hours: e.target.value.padStart(2, '0') })}
                        className="w-10 px-1 py-1 text-xs text-center border border-gray-200 rounded"
                      />
                      <span className="text-gray-400">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={selectedTime.minutes}
                        onChange={(e) => setSelectedTime({ ...selectedTime, minutes: e.target.value.padStart(2, '0') })}
                        className="w-10 px-1 py-1 text-xs text-center border border-gray-200 rounded"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClear}
                      className="flex-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Təmizlə
                    </button>
                    <button
                      onClick={() => applyDate(selectedDate)}
                      className="flex-1 px-3 py-1.5 text-xs text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                    >
                      Təsdiqlə
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default TaskDetail
