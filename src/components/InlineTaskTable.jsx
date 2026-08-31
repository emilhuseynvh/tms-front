import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import {
  useUpdateTaskMutation,
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useArchiveTaskMutation,
  useGetUsersQuery,
  useGetTaskStatusesQuery,
  useSendTaskNotificationMutation,
} from '../services/adminApi'
import { StatusDropdown, AssigneeSelector, InlineDatePicker } from '../pages/TaskDetail'
import TaskActivityTooltip from './TaskActivityTooltip'
import { formatInlineTableDate } from '../utils/bakuTime'
import { useConfirm } from '../context/ConfirmContext'

/**
 * TaskDetail üslubunda inline redaktə olunan task cədvəli.
 * Siyahı > tapşırıq (və alt tapşırıq) iyerarxiyası; taskListId olanda yarat/arxiv/sil də mümkündür.
 */
const InlineTaskTable = ({
  tasks = [],
  emptyText = 'Tapşırıq yoxdur',
  taskListId = null,
  allowMutations = false,
}) => {
  const canMutate = allowMutations || !!taskListId
  const { confirm } = useConfirm()
  const { data: users = [] } = useGetUsersQuery()
  const { data: statuses = [] } = useGetTaskStatusesQuery()
  const [updateTask] = useUpdateTaskMutation()
  const [createTask] = useCreateTaskMutation()
  const [deleteTask] = useDeleteTaskMutation()
  const [archiveTask] = useArchiveTaskMutation()
  const [sendTaskNotification] = useSendTaskNotificationMutation()

  const [editingField, setEditingField] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [newTitle, setNewTitle] = useState('')
  const [addingParentId, setAddingParentId] = useState(null)
  const [subTitle, setSubTitle] = useState('')

  const childrenByParent = useMemo(() => {
    const map = new Map()
    for (const t of tasks) {
      if (!t.parentId) continue
      if (!map.has(t.parentId)) map.set(t.parentId, [])
      map.get(t.parentId).push(t)
    }
    for (const [, kids] of map) {
      kids.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    }
    return map
  }, [tasks])

  const rootTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.parentId)
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [tasks]
  )

  const startEditing = (taskId, field, currentValue) => {
    setEditingField({ taskId, field })
    setEditingValue(currentValue || '')
  }

  const cancelEditing = () => {
    setEditingField(null)
    setEditingValue('')
  }

  const saveInlineEdit = async (taskId, field) => {
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
      }
      await updateTask(payload).unwrap()
      cancelEditing()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const handleKeyDown = (e, taskId, field) => {
    if (e.key === 'Enter' && field === 'title') {
      e.preventDefault()
      saveInlineEdit(taskId, field)
    }
    if (e.key === 'Escape') cancelEditing()
  }

  const handleStatusChange = async (taskId, statusId) => {
    try {
      await updateTask({ id: taskId, statusId: statusId ? parseInt(statusId) : null }).unwrap()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const handleAssigneesChange = async (taskId, assigneeIds) => {
    try {
      await updateTask({ id: taskId, assigneeIds }).unwrap()
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

  const handleSendNotification = async (taskId, userIds, message) => {
    return await sendTaskNotification({ taskId, userIds, message }).unwrap()
  }

  const handleCreate = async (e, parentId = null) => {
    e.preventDefault()
    const title = (parentId ? subTitle : newTitle).trim()
    if (!title || !taskListId) return
    try {
      await createTask({
        title,
        taskListId: parseInt(taskListId),
        ...(parentId ? { parentId } : {}),
      }).unwrap()
      if (parentId) {
        setSubTitle('')
        setAddingParentId(null)
        setExpandedIds((prev) => new Set(prev).add(parentId))
      } else {
        setNewTitle('')
      }
      toast.success('Tapşırıq yaradıldı!')
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const handleArchive = async (task) => {
    try {
      await archiveTask(task.id).unwrap()
      toast.success(`"${task.title}" arxivə əlavə edildi!`)
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const handleDelete = async (task) => {
    const confirmed = await confirm({
      title: 'Tapşırığı sil',
      message: `"${task.title}" tapşırığını silmək istədiyinizdən əminsiniz?`,
      confirmText: 'Sil',
      cancelText: 'Ləğv et',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await deleteTask(task.id).unwrap()
      toast.success('Tapşırıq silindi!')
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const colCount = canMutate ? 8 : 7

  const renderRow = (task, depth) => {
    const kids = childrenByParent.get(task.id) || []
    const isExpanded = expandedIds.has(task.id)
    const rows = [
      <tr key={task.id} className="hover:bg-gray-50 group">
        <td className="px-3 py-2 align-top">
          {editingField?.taskId === task.id && editingField?.field === 'title' ? (
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
              className="flex items-start gap-1 min-w-0"
              style={{ paddingLeft: depth * 16 }}
            >
              {kids.length > 0 ? (
                <button
                  type="button"
                  onClick={() => toggleExpanded(task.id)}
                  className="mt-0.5 p-0.5 rounded hover:bg-gray-200 text-gray-500 shrink-0"
                  title={isExpanded ? 'Alt tapşırıqları gizlət' : 'Alt tapşırıqları göstər'}
                >
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <span className="w-4 shrink-0" />
              )}
              <div
                onClick={() => startEditing(task.id, 'title', task.title)}
                className="flex items-start gap-2 min-w-0 flex-1 cursor-text hover:bg-gray-100 px-1.5 py-0.5 rounded -mx-1.5"
              >
                <span className="font-medium text-gray-900 wrap-break-word">{task.title}</span>
                {kids.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 shrink-0 text-[10px] text-gray-500 bg-gray-100 rounded px-1 py-0.5" title="Alt tapşırıq">
                    {kids.length}
                  </span>
                )}
              </div>
            </div>
          )}
        </td>
        <td className="px-3 py-2 align-top text-gray-600">
          {editingField?.taskId === task.id && editingField?.field === 'description' ? (
            <textarea
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={() => saveInlineEdit(task.id, 'description')}
              onKeyDown={(e) => handleKeyDown(e, task.id, 'description')}
              autoFocus
              rows={2}
              className="w-full text-xs border border-blue-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          ) : (
            <div
              onClick={() => startEditing(task.id, 'description', task.description)}
              className="cursor-text hover:bg-gray-100 px-1.5 py-1 rounded -mx-1.5"
            >
              <span className="text-xs wrap-break-word">{task.description || <span className="text-gray-300">-</span>}</span>
            </div>
          )}
        </td>
        <td className="px-3 py-2 align-top">
          <StatusDropdown
            value={task.statusId ?? task.status?.id}
            statuses={statuses}
            currentStatus={task.status}
            onChange={(value) => handleStatusChange(task.id, value)}
          />
        </td>
        <td className="px-3 py-2 align-top">
          <AssigneeSelector
            task={task}
            users={users}
            onUpdate={handleAssigneesChange}
            onSendNotification={handleSendNotification}
          />
        </td>
        <td className="px-3 py-2 align-top whitespace-nowrap">
          <TaskActivityTooltip taskId={task.id}>
            <span className="text-xs text-gray-600 cursor-pointer hover:text-indigo-700">
              {formatInlineTableDate(task.updatedAt)}
            </span>
          </TaskActivityTooltip>
        </td>
        <td className="px-3 py-2 align-top whitespace-nowrap overflow-hidden">
          <InlineDatePicker
            value={task.startAt}
            onChange={(value) => handleDateChange(task.id, 'startAt', value)}
            placeholder="Başlama"
          />
        </td>
        <td className="px-3 py-2 align-top whitespace-nowrap overflow-hidden">
          <InlineDatePicker
            value={task.dueAt}
            onChange={(value) => handleDateChange(task.id, 'dueAt', value)}
            placeholder="Bitmə"
          />
        </td>
        {canMutate && (
          <td className="px-2 py-2 align-top whitespace-nowrap">
            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
              {taskListId && depth === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAddingParentId(task.id)
                    setExpandedIds((prev) => new Set(prev).add(task.id))
                  }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Alt tapşırıq əlavə et"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleArchive(task)}
                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                title="Arxivə at"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(task)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="Sil"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </td>
        )}
      </tr>,
    ]

    if (isExpanded) {
      kids.forEach((child) => {
        rows.push(...renderRow(child, depth + 1))
      })
      if (canMutate && taskListId && addingParentId === task.id) {
        rows.push(
          <tr key={`${task.id}-add-sub`}>
            <td colSpan={colCount} className="px-3 py-2 bg-blue-50/40" style={{ paddingLeft: 16 + (depth + 1) * 16 }}>
              <form onSubmit={(e) => handleCreate(e, task.id)} className="flex items-center gap-2">
                <input
                  type="text"
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  placeholder="Alt tapşırıq adı"
                  autoFocus
                  className="flex-1 min-w-0 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!subTitle.trim()}
                  className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded disabled:bg-blue-300"
                >
                  Əlavə et
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingParentId(null); setSubTitle('') }}
                  className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                >
                  Ləğv et
                </button>
              </form>
            </td>
          </tr>
        )
      }
    }

    return rows
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-white">
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Başlıq</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 w-[22%] min-w-[120px]">Açıqlama</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 min-w-[120px]">Status</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 min-w-[140px]">Təyin edilib</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Son yenilənmə</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap min-w-[130px]">Başlama</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap min-w-[130px]">Bitmə</th>
            {canMutate && (
              <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 w-28">Əməliyyat</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rootTasks.length === 0 && !(canMutate && taskListId) ? (
            <tr>
              <td colSpan={colCount} className="px-3 py-6 text-center text-sm text-gray-500">
                {emptyText}
              </td>
            </tr>
          ) : (
            rootTasks.flatMap((task) => renderRow(task, 0))
          )}
          {canMutate && taskListId && (
            <tr>
              <td colSpan={colCount} className="px-3 py-2 bg-gray-50/80">
                <form onSubmit={(e) => handleCreate(e, null)} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Yeni tapşırıq əlavə et..."
                    className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!newTitle.trim()}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    Əlavə et
                  </button>
                </form>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default InlineTaskTable
