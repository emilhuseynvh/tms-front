import { useState } from 'react'
import { toast } from 'react-toastify'
import {
  useUpdateTaskMutation,
  useGetUsersQuery,
  useGetTaskStatusesQuery,
  useSendTaskNotificationMutation,
} from '../services/adminApi'
import { StatusDropdown, AssigneeSelector, InlineDatePicker } from '../pages/TaskDetail'
import TaskActivityTooltip from './TaskActivityTooltip'
import { formatInlineTableDate } from '../utils/bakuTime'

/**
 * TaskDetail üslubunda inline redaktə olunan task cədvəli.
 * Başlıq/açıqlama klik-lə, status/assignee/tarixlər öz kontrolları ilə yerindəcə dəyişir.
 */
const InlineTaskTable = ({ tasks = [], emptyText = 'Tapşırıq yoxdur' }) => {
  const { data: users = [] } = useGetUsersQuery()
  const { data: statuses = [] } = useGetTaskStatusesQuery()
  const [updateTask] = useUpdateTaskMutation()
  const [sendTaskNotification] = useSendTaskNotificationMutation()

  const [editingField, setEditingField] = useState(null) // { taskId, field }
  const [editingValue, setEditingValue] = useState('')

  const rootTasks = tasks
    .filter((t) => !t.parentId)
    .map((t) => ({
      ...t,
      _subCount: tasks.filter((st) => st.parentId === t.id).length,
    }))

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
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rootTasks.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-500">
                {emptyText}
              </td>
            </tr>
          ) : (
            rootTasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
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
                      onClick={() => startEditing(task.id, 'title', task.title)}
                      className="flex items-start gap-2 min-w-0 cursor-text hover:bg-gray-100 px-1.5 py-0.5 rounded -mx-1.5"
                    >
                      <span className="font-medium text-gray-900 wrap-break-word">{task.title}</span>
                      {task._subCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 shrink-0 text-[10px] text-gray-500 bg-gray-100 rounded px-1 py-0.5" title="Alt tapşırıq">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                          </svg>
                          {task._subCount}
                        </span>
                      )}
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
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default InlineTaskTable
