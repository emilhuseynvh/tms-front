import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router'
import { useDispatch } from 'react-redux'
import {
  useGetTasksByListQuery,
  useGetUsersQuery,
  useGetTaskStatusesQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useReorderTaskMutation,
  useGetTaskListQuery,
  useUpdateTaskListMutation,
  useDeleteTaskListMutation,
  useArchiveListMutation,
  useArchiveTaskMutation,
  adminApi,
} from '../services/adminApi'
import Modal from '../components/Modal'
import TaskActivityTooltip from '../components/TaskActivityTooltip'
import { useConfirm } from '../context/ConfirmContext'
import { toast } from 'react-toastify'

const TaskDetail = () => {
  const { spaceId, folderId, taskListId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { confirm } = useConfirm()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [parentTaskId, setParentTaskId] = useState(null)
  const [draggedTask, setDraggedTask] = useState(null)
  const [expandedTasks, setExpandedTasks] = useState(new Set())
  const [hoveredTaskId, setHoveredTaskId] = useState(null)
  const [actionMenuPosition, setActionMenuPosition] = useState(null)
  const hoverTimeoutRef = useRef(null)
  const actionMenuRef = useRef(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [editingField, setEditingField] = useState(null) // {taskId, field}
  const [editingValue, setEditingValue] = useState('')
  const newTaskInputRef = useRef(null)

  // Column resize state
  const [columnWidths, setColumnWidths] = useState({
    checkbox: 48,
    title: 400,
    description: 200,
    status: 130,
    assignee: 160,
    updatedAt: 150,
    startDate: 160,
    endDate: 160,
    link: 180,
    doc: 200,
    meetingNotes: 200,
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

  const { data: tasks = [], isLoading, refetch: refetchTasks } = useGetTasksByListQuery({
    taskListId,
    search,
    startDate,
    endDate,
    statusId: statusFilter,
    assigneeId: assigneeFilter,
  })
  const { data: taskListData } = useGetTaskListQuery(taskListId)
  const { data: users = [] } = useGetUsersQuery()
  const { data: statuses = [] } = useGetTaskStatusesQuery()
  const [createTask] = useCreateTaskMutation()
  const [updateTask] = useUpdateTaskMutation()
  const [deleteTask] = useDeleteTaskMutation()
  const [reorderTask] = useReorderTaskMutation()
  const [updateTaskList] = useUpdateTaskListMutation()
  const [deleteTaskList] = useDeleteTaskListMutation()
  const [archiveList] = useArchiveListMutation()
  const [archiveTask] = useArchiveTaskMutation()

  // Selected tasks state
  const [selectedTasks, setSelectedTasks] = useState(new Set())

  // Task List edit state
  const [isEditingTaskList, setIsEditingTaskList] = useState(false)
  const [taskListForm, setTaskListForm] = useState({ name: '' })

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
      e.preventDefault()
      const diff = e.clientX - resizing.startX
      const newWidth = Math.max(50, resizing.startWidth + diff) // Minimum 50px
      setColumnWidths(prev => ({
        ...prev,
        [resizing.column]: newWidth
      }))
    }

    const handleMouseUp = (e) => {
      e.preventDefault()
      setResizing(null)
    }

    // Use capture phase to ensure events are handled
    document.addEventListener('mousemove', handleMouseMove, true)
    document.addEventListener('mouseup', handleMouseUp, true)
    // Prevent text selection during resize
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true)
      document.removeEventListener('mouseup', handleMouseUp, true)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [resizing])

  // Calculate total table width
  const totalTableWidth = Object.values(columnWidths).reduce((sum, w) => sum + w, 0)

  // Helper function to get column style
  const getColumnStyle = (columnName) => ({
    width: `${columnWidths[columnName]}px`,
    minWidth: `${columnWidths[columnName]}px`,
    maxWidth: `${columnWidths[columnName]}px`
  })

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

  // Task List handlers
  const handleOpenTaskListEdit = () => {
    setTaskListForm({ name: taskListData?.name || '' })
    setIsEditingTaskList(true)
  }

  const handleCloseTaskListEdit = () => {
    setIsEditingTaskList(false)
    setTaskListForm({ name: '' })
  }

  const handleUpdateTaskList = async (e) => {
    e.preventDefault()
    try {
      await updateTaskList({ id: parseInt(taskListId), ...taskListForm }).unwrap()
      toast.success('Siyahı yeniləndi!')
      handleCloseTaskListEdit()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const handleDeleteTaskList = async () => {
    const confirmed = await confirm({
      title: 'Siyahını sil',
      message: 'Bu siyahını silmək istədiyinizdən əminsiniz?',
      confirmText: 'Sil',
      cancelText: 'Ləğv et',
      type: 'danger'
    })

    if (confirmed) {
      try {
        await deleteTaskList(parseInt(taskListId)).unwrap()
        toast.success('Siyahı silindi!')
        if (folderId) {
          navigate(`/tasks/space/${spaceId}/folder/${folderId}`)
        } else {
          navigate(`/tasks/space/${spaceId}`)
        }
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  const handleArchiveTaskList = async () => {
    try {
      await archiveList(parseInt(taskListId)).unwrap()
      toast.success('Siyahı arxivə əlavə edildi!')
      if (folderId) {
        navigate(`/tasks/space/${spaceId}/folder/${folderId}`)
      } else {
        navigate(`/tasks/space/${spaceId}`)
      }
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
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
        // Parent task-ı açıq saxla ki, yeni subtask görünsün
        setExpandedTasks(prev => {
          const newSet = new Set(prev)
          newSet.add(parentId)
          return newSet
        })
      }
      const newTask = await createTask(payload).unwrap()
      // Yeni task-ı da avtomatik aç
      if (newTask?.id) {
        setExpandedTasks(prev => {
          const newSet = new Set(prev)
          newSet.add(newTask.id)
          return newSet
        })
      }
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
      } else if (field === 'doc') {
        payload.doc = editingValue
      } else if (field === 'meetingNotes') {
        payload.meetingNotes = editingValue
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

  // Hover handlers with delay for action buttons
  const handleTaskMouseEnter = (e, taskId, task, indent) => {
    // Əgər artıq action menu açıqdırsa və fərqli task-a hover edirik, delay ilə dəyişdir
    if (hoveredTaskId && hoveredTaskId !== taskId) {
      // Əvvəlki timeout-u ləğv et
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      // Yeni task-a keçməzdən əvvəl delay ver ki, action menu-ya keçmək mümkün olsun
      hoverTimeoutRef.current = setTimeout(() => {
        updateHoverState(e, taskId, task, indent)
      }, 100)
      return
    }

    // İlk hover və ya eyni task-a hover
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    updateHoverState(e, taskId, task, indent)
  }

  const updateHoverState = (e, taskId, task, indent) => {
    setHoveredTaskId(taskId)
    // Pozisiyanı hesabla - title td-nin rect-ini tap
    const tr = e.currentTarget || e.target?.closest('tr')
    if (!tr) return
    const titleTd = tr.querySelector('td:nth-child(2)')
    if (titleTd) {
      const tdRect = titleTd.getBoundingClientRect()
      const titleDiv = titleTd.querySelector('.flex-1')
      const titleWidth = titleDiv ? titleDiv.getBoundingClientRect().width : 0
      const actionMenuWidth = task.parentId ? 120 : 90 // Təxmini genişlik
      const availableSpace = tdRect.right - tdRect.left - indent - titleWidth - 20
      const showInline = availableSpace >= actionMenuWidth

      setActionMenuPosition({
        top: tdRect.bottom + 2,
        left: tdRect.left + indent + 8,
        task,
        indent,
        showInline,
        inlineRight: tdRect.right - 8,
        inlineTop: tdRect.top + (tdRect.height / 2)
      })
    }
  }

  const handleTaskMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTaskId(null)
      setActionMenuPosition(null)
    }, 300) // 300ms delay - action menu-ya keçmək üçün kifayət
  }

  const handleActionMenuMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }

  const handleActionMenuMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTaskId(null)
      setActionMenuPosition(null)
    }, 150)
  }

  // Drag and Drop handlers
  const [dropTarget, setDropTarget] = useState(null) // { taskId, type: 'above' | 'below' | 'inside' }

  const handleDragStart = (e, task, index) => {
    setDraggedTask({ task, index })
    e.dataTransfer.effectAllowed = 'move'
    // Sidebar-a drag üçün task məlumatını əlavə et
    e.dataTransfer.setData('application/task', JSON.stringify({ type: 'task', task: { id: task.id, title: task.title } }))
  }

  const handleDragOver = (e, targetTask) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'

    if (!draggedTask || draggedTask.task.id === targetTask?.id) {
      setDropTarget(null)
      return
    }

    // Prevent dropping a parent into its own children
    const isDescendant = (parentTask, childId) => {
      if (!parentTask.children) return false
      for (const child of parentTask.children) {
        if (child.id === childId) return true
        if (isDescendant(child, childId)) return true
      }
      return false
    }

    if (targetTask && isDescendant(draggedTask.task, targetTask.id)) {
      setDropTarget(null)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    // Top 25% = above, Bottom 25% = below, Middle 50% = inside (subtask)
    let type = 'inside'
    if (y < height * 0.25) {
      type = 'above'
    } else if (y > height * 0.75) {
      type = 'below'
    }

    setDropTarget({ taskId: targetTask?.id, type })
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    // Only clear if we're leaving the actual element, not entering a child
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget(null)
    }
  }

  const handleDrop = async (e, targetTask, targetIndex) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedTask) {
      setDraggedTask(null)
      setDropTarget(null)
      return
    }

    // Prevent dropping on itself
    if (draggedTask.task.id === targetTask?.id) {
      setDraggedTask(null)
      setDropTarget(null)
      return
    }

    try {
      if (dropTarget?.type === 'inside' && targetTask) {
        // Make it a subtask of the target
        await updateTask({
          id: draggedTask.task.id,
          parentId: targetTask.id
        }).unwrap()
        toast.success('Tapşırıq alt tapşırıq olaraq əlavə edildi')
      } else if (dropTarget?.type === 'above' || dropTarget?.type === 'below') {
        // If dragged task has a parent but target doesn't (or has different parent), move to root
        if (draggedTask.task.parentId && (!targetTask?.parentId || draggedTask.task.parentId !== targetTask?.parentId)) {
          await updateTask({
            id: draggedTask.task.id,
            parentId: null
          }).unwrap()
        }
        // Reorder
        await reorderTask({
          taskId: draggedTask.task.id,
          targetIndex: dropTarget?.type === 'below' ? targetIndex + 1 : targetIndex,
        }).unwrap()
      } else {
        // Default reorder behavior
        await reorderTask({
          taskId: draggedTask.task.id,
          targetIndex: targetIndex,
        }).unwrap()
      }
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }

    setDraggedTask(null)
    setDropTarget(null)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
    setDropTarget(null)
  }

  // Make a subtask a root task (remove from parent)
  const handleMakeRootTask = async (taskId) => {
    try {
      await updateTask({
        id: taskId,
        parentId: null
      }).unwrap()
      toast.success('Tapşırıq əsas tapşırığa çevrildi')
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  // Get all task IDs recursively (including children)
  const getAllTaskIds = (taskList) => {
    const ids = []
    for (const task of taskList) {
      ids.push(task.id)
      if (task.children && task.children.length > 0) {
        ids.push(...getAllTaskIds(task.children))
      }
    }
    return ids
  }

  // Task selection handlers
  const handleTaskSelect = (taskId, checked) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(taskId)
      } else {
        newSet.delete(taskId)
      }
      return newSet
    })
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = getAllTaskIds(tasks)
      setSelectedTasks(new Set(allIds))
    } else {
      setSelectedTasks(new Set())
    }
  }

  const isAllSelected = useMemo(() => {
    if (tasks.length === 0) return false
    const allIds = getAllTaskIds(tasks)
    return allIds.length > 0 && allIds.every(id => selectedTasks.has(id))
  }, [tasks, selectedTasks])

  const isIndeterminate = useMemo(() => {
    if (tasks.length === 0) return false
    const allIds = getAllTaskIds(tasks)
    return allIds.some(id => selectedTasks.has(id)) && !allIds.every(id => selectedTasks.has(id))
  }, [tasks, selectedTasks])

  // Bulk archive tasks
  const handleBulkArchive = async () => {
    if (selectedTasks.size === 0) return

    const confirmed = await confirm({
      title: 'Tapşırıqları arxivlə',
      message: `${selectedTasks.size} tapşırığı arxivləmək istədiyinizdən əminsiniz?`,
      confirmText: 'Arxivlə',
      cancelText: 'Ləğv et',
      type: 'warning'
    })

    if (!confirmed) return

    try {
      const taskIds = Array.from(selectedTasks)
      const promises = taskIds.map(taskId => archiveTask(taskId).unwrap())
      await Promise.all(promises)
      
      // Clear selection first
      setSelectedTasks(new Set())
      
      // Invalidate cache to mark all Tasks queries as stale
      dispatch(adminApi.util.invalidateTags(['Tasks']))
      
      // Force refetch the current query
      await refetchTasks()
      
      toast.success(`${taskIds.length} tapşırıq arxivləndi!`)
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  // Bulk delete tasks
  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return

    const confirmed = await confirm({
      title: 'Tapşırıqları sil',
      message: `${selectedTasks.size} tapşırığı silmək istədiyinizdən əminsiniz? Bu əməliyyat geri alına bilməz!`,
      confirmText: 'Sil',
      cancelText: 'Ləğv et',
      type: 'danger'
    })

    if (!confirmed) return

    try {
      const taskIds = Array.from(selectedTasks)
      const promises = taskIds.map(taskId => deleteTask(taskId).unwrap())
      await Promise.all(promises)
      toast.success(`${taskIds.length} tapşırıq silindi!`)
      setSelectedTasks(new Set())
      // Manually refetch to ensure UI updates immediately
      await refetchTasks()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  // Bulk copy tasks
  const handleBulkCopy = async () => {
    if (selectedTasks.size === 0) return

    try {
      let successCount = 0
      let errorCount = 0

      for (const taskId of selectedTasks) {
        const task = findTaskById(tasks, taskId)
        if (!task) {
          errorCount++
          continue
        }

        try {
          const payload = {
            title: `${task.title} (kopya)`,
            description: task.description || '',
            taskListId: parseInt(taskListId),
            statusId: task.statusId || null,
            startAt: task.startAt ? new Date(task.startAt).toISOString() : new Date().toISOString(),
            dueAt: task.dueAt ? new Date(task.dueAt).toISOString() : null,
            link: task.link || null,
            doc: task.doc || null,
            meetingNotes: task.meetingNotes || null,
            assigneeIds: task.assignees?.map(a => a.id) || [],
            parentId: task.parentId || null,
          }

          await createTask(payload).unwrap()
          successCount++
        } catch (error) {
          errorCount++
          console.error(`Failed to copy task ${taskId}:`, error)
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} tapşırıq kopyalandı!`)
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} tapşırıq kopyalanarkən xəta baş verdi!`)
      }
      setSelectedTasks(new Set())
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
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

  // Bütün taskları (subtasklar daxil) avtomatik aç
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      // Recursive funksiya: bütün task ID-lərini topla
      const getAllTaskIds = (taskList) => {
        const ids = []
        for (const task of taskList) {
          ids.push(task.id)
          if (task.children && task.children.length > 0) {
            ids.push(...getAllTaskIds(task.children))
          }
        }
        return ids
      }

      const allTaskIds = getAllTaskIds(tasks)
      setExpandedTasks(prev => {
        const newSet = new Set(prev)
        allTaskIds.forEach(id => newSet.add(id))
        return newSet
      })
    }
  }, [tasks])

  // Recursive function to render task rows
  const renderTaskRow = (task, depth = 0, index = 0) => {
    const indent = depth * 20
    const hasChildren = task.children && task.children.length > 0
    const isExpanded = expandedTasks.has(task.id)
    const isHovered = hoveredTaskId === task.id
    const isEditingTitle = editingField?.taskId === task.id && editingField?.field === 'title'
    const isEditingDescription = editingField?.taskId === task.id && editingField?.field === 'description'
    const isEditingLink = editingField?.taskId === task.id && editingField?.field === 'link'

    // Determine drop indicator classes
    const isDropTarget = dropTarget?.taskId === task.id
    const dropIndicatorClass = isDropTarget
      ? dropTarget.type === 'above'
        ? 'border-t-2 border-t-blue-500'
        : dropTarget.type === 'below'
        ? 'border-b-2 border-b-blue-500'
        : 'bg-blue-50 ring-2 ring-blue-400 ring-inset'
      : ''

    return (
      <>
        <tr
          key={task.id}
          draggable
          onDragStart={(e) => handleDragStart(e, task, index)}
          onDragOver={(e) => handleDragOver(e, task)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, task, index)}
          onDragEnd={handleDragEnd}
          onMouseEnter={(e) => handleTaskMouseEnter(e, task.id, task, indent)}
          onMouseLeave={handleTaskMouseLeave}
          className={`hover:bg-gray-50 transition-colors cursor-move border-b border-gray-200 ${
            draggedTask?.task.id === task.id ? 'opacity-50' : ''
          } ${dropIndicatorClass}`}
        >
          <td style={getColumnStyle('checkbox')} className="px-2 py-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedTasks.has(task.id)}
                onChange={(e) => {
                  e.stopPropagation()
                  handleTaskSelect(task.id, e.target.checked)
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
              />
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleTask(task.id)
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
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
                <div className="w-4 flex-shrink-0" />
              )}
            </div>
          </td>
          <td style={getColumnStyle('title')} className="px-2 py-2 relative">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${indent}px` }}>
              {/* Sub-task indicator */}
              {depth > 0 && (
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
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
                    onClick={() => handleOpenModal(task)}
                    className="cursor-pointer hover:bg-gray-100 px-1.5 py-0.5 rounded -mx-1.5 truncate"
                  >
                    <span className="text-sm font-medium text-gray-900 hover:text-blue-600">{task.title}</span>
                  </div>
                )}
              </div>
            </div>
          </td>
          <td style={getColumnStyle('description')} className="px-2 py-2">
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
          <td style={getColumnStyle('status')} className="px-2 py-2 whitespace-nowrap">
            <select
              value={task.statusId || ''}
              onChange={(e) => handleStatusChange(task.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="text-xs border border-gray-200 rounded px-1.5 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-gray-300 w-full"
              style={task.status ? { backgroundColor: task.status.color + '20', color: task.status.color } : {}}
            >
              <option value="">Status</option>
              {statuses.map(status => (
                <option key={status.id} value={status.id}>{status.name}</option>
              ))}
            </select>
          </td>
          <td style={getColumnStyle('assignee')} className="px-2 py-2 overflow-hidden">
            <div className="min-w-0">
              <AssigneeSelector
                task={task}
                users={users}
                onUpdate={handleAssigneesChange}
              />
            </div>
          </td>
          <td style={getColumnStyle('updatedAt')} className="px-2 py-2">
            <TaskActivityTooltip taskId={task.id}>
              <div className="flex items-center gap-1.5 cursor-pointer group">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 group-hover:from-blue-100 group-hover:to-indigo-200 transition-all duration-200 shadow-sm">
                  <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700 transition-colors truncate">
                    {formatRelativeTime(task.updatedAt)}
                  </span>
                </div>
                <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </TaskActivityTooltip>
          </td>
          <td style={getColumnStyle('startDate')} className="px-2 py-2 whitespace-nowrap">
            <InlineDatePicker
              value={task.startAt}
              onChange={(value) => handleDateChange(task.id, 'startAt', value)}
              placeholder="Başlama"
            />
          </td>
          <td style={getColumnStyle('endDate')} className="px-2 py-2 whitespace-nowrap">
            <InlineDatePicker
              value={task.dueAt}
              onChange={(value) => handleDateChange(task.id, 'dueAt', value)}
              placeholder="Bitmə"
            />
          </td>
          <td style={getColumnStyle('link')} className="px-2 py-2">
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
                    className="text-xs text-blue-600 hover:underline truncate block"
                  >
                    {task.link}
                  </a>
                ) : (
                  <span className="text-xs text-gray-300">-</span>
                )}
              </div>
            )}
          </td>
          <td style={getColumnStyle('doc')} className="px-2 py-2">
            {editingField?.taskId === task.id && editingField?.field === 'doc' ? (
              <textarea
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => saveInlineEdit(task.id, 'doc')}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditingField(null)
                    setEditingValue('')
                  }
                }}
                autoFocus
                rows={2}
                placeholder="Doc..."
                className="w-full text-xs border border-blue-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            ) : (
              <div
                onClick={() => startEditing(task.id, 'doc', task.doc)}
                className="cursor-text hover:bg-gray-100 px-1.5 py-1 rounded"
              >
                {task.doc ? (
                  <span className="text-xs text-gray-700 line-clamp-2">{task.doc}</span>
                ) : (
                  <span className="text-xs text-gray-300">-</span>
                )}
              </div>
            )}
          </td>
          <td style={getColumnStyle('meetingNotes')} className="px-2 py-2">
            {editingField?.taskId === task.id && editingField?.field === 'meetingNotes' ? (
              <textarea
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => saveInlineEdit(task.id, 'meetingNotes')}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditingField(null)
                    setEditingValue('')
                  }
                }}
                autoFocus
                rows={2}
                placeholder="Meeting Notes..."
                className="w-full text-xs border border-blue-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            ) : (
              <div
                onClick={() => startEditing(task.id, 'meetingNotes', task.meetingNotes)}
                className="cursor-text hover:bg-gray-100 px-1.5 py-1 rounded"
              >
                {task.meetingNotes ? (
                  <span className="text-xs text-gray-700 line-clamp-2">{task.meetingNotes}</span>
                ) : (
                  <span className="text-xs text-gray-300">-</span>
                )}
              </div>
            )}
          </td>
        </tr>
        {/* Sub-task input row - shows when adding sub-task to this task */}
        {isAddingTask && parentTaskId === task.id && (
          <tr className="bg-blue-50 border-b border-blue-200">
            <td colSpan={11} className="px-4 py-3">
              <form onSubmit={(e) => handleQuickCreate(e, parentTaskId)} className="flex items-center gap-2 max-w-xl" style={{ marginLeft: `${(depth + 1) * 20}px` }}>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
                <input
                  ref={newTaskInputRef}
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Sub-task adı..."
                  className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
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
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
                >
                  Ləğv et
                </button>
              </form>
            </td>
          </tr>
        )}
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
              <input
                type="checkbox"
                checked={selectedTasks.has(task.id)}
                onChange={(e) => {
                  e.stopPropagation()
                  handleTaskSelect(task.id, e.target.checked)
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                {/* Sub-task indicator */}
                {depth > 0 && (
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <h3
                  className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                  onClick={() => handleOpenModal(task)}
                >
                  {task.title}
                </h3>
              </div>
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

  // Action menu portal component
  const ActionMenuPortal = () => {
    if (!actionMenuPosition || !hoveredTaskId) return null
    const task = actionMenuPosition.task
    const { showInline, inlineRight, inlineTop, top, left } = actionMenuPosition

    // Inline göstəriləcəksə - sağda, deyilsə - altda
    const style = showInline
      ? { top: inlineTop, left: inlineRight, transform: 'translate(-100%, -50%)' }
      : { top, left }

    return createPortal(
      <div
        ref={actionMenuRef}
        className={`fixed flex items-center gap-0.5 bg-white shadow-lg rounded-md px-1 py-0.5 z-50 border border-gray-200`}
        style={style}
        onMouseEnter={handleActionMenuMouseEnter}
        onMouseLeave={handleActionMenuMouseLeave}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            setParentTaskId(task.id)
            setIsAddingTask(true)
            setHoveredTaskId(null)
            setActionMenuPosition(null)
          }}
          className="p-1 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-50"
          title="Sub-task əlavə et"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        {task.parentId && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleMakeRootTask(task.id)
              setHoveredTaskId(null)
              setActionMenuPosition(null)
            }}
            className="p-1 rounded text-orange-500 hover:text-orange-700 hover:bg-orange-50"
            title="Əsas tapşırığa çevir"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            startEditing(task.id, 'title', task.title)
            setHoveredTaskId(null)
            setActionMenuPosition(null)
          }}
          className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
          title="Adını dəyiş"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDelete(task.id)
            setHoveredTaskId(null)
            setActionMenuPosition(null)
          }}
          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
          title="Sil"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>,
      document.body
    )
  }

  return (
    <>
      <ActionMenuPortal />
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
            <div className="flex items-center gap-2">
              {/* Breadcrumb */}
              <nav className="flex items-center text-sm md:text-base">
                {(taskListData?.folder?.space || taskListData?.space) && (
                  <>
                    <span className="text-gray-500 font-medium">
                      {taskListData?.folder?.space?.name || taskListData?.space?.name}
                    </span>
                    <svg className="w-4 h-4 mx-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
                {taskListData?.folder && (
                  <>
                    <span className="text-gray-500 font-medium">
                      {taskListData.folder.name}
                    </span>
                    <svg className="w-4 h-4 mx-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
                <span className="text-gray-900 font-semibold">
                  {taskListData?.name || 'Siyahı'}
                </span>
              </nav>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={handleOpenTaskListEdit}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Redaktə et"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleArchiveTaskList}
                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                  title="Arxivə at"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTaskList}
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
          {/* Bulk Actions Toolbar */}
          {selectedTasks.size > 0 && (
            <div className="hidden md:flex items-center gap-3 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-gray-700">
                {selectedTasks.size} tapşırıq seçildi
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={handleBulkArchive}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Arxivlə
                </button>
                <button
                  onClick={handleBulkCopy}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Kopyala
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Sil
                </button>
                <button
                  onClick={() => setSelectedTasks(new Set())}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Ləğv et
                </button>
              </div>
            </div>
          )}

          {/* Desktop Table View */}
          <div className={`hidden md:block bg-white rounded-lg border border-gray-200 overflow-x-auto overflow-y-visible ${resizing ? 'select-none' : ''}`}>
            <table ref={tableRef} className="table-auto" style={{ width: `${totalTableWidth}px`, tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th style={getColumnStyle('checkbox')} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isIndeterminate
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'checkbox')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={getColumnStyle('title')} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    <div className="truncate">Başlıq</div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'title')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={getColumnStyle('description')} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    <div className="truncate">Açıqlama</div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'description')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={getColumnStyle('status')} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    <div className="truncate">Status</div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'status')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={getColumnStyle('assignee')} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    <div className="truncate">Təyin edilib</div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'assignee')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={getColumnStyle('updatedAt')} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    <div className="truncate">Son yenilənmə</div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'updatedAt')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={getColumnStyle('startDate')} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    <div className="truncate">Başlama</div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'startDate')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={getColumnStyle('endDate')} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    <div className="truncate">Bitmə</div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'endDate')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={getColumnStyle('link')} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    <div className="truncate">Link</div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'link')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={getColumnStyle('doc')} className="px-2 py-2 text-left text-xs font-medium text-gray-500 relative">
                    <div className="truncate">Doc</div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
                      onMouseDown={(e) => handleResizeStart(e, 'doc')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                  <th style={getColumnStyle('meetingNotes')} className="px-2 py-2 text-left text-xs font-medium text-gray-500">
                    <div className="truncate">Meeting Notes</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rootTasks.map((task, index) => renderTaskRow(task, 0, index))}
              </tbody>
            </table>

            {/* Add Task Row - only show when not adding sub-task */}
            {!parentTaskId && (
              <div className="border-t border-gray-200 px-4 py-3">
                {isAddingTask ? (
                  <form onSubmit={(e) => handleQuickCreate(e, null)} className="flex items-center gap-2">
                    <input
                      ref={newTaskInputRef}
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Tapşırıq adı..."
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
            )}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            {/* Bulk Actions Toolbar for Mobile */}
            {selectedTasks.size > 0 && (
              <div className="flex flex-col gap-3 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  {selectedTasks.size} tapşırıq seçildi
                </span>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleBulkArchive}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Arxivlə
                  </button>
                  <button
                    onClick={handleBulkCopy}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Kopyala
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Sil
                  </button>
                  <button
                    onClick={() => setSelectedTasks(new Set())}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Ləğv et
                  </button>
                </div>
              </div>
            )}

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
        setExpandedTasks={setExpandedTasks}
      />

      {/* Task List Edit Modal */}
      <Modal
        isOpen={isEditingTaskList}
        onClose={handleCloseTaskListEdit}
        title="Siyahını redaktə et"
      >
        <form onSubmit={handleUpdateTaskList} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Siyahı adı</label>
            <input
              type="text"
              value={taskListForm.name}
              onChange={(e) => setTaskListForm({ name: e.target.value })}
              required
              placeholder="Siyahı adı"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={handleCloseTaskListEdit} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50">Ləğv et</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Yenilə
            </button>
          </div>
        </form>
      </Modal>
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
    <div ref={ref} className="relative min-w-0">
      <div
        ref={triggerRef}
        onClick={handleOpen}
        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded -mx-2 min-w-0"
      >
        <div className="flex flex-wrap gap-1 min-w-0">
          {task.assignees && task.assignees.length > 0 ? (
            task.assignees.map((assignee) => (
              <span
                key={assignee.id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 max-w-full"
                title={assignee.username}
              >
                <span className="truncate">{assignee.username}</span>
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-300 italic">Təyin et...</span>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed z-[9999] w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 max-h-72 overflow-y-auto"
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
  setExpandedTasks,
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
    doc: '',
    meetingNotes: '',
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
        doc: task.doc || '',
        meetingNotes: task.meetingNotes || '',
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
        doc: '',
        meetingNotes: '',
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
      } else {
        delete payload.startAt
      }
      if (payload.dueAt) {
        payload.dueAt = new Date(payload.dueAt).toISOString()
      } else {
        delete payload.dueAt
      }
      if (!payload.link) delete payload.link
      if (!payload.doc) delete payload.doc
      if (!payload.meetingNotes) delete payload.meetingNotes
      if (!payload.description) delete payload.description

      if (task) {
        await updateTask({ id: task.id, ...payload }).unwrap()
        toast.success('Tapşırıq yeniləndi!')
      } else {
        // Parent task varsa, onu açıq saxla
        if (payload.parentId) {
          setExpandedTasks(prev => {
            const newSet = new Set(prev)
            newSet.add(payload.parentId)
            return newSet
          })
        }
        const newTask = await createTask(payload).unwrap()
        // Yeni task-ı da avtomatik aç
        if (newTask?.id && setExpandedTasks) {
          setExpandedTasks(prev => {
            const newSet = new Set(prev)
            newSet.add(newTask.id)
            return newSet
          })
        }
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Doc
          </label>
          <textarea
            name="doc"
            value={formData.doc}
            onChange={handleChange}
            rows={3}
            placeholder="Sənəd məzmunu..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Notes
          </label>
          <textarea
            name="meetingNotes"
            value={formData.meetingNotes}
            onChange={handleChange}
            rows={3}
            placeholder="Görüş qeydləri..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
