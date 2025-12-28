import { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { io } from 'socket.io-client'
import { toast } from 'react-toastify'
import { chatApi } from '../services/chatApi'

// Global socket instance
let globalSocket = null
let joinedRooms = new Set()
let currentUserId = null // Store current user ID globally
let currentActiveRoomId = null // Store currently active room ID globally

export const useWebSocket = (roomId, allRooms = [], userId = null) => {
  const dispatch = useDispatch()
  const currentRoomId = useRef(null)

  // Update global current user ID
  useEffect(() => {
    if (userId) {
      currentUserId = userId
      console.log('WebSocket: Current user ID updated to:', currentUserId)
    }
  }, [userId])

  // Initialize socket connection once
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      console.warn('No token found, cannot connect to WebSocket')
      return
    }

    // Only create socket if it doesn't exist
    if (!globalSocket) {
      console.log('Initializing global socket connection with token...')

      // Connect to Socket.io server with /chat namespace
      globalSocket = io('https://tms-back.apasni.me/chat', {
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

      globalSocket.on('connect', () => {
        console.log('Socket.io connected successfully to /chat namespace')
        console.log('Socket ID:', globalSocket.id)

        // Rejoin all rooms on reconnection
        joinedRooms.forEach((roomId) => {
          globalSocket.emit('room:join', { roomId })
          console.log('Rejoined room on reconnect:', roomId)
        })
      })

      globalSocket.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error)
        if (error.message.includes('authentication') || error.message.includes('token')) {
          console.error('Authentication failed, token may be invalid')
        }
      })

      globalSocket.on('disconnect', (reason) => {
        console.log('Socket.io disconnected, reason:', reason)
        console.log('Disconnect details:', {
          reason,
          connected: globalSocket?.connected,
          id: globalSocket?.id,
        })

        if (reason === 'io server disconnect') {
          console.error('Server disconnected socket - possible authentication failure')
          console.log('Token being used:', localStorage.getItem('token')?.substring(0, 20) + '...')
        } else if (reason === 'transport close' || reason === 'transport error') {
          console.log('Transport issue, will auto-reconnect')
        }
      })

      globalSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Reconnection attempt:', attemptNumber)
      })

      globalSocket.on('reconnect_failed', () => {
        console.error('Reconnection failed after all attempts')
      })

      globalSocket.on('error', (error) => {
        console.error('Socket error:', error)
      })

      // Listen for message send acknowledgment or errors
      globalSocket.on('message:sent', (data) => {
        console.log('Message sent successfully, server acknowledged:', data)
      })

      globalSocket.on('message:error', (error) => {
        console.error('Message send error from server:', error)
        toast.error(error.message || 'Mesaj göndərilə bilmədi')
      })

      // Listen for new messages - backend emits message:new
      globalSocket.on('message:new', (message) => {
        console.log('New message received via WebSocket:', message)
        console.log('Current user ID:', currentUserId)
        console.log('Message sender ID:', message.senderId)
        console.log('Are they equal?', String(message.senderId) === String(currentUserId))

        // Update messages cache directly for instant UI update (if cache exists)
        try {
          dispatch(
            chatApi.util.updateQueryData('getMessages', message.roomId, (draft) => {
              // Check if message already exists by ID (avoid duplicates from REST API)
              const existsById = draft.some(m => m.id === message.id)

              if (!existsById) {
                // Check for optimistic message from the same sender with same content
                const isOwnMessage = String(message.senderId) === String(currentUserId)
                
                if (isOwnMessage) {
                  // Find all optimistic messages from this sender with same content
                  const optimisticMessages = draft
                    .map((m, index) => ({ message: m, index }))
                    .filter(({ message: m }) => 
                      m._isOptimistic && 
                      String(m.senderId) === String(message.senderId) &&
                      m.content === message.content
                    )
                    .sort((a, b) => (b.message._optimisticTimestamp || 0) - (a.message._optimisticTimestamp || 0))

                  if (optimisticMessages.length > 0) {
                    // Replace the most recent optimistic message with real one
                    const mostRecentOptimistic = optimisticMessages[0]
                    draft.splice(mostRecentOptimistic.index, 1, message)
                    console.log('Replaced optimistic message with real WebSocket message')
                  } else {
                    // No matching optimistic message, add new message
                    draft.push(message)
                    console.log('Added new WebSocket message to cache (own message, no optimistic match)')
                  }
                } else {
                  // Message from other user, just add it
                  draft.push(message)
                  console.log('Added new WebSocket message to cache (from other user)')
                }
              } else {
                console.log('Message already exists in cache, skipping WebSocket duplicate')
              }
            })
          )
        } catch (error) {
          console.log('Messages cache not initialized for room:', message.roomId)
        }

        // Check if message is from current user or in current active room
        const isCurrentRoom = currentActiveRoomId === message.roomId
        const isOwnMessage = String(message.senderId) === String(currentUserId)

        console.log('Notification check:', {
          isCurrentRoom,
          isOwnMessage,
          currentActiveRoomId,
          messageRoomId: message.roomId,
          messageSenderId: message.senderId,
          currentUserId
        })

        // Show toast notification if message is from another user and not in current room
        if (!isCurrentRoom && !isOwnMessage) {
          const senderName = message.sender?.username || 'Bilinməyən'
          toast.info(`${senderName}: ${message.content}`, {
            position: 'top-right',
            autoClose: 3000,
            hideProgressBar: false,
          })
        }

        // Always refetch rooms from backend to get correct unreadCount
        // This ensures unreadCount is always accurate from database
        dispatch(chatApi.util.invalidateTags(['Rooms']))
      })

      // Listen for message read events
      globalSocket.on('message:read', (data) => {
        console.log('Message read:', data)
        // Refetch rooms from backend to get correct unreadCount
        dispatch(chatApi.util.invalidateTags(['Rooms']))
      })

      // Listen for user online status
      globalSocket.on('user:online', (data) => {
        console.log('User online:', data.userId)
      })

      // Listen for user offline status
      globalSocket.on('user:offline', (data) => {
        console.log('User offline:', data.userId)
      })
    }

    // Don't disconnect on unmount since it's global
    // Only disconnect on logout
  }, [dispatch])

  // Join all available rooms when they change
  useEffect(() => {
    if (!globalSocket || !allRooms.length) return

    const joinAllRooms = () => {
      allRooms.forEach((room) => {
        if (!joinedRooms.has(room.id)) {
          globalSocket.emit('room:join', { roomId: room.id })
          joinedRooms.add(room.id)
          console.log('Joined room:', room.id)
        }
      })
    }

    if (globalSocket.connected) {
      joinAllRooms()
    } else {
      // If socket is not connected yet, join rooms once connected
      globalSocket.once('connect', joinAllRooms)
    }

    return () => {
      // Clean up the listener if component unmounts before connection
      globalSocket?.off('connect', joinAllRooms)
    }
  }, [allRooms])

  // Handle active room change for UI purposes (optional)
  useEffect(() => {
    if (!globalSocket || !roomId) return
    currentRoomId.current = roomId
  }, [roomId])

  return { socket: globalSocket }
}

