import { useEffect } from 'react'
import { toast } from 'react-toastify'
import { useUpdateTaskMutation } from '../services/adminApi'

const TaskNotifications = ({ tasks }) => {
  const [updateTask] = useUpdateTaskMutation()

  useEffect(() => {
    if (!tasks || tasks.length === 0) return

    const checkDeadlines = async () => {
      const now = new Date()
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

      for (const task of tasks) {
        // Skip if already done or no due date
        if (task.status === 'done' || !task.dueAt) continue

        // Skip if already notified (is_message_send is true)
        if (task.is_message_send === true) continue

        const dueDate = new Date(task.dueAt)

        // Check if due date is within the next hour AND is_message_send is false (or not set)
        if (dueDate > now && dueDate <= oneHourFromNow && (task.is_message_send === false || task.is_message_send === undefined || task.is_message_send === null)) {
          const minutesLeft = Math.round((dueDate - now) / (1000 * 60))

          // Show notification with sound
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Tapşırıq Xatırlatması', {
              body: `"${task.title}" tapşırığının bitməsinə ${minutesLeft} dəqiqə qalıb!`,
              icon: '/favicon.ico',
              tag: `task-${task.id}`,
            })
          }

          // Show toast notification
          toast.warning(
            `⏰ "${task.title}" tapşırığının bitməsinə ${minutesLeft} dəqiqə qalıb!`,
            {
              autoClose: 10000,
              position: 'top-right',
            }
          )

          // Play notification sound
          playNotificationSound()

          // Update task to mark is_message_send as true
          try {
            const updatePayload = {
              id: task.id,
              title: task.title || '',
              description: task.description || '',
              startAt: task.startAt || null,
              dueAt: task.dueAt,
              taskListId: task.taskListId,
              assigneeId: task.assigneeId || 0,
              status: task.status || 'open',
              is_message_send: true,
            }
            
            // Include parentId only if it exists
            if (task.parentId !== null && task.parentId !== undefined) {
              updatePayload.parentId = task.parentId
            }
            
            await updateTask(updatePayload).unwrap()
          } catch (error) {
            console.error('Failed to update task notification status:', error)
          }
        }
      }
    }

    // Check immediately
    checkDeadlines()

    // Check every 5 minutes
    const interval = setInterval(checkDeadlines, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [tasks, updateTask])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return null
}

// Helper function to play notification sound
const playNotificationSound = () => {
  try {
    // Create AudioContext
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()

    // Create oscillator for beep sound
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Configure sound
    oscillator.frequency.value = 800 // Frequency in Hz
    oscillator.type = 'sine'

    // Volume envelope
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    // Play sound
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch (error) {
    console.log('Could not play notification sound:', error)
  }
}

export default TaskNotifications
