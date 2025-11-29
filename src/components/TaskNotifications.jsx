import { useEffect, useRef } from 'react'
import { toast } from 'react-toastify'

const TaskNotifications = ({ tasks }) => {
  const notifiedTasksRef = useRef(new Set())

  useEffect(() => {
    if (!tasks || tasks.length === 0) return

    const checkDeadlines = () => {
      const now = new Date()
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

      tasks.forEach((task) => {
        // Skip if already done or no due date
        if (task.status === 'done' || !task.dueAt) return

        // Skip if already notified
        if (notifiedTasksRef.current.has(task.id)) return

        const dueDate = new Date(task.dueAt)

        // Check if due date is within the next hour
        if (dueDate > now && dueDate <= oneHourFromNow) {
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

          // Mark as notified
          notifiedTasksRef.current.add(task.id)
        }
      })
    }

    // Check immediately
    checkDeadlines()

    // Check every 5 minutes
    const interval = setInterval(checkDeadlines, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [tasks])

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
