import { useState, useEffect, useRef, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import {
  useGetRoomsQuery,
  useGetMessagesQuery,
  useMarkAsReadMutation,
  useCreateDirectChatMutation,
  chatApi,
} from '../services/chatApi'
import { useVerifyQuery } from '../services/authApi'
import { useGetUsersQuery } from '../services/adminApi'
import CreateGroupChatModal from './CreateGroupChatModal'
import { toast } from 'react-toastify'
import { useWebSocket, useWebSocketSend } from '../hooks/useWebSocket'

// Avatar component
const Avatar = ({ src, name, size = 'md' }) => {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
  }

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
  }

  const baseClasses = `${sizeClasses[size]} rounded-full shrink-0`

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${baseClasses} object-cover`}
      />
    )
  }

  return (
    <div className={`${baseClasses} bg-blue-600 flex items-center justify-center text-white font-semibold ${textSizeClasses[size]}`}>
      {name?.charAt(0).toUpperCase() || 'U'}
    </div>
  )
}

const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [messageInput, setMessageInput] = useState('')
  const [view, setView] = useState('chats')
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesContainerRef = useRef(null)
  const panelRef = useRef(null)

  const { data: currentUser } = useVerifyQuery()
  const { data: rooms = [], isLoading: roomsLoading } = useGetRoomsQuery()
  const { data: users = [], isLoading: usersLoading } = useGetUsersQuery()
  const { data: messages = [], isLoading: messagesLoading } = useGetMessagesQuery(
    selectedRoom?.id,
    { skip: !selectedRoom }
  )
  const dispatch = useDispatch()
  const [markAsRead] = useMarkAsReadMutation()
  const [createDirectChat] = useCreateDirectChatMutation()

  useWebSocket(selectedRoom?.id, rooms, currentUser?.id)
  const sendWebSocketMessage = useWebSocketSend()

  // Calculate total unread count
  const totalUnreadCount = useMemo(() => {
    return rooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0)
  }, [rooms])

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Don't close if clicking on the floating button
        const floatingButton = document.getElementById('floating-chat-button')
        if (floatingButton && floatingButton.contains(event.target)) return
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      }, 0)
    }
  }, [messages])

  // Mark messages as read when room is selected
  useEffect(() => {
    if (selectedRoom?.id) {
      markAsRead(selectedRoom.id)
    }
  }, [selectedRoom, markAsRead])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!messageInput.trim() || !selectedRoom) return

    const messageContent = messageInput.trim()
    setMessageInput('')

    try {
      const optimisticTimestamp = Date.now()
      const optimisticMessage = {
        id: `temp-${optimisticTimestamp}`,
        content: messageContent,
        senderId: currentUser?.id,
        roomId: selectedRoom.id,
        createdAt: new Date().toISOString(),
        isRead: false,
        sender: {
          id: currentUser?.id,
          username: currentUser?.username,
          avatar: currentUser?.avatar,
        },
        _isOptimistic: true,
        _optimisticTimestamp: optimisticTimestamp,
      }

      dispatch(
        chatApi.util.updateQueryData('getMessages', selectedRoom.id, (draft) => {
          draft.push(optimisticMessage)
        })
      )

      dispatch(
        chatApi.util.updateQueryData('getRooms', undefined, (draft) => {
          const room = draft.find(r => r.id === selectedRoom.id)
          if (room) {
            room.lastMessage = {
              content: messageContent,
              createdAt: optimisticMessage.createdAt,
            }
          }
        })
      )

      if (sendWebSocketMessage) {
        const sent = sendWebSocketMessage(selectedRoom.id, messageContent)
        if (!sent) {
          toast.error('WebSocket bağlantısı yoxdur')
          dispatch(
            chatApi.util.updateQueryData('getMessages', selectedRoom.id, (draft) => {
              const index = draft.findIndex(m => m._isOptimistic && m.id === optimisticMessage.id)
              if (index !== -1) draft.splice(index, 1)
            })
          )
          setMessageInput(messageContent)
        }
      } else {
        toast.error('WebSocket bağlantısı yoxdur')
        dispatch(
          chatApi.util.updateQueryData('getMessages', selectedRoom.id, (draft) => {
            const index = draft.findIndex(m => m._isOptimistic && m.id === optimisticMessage.id)
            if (index !== -1) draft.splice(index, 1)
          })
        )
        setMessageInput(messageContent)
      }
    } catch (error) {
      toast.error('Mesaj göndərilə bilmədi')
      setMessageInput(messageContent)
    }
  }

  const getRoomName = (room) => {
    if (room.type === 'group') return room.name || 'Qrup'
    return room?.name || room.otherUser?.username || 'İstifadəçi'
  }

  const getRoomAvatar = (room) => {
    if (room.type === 'group') return null
    return room.otherUser?.avatar?.url || null
  }

  const getLastMessage = (room) => {
    if (!room.lastMessage) return 'Mesaj yoxdur'
    return room.lastMessage.content
  }

  const handleUserClick = async (userId) => {
    try {
      const result = await createDirectChat(Number(userId)).unwrap()
      setSelectedRoom(result)
      setView('chats')
      setSearchQuery('')
    } catch (error) {
      toast.error('Xəta baş verdi')
    }
  }

  const filteredUsers = users.filter((user) =>
    user.id !== currentUser?.id && (
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  const filteredRooms = rooms.filter((room) =>
    getRoomName(room).toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Bu gün'
    if (date.toDateString() === yesterday.toDateString()) return 'Dünən'
    return date.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })
  }

  return (
    <>
      {/* Floating Button */}
      <button
        id="floating-chat-button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 group"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}

        {/* Unread Badge */}
        {totalUnreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 animate-pulse">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {selectedRoom ? (
            // Chat View
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center gap-3">
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <Avatar src={getRoomAvatar(selectedRoom)} name={getRoomName(selectedRoom)} size="sm" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{getRoomName(selectedRoom)}</h3>
                  {selectedRoom.type === 'group' && (
                    <p className="text-xs text-blue-100">{selectedRoom.memberCount || 0} üzv</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 bg-gray-50 space-y-2">
                {messagesLoading ? (
                  <div className="text-center text-gray-500 py-4 text-sm">Yüklənir...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-4 text-sm">Heç bir mesaj yoxdur</div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.senderId === currentUser?.id
                    return (
                      <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                            isOwnMessage
                              ? 'bg-blue-600 text-white rounded-br-md'
                              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
                          }`}
                        >
                          {!isOwnMessage && selectedRoom.type === 'group' && (
                            <p className="text-xs font-semibold mb-1 text-blue-600">
                              {message.sender?.username || 'İstifadəçi'}
                            </p>
                          )}
                          <p className="break-words">{message.content}</p>
                          <p className={`text-[10px] mt-1 text-right ${isOwnMessage ? 'text-blue-200' : 'text-gray-400'}`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Mesaj yazın..."
                    className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            </>
          ) : (
            // Rooms/Users List View
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <div className="flex items-center justify-between mb-3">
                  {view === 'users' ? (
                    <>
                      <button
                        onClick={() => { setView('chats'); setSearchQuery('') }}
                        className="p-1 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <h2 className="font-semibold">İstifadəçilər</h2>
                      <div className="w-5"></div>
                    </>
                  ) : (
                    <h2 className="font-semibold text-lg">Mesajlar</h2>
                  )}
                </div>

                {view === 'chats' && (
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => setView('users')}
                      className="flex-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg transition-colors"
                    >
                      Yeni Chat
                    </button>
                    <button
                      onClick={() => setShowGroupModal(true)}
                      className="flex-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg transition-colors"
                    >
                      Yeni Qrup
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  placeholder={view === 'users' ? 'İstifadəçi axtar...' : 'Chat axtar...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {view === 'users' ? (
                  usersLoading ? (
                    <div className="p-4 text-center text-gray-500 text-sm">Yüklənir...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">İstifadəçi tapılmadı</div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleUserClick(user.id)}
                        className="px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar src={user?.avatar?.url} name={user.username} size="sm" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-gray-900 truncate">{user.username}</h3>
                            {user.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
                          </div>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  roomsLoading ? (
                    <div className="p-4 text-center text-gray-500 text-sm">Yüklənir...</div>
                  ) : filteredRooms.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      {rooms.length === 0 ? 'Heç bir chat yoxdur' : 'Chat tapılmadı'}
                    </div>
                  ) : (
                    filteredRooms.map((room) => (
                      <div
                        key={room.id}
                        onClick={() => setSelectedRoom(room)}
                        className="px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar src={getRoomAvatar(room)} name={getRoomName(room)} size="sm" />
                            {room.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {room.unreadCount > 9 ? '9+' : room.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-semibold text-sm text-gray-900 truncate">
                                {getRoomName(room)}
                              </h3>
                              {room.lastMessage && (
                                <span className="text-[10px] text-gray-400 shrink-0">
                                  {formatDate(room.lastMessage.createdAt)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {getLastMessage(room)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <CreateGroupChatModal
          onClose={() => setShowGroupModal(false)}
          onCreated={(room) => {
            setSelectedRoom(room)
            setShowGroupModal(false)
          }}
        />
      )}
    </>
  )
}

export default FloatingChat
