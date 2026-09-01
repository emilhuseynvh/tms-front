import { useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { useUpdateTaskMutation } from '../services/adminApi'
import { playNotificationSound } from '../utils/notificationSound'

const TaskNotifications = ({ tasks }) => {
  const [updateTask] = useUpdateTaskMutation()
  const notifiedTasksRef = useRef(new Set())
  const isProcessingRef = useRef(false)

  useEffect(() => {
    if (!tasks || tasks.length === 0) return
    if (isProcessingRef.current) return

    const checkDeadlines = async () => {
      if (isProcessingRef.current) return
      isProcessingRef.current = true

      const now = new Date()
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

      for (const task of tasks) {
        if (task.status === 'done' || !task.dueAt) continue
        if (task.is_message_send === true) continue
        if (notifiedTasksRef.current.has(task.id)) continue

        const dueDate = new Date(task.dueAt)

        if (dueDate > now && dueDate <= oneHourFromNow) {
          notifiedTasksRef.current.add(task.id)

          const minutesLeft = Math.round((dueDate - now) / (1000 * 60))

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Tapşırıq Xatırlatması', {
              body: `"${task.title}" tapşırığının bitməsinə ${minutesLeft} dəqiqə qalıb!`,
              icon: '/favicon.ico',
              tag: `task-${task.id}`,
            })
          }

          toast.warning(
            `⏰ "${task.title}" tapşırığının bitməsinə ${minutesLeft} dəqiqə qalıb!`,
            {
              autoClose: 10000,
              position: 'top-right',
              toastId: `task-deadline-${task.id}`,
            }
          )

          playNotificationSound()

          try {
            await updateTask({
              id: task.id,
              is_message_send: true,
            }).unwrap()
          } catch (error) {
            console.error('Failed to update task notification status:', error)
          }
        }
      }

      isProcessingRef.current = false
    }

    const timeoutId = setTimeout(checkDeadlines, 100)

    const interval = setInterval(() => {
      if (!isProcessingRef.current) {
        checkDeadlines()
      }
    }, 5 * 60 * 1000)

    return () => {
      clearTimeout(timeoutId)
      clearInterval(interval)
    }
  }, [tasks, updateTask])

  return null
}

export default TaskNotifications
