import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { toast } from 'react-toastify'

// Global notification socket instance
let notificationSocket = null

// Notification sound URL (using Web Audio API)
const playNotificationSound = () => {
	try {
		const audioContext = new (window.AudioContext || window.webkitAudioContext)()
		const oscillator = audioContext.createOscillator()
		const gainNode = audioContext.createGain()

		oscillator.connect(gainNode)
		gainNode.connect(audioContext.destination)

		oscillator.frequency.value = 800
		oscillator.type = 'sine'

		gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
		gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

		oscillator.start(audioContext.currentTime)
		oscillator.stop(audioContext.currentTime + 0.5)

		// Play second tone
		setTimeout(() => {
			const oscillator2 = audioContext.createOscillator()
			const gainNode2 = audioContext.createGain()

			oscillator2.connect(gainNode2)
			gainNode2.connect(audioContext.destination)

			oscillator2.frequency.value = 1000
			oscillator2.type = 'sine'

			gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime)
			gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

			oscillator2.start(audioContext.currentTime)
			oscillator2.stop(audioContext.currentTime + 0.5)
		}, 200)
	} catch (error) {
		console.warn('Could not play notification sound:', error)
	}
}

export const useNotificationSocket = (userId) => {
	const isConnectedRef = useRef(false)

	const showTaskReminder = useCallback((data) => {
		// Play notification sound
		playNotificationSound()

		// Format remaining time
		const hours = Math.floor(data.remainingMinutes / 60)
		const minutes = data.remainingMinutes % 60
		let timeText = ''
		if (hours > 0) {
			timeText = `${hours} saat ${minutes > 0 ? `${minutes} dəqiqə` : ''}`
		} else {
			timeText = `${minutes} dəqiqə`
		}

		// Show toast notification
		toast.warning(
			<div>
				<strong>Xatırlatma!</strong>
				<p style={{ margin: '5px 0 0 0' }}>
					<strong>"{data.taskTitle}"</strong> tapşırığının bitmə vaxtına {timeText} qalıb!
				</p>
			</div>,
			{
				position: 'top-right',
				autoClose: 10000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
			}
		)
	}, [])

	useEffect(() => {
		const token = localStorage.getItem('token')
		if (!token || !userId) {
			return
		}

		// Only create socket if it doesn't exist
		if (!notificationSocket) {
			console.log('Initializing notification socket connection...')

			notificationSocket = io('https://tms-back.apasni.me/notifications', {
				auth: {
					token: token,
				},
				extraHeaders: {
					Authorization: `Bearer ${token}`,
				},
				transports: ['websocket', 'polling'],
				reconnection: true,
				reconnectionAttempts: 5,
				reconnectionDelay: 1000,
				autoConnect: true,
				withCredentials: false,
			})

			notificationSocket.on('connect', () => {
				console.log('Notification socket connected, ID:', notificationSocket.id)
				isConnectedRef.current = true
			})

			notificationSocket.on('connect_error', (error) => {
				console.error('Notification socket connection error:', error)
			})

			notificationSocket.on('disconnect', (reason) => {
				console.log('Notification socket disconnected:', reason)
				isConnectedRef.current = false
			})
		}

		// Listen for task due reminders
		const handleDueReminder = (data) => {
			console.log('Received task due reminder:', data)
			showTaskReminder(data)
		}

		notificationSocket.on('task:due-reminder', handleDueReminder)

		return () => {
			notificationSocket?.off('task:due-reminder', handleDueReminder)
		}
	}, [userId, showTaskReminder])

	return { socket: notificationSocket }
}

// Helper to disconnect notification socket (for logout)
export const disconnectNotificationSocket = () => {
	if (notificationSocket) {
		notificationSocket.disconnect()
		notificationSocket = null
		console.log('Notification socket disconnected and cleared')
	}
}