// Hook to send messages from any component
export const useWebSocketSend = () => {
  return (roomId, content) => {
    if (!globalSocket) {
      console.warn('Socket not initialized')
      return false
    }

    if (!globalSocket.connected) {
      console.warn('Socket not connected, attempting to reconnect...')
      globalSocket.connect()
      // Wait a bit and try again
      setTimeout(() => {
        if (globalSocket?.connected) {
          globalSocket.emit('message:send', { roomId, content })
          console.log('Message sent via WebSocket after reconnect:', { roomId, content })
        } else {
          console.error('Failed to reconnect socket')
        }
      }, 500)
      return true // Return true even if reconnecting, as we'll try to send
    }

    try {
      console.log('Attempting to send message via WebSocket:', { 
        roomId, 
        content, 
        socketId: globalSocket.id,
        connected: globalSocket.connected 
      })
      globalSocket.emit('message:send', { roomId, content })
      console.log('Message emit called successfully:', { roomId, content })
      return true
    } catch (error) {
      console.error('Error sending message via WebSocket:', error)
      return false
    }
  }
}

// Helper to set current active room ID (for unread count tracking)
export const setCurrentActiveRoomId = (roomId) => {
  currentActiveRoomId = roomId
  console.log('WebSocket: Current active room ID updated to:', currentActiveRoomId)
}

// Helper to disconnect socket (for logout)
export const disconnectSocket = () => {
  if (globalSocket) {
    globalSocket.disconnect()
    globalSocket = null
    joinedRooms.clear()
    console.log('Socket disconnected and cleared')
  }
}
