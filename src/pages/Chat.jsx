import { useState, useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import {
  useGetRoomsQuery,
  useGetMessagesQuery,
  useMarkAsReadMutation,
  useCreateDirectChatMutation,
  useEditMessageMutation,
  chatApi,
} from '../services/chatApi'
import { useVerifyQuery } from '../services/authApi'
import { useGetUsersQuery } from '../services/adminApi'
import CreateGroupChatModal from '../components/CreateGroupChatModal'
import GroupChatSettingsModal from '../components/GroupChatSettingsModal'
import MessageContent from '../components/MessageContent'
import { toast } from 'react-toastify'
import { useWebSocket, useWebSocketSend } from '../hooks/useWebSocket'

// Avatar component
const Avatar = ({ src, name, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 md:w-10 md:h-10',
    md: 'w-10 h-10 md:w-12 md:h-12',
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
    <div className={`${baseClasses} bg-blue-600 flex items-center justify-center text-white font-semibold`}>
      {name?.charAt(0).toUpperCase() || 'U'}
    </div>
  )
}

const Chat = () => {
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [messageInput, setMessageInput] = useState('')
  const [view, setView] = useState('chats') // 'chats' or 'users'
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showGroupSettings, setShowGroupSettings] = useState(false)
  const [roomSearchOpen, setRoomSearchOpen] = useState(false)
  const [roomSearchQuery, setRoomSearchQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesContainerRef = useRef(null)
  const emojiPickerRef = useRef(null)

  const { data: currentUser } = useVerifyQuery()
  const { data: rooms = [], isLoading: roomsLoading } = useGetRoomsQuery()
  const { data: users = [], isLoading: usersLoading } = useGetUsersQuery()
  const { data: messages = [], isLoading: messagesLoading } = useGetMessagesQuery(
    selectedRoom?.id,
    { skip: !selectedRoom }
  )
  const dispatch = useDispatch()
  const [markAsRead] = useMarkAsReadMutation()
  const [createDirectChat, { isLoading: isCreating }] = useCreateDirectChatMutation()
  const [editMessage] = useEditMessageMutation()

  // Update active room in WebSocket hook
  useWebSocket(selectedRoom?.id, rooms, currentUser?.id)

  // Otaq dəyişəndə söhbət daxili axtarışı sıfırla
  useEffect(() => {
    setRoomSearchOpen(false)
    setRoomSearchQuery('')
  }, [selectedRoom?.id])

  // Rooms cache yenilənəndə (üzv əlavə/çıxarma, ad/şəkil dəyişimi) seçilmiş otağı sinxron saxla
  useEffect(() => {
    if (!selectedRoom) return
    const fresh = rooms.find((r) => r.id === selectedRoom.id)
    if (fresh && fresh !== selectedRoom) {
      setSelectedRoom(fresh)
    }
  }, [rooms]) // eslint-disable-line react-hooks/exhaustive-deps

  // Get sendMessage function from WebSocket hook
  const sendWebSocketMessage = useWebSocketSend()

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  // Emoji categories
  const emojiCategories = {
    'Smileys & People': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓'],
    'Animals & Nature': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦡', '🐾'],
    'Food & Drink': ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🥠', '🥡', '🍙', '🍚', '🍘', '🍥', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕️', '🍵', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍾', '🥄', '🍴', '🍽️'],
    'Activity & Sports': ['⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🥍', '🏏', '⛳️', '🏹', '🎣', '🥊', '🥋', '🎽', '⛸️', '🥌', '🛷', '🎿', '⛷️', '🏂', '🏋️‍♀️', '🏋️', '🤼‍♀️', '🤼‍♂️', '🤸‍♀️', '🤸‍♂️', '⛹️‍♀️', '⛹️', '🤺', '🤾‍♀️', '🤾‍♂️', '🏌️‍♀️', '🏌️', '🏇', '🧘‍♀️', '🧘‍♂️', '🏄‍♀️', '🏄', '🏊‍♀️', '🏊', '🤽‍♀️', '🤽‍♂️', '🚣‍♀️', '🚣', '🧗‍♀️', '🧗‍♂️', '🚵‍♀️', '🚵', '🚴‍♀️', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🏵', '🎗', '🎫', '🎟', '🎪', '🤹‍♀️', '🤹‍♂️', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰'],
    'Travel & Places': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩', '💺', '🚁', '🚟', '🚀', '🛸', '🚤', '🛥', '🛳', '⛴', '🚢', '⚓️', '⛽️', '🚧', '🚦', '🚥', '🗺', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟', '🎡', '🎢', '🎠', '⛲️', '⛱', '🏖', '🏝', '🏜', '🌋', '⛰', '🏔', '🗻', '🏕', '⛺️', '🏠', '🏡', '🏘', '🏚', '🏗', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛', '⛪️', '🕌', '🕍', '🕋', '⛩', '🛤', '🛣', '🗾', '🎑', '🏞', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙', '🌃', '🌌', '🌉', '🌁'],
    'Objects': ['⌚️', '📱', '📲', '💻', '⌨️', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙', '🎚', '🎛', '⏱', '⏲', '⏰', '🕰', '⌛️', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯', '🧯', '🛢', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒', '🛠', '⛏', '🔩', '⚙️', '🧱', '⛓', '🧲', '🔫', '💣', '🧨', '🔪', '🗡', '⚔️', '🛡', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳', '💊', '💉', '🧬', '🦠', '🧫', '🧪', '🌡', '🧹', '🧺', '🧻', '🚽', '🚿', '🛁', '🛀', '🧼', '🧽', '🧴', '🛎', '🔑', '🗝', '🚪', '🛋', '🛏', '🛌', '🧸', '🖼', '🛍', '🛒', '🎁', '🎈', '🎏', '🎀', '🪁', '🧧', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '📊', '📈', '📉', '🗒', '🗓', '📆', '📅', '🗑', '📇', '🗃', '🗳', '🗄', '📋', '📁', '📂', '🗂', '🗞', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊', '🖋', '✒️', '🖌', '🖍', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'],
    'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈️', '♉️', '♊️', '♋️', '♌️', '♍️', '♎️', '♏️', '♐️', '♑️', '♒️', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚️', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕️', '🛑', '⛔️', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗️', '❓', '❕', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯️', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿️', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '▶️', '⏸', '⏯', '⏹', '⏺', '⏭', '⏮', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔜', '🔝', '✔️', '☑️', '🔘', '⚪️', '⚫️', '🔴', '🔵', '🟠', '🟡', '🟢', '🟣', '🟤', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛️', '⬜️', '◼️', '◻️', '◾️', '◽️', '▪️', '▫️', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔳', '🔲', '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🇦🇫', '🇦🇽', '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪', '🇧🇿', '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇮🇴', '🇻🇬', '🇧🇳', '🇧🇬', '🇧🇫', '🇧🇮', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇶', '🇨🇻', '🇰🇾', '🇨🇫', '🇹🇩', '🇨🇱', '🇨🇳', '🇨🇽', '🇨🇨', '🇨🇴', '🇰🇲', '🇨🇬', '🇨🇩', '🇨🇰', '🇨🇷', '🇨🇮', '🇭🇷', '🇨🇺', '🇨🇼', '🇨🇾', '🇨🇿', '🇩🇰', '🇩🇯', '🇩🇲', '🇩🇴', '🇪🇨', '🇪🇬', '🇸🇻', '🇬🇶', '🇪🇷', '🇪🇪', '🇪🇹', '🇪🇺', '🇫🇰', '🇫🇴', '🇫🇯', '🇫🇮', '🇫🇷', '🇬🇫', '🇵🇫', '🇹🇫', '🇬🇦', '🇬🇲', '🇬🇪', '🇩🇪', '🇬🇭', '🇬🇮', '🇬🇷', '🇬🇱', '🇬🇩', '🇬🇵', '🇬🇺', '🇬🇹', '🇬🇬', '🇬🇳', '🇬🇼', '🇬🇾', '🇭🇹', '🇭🇳', '🇭🇰', '🇭🇺', '🇮🇸', '🇮🇳', '🇮🇩', '🇮🇷', '🇮🇶', '🇮🇪', '🇮🇲', '🇮🇱', '🇮🇹', '🇯🇲', '🇯🇵', '🎌', '🇯🇪', '🇯🇴', '🇰🇿', '🇰🇪', '🇰🇮', '🇽🇰', '🇰🇼', '🇰🇬', '🇱🇦', '🇱🇻', '🇱🇧', '🇱🇸', '🇱🇷', '🇱🇾', '🇱🇮', '🇱🇹', '🇱🇺', '🇲🇴', '🇲🇰', '🇲🇬', '🇲🇼', '🇲🇾', '🇲🇻', '🇲🇱', '🇲🇹', '🇲🇭', '🇲🇶', '🇲🇷', '🇲🇺', '🇾🇹', '🇲🇽', '🇫🇲', '🇲🇩', '🇲🇨', '🇲🇳', '🇲🇪', '🇲🇸', '🇲🇦', '🇲🇿', '🇲🇲', '🇳🇦', '🇳🇷', '🇳🇵', '🇳🇱', '🇳🇨', '🇳🇿', '🇳🇮', '🇳🇪', '🇳🇬', '🇳🇺', '🇳🇫', '🇰🇵', '🇲🇵', '🇳🇴', '🇴🇲', '🇵🇰', '🇵🇼', '🇵🇸', '🇵🇦', '🇵🇬', '🇵🇾', '🇵🇪', '🇵🇭', '🇵🇳', '🇵🇱', '🇵🇹', '🇵🇷', '🇶🇦', '🇷🇪', '🇷🇴', '🇷🇺', '🇷🇼', '🇼🇸', '🇸🇲', '🇸🇦', '🇸🇳', '🇷🇸', '🇸🇨', '🇸🇱', '🇸🇬', '🇸🇽', '🇸🇰', '🇸🇮', '🇬🇸', '🇸🇧', '🇸🇴', '🇿🇦', '🇰🇷', '🇸🇸', '🇪🇸', '🇱🇰', '🇧🇱', '🇸🇭', '🇰🇳', '🇱🇨', '🇵🇲', '🇻🇨', '🇸🇩', '🇸🇷', '🇸🇿', '🇸🇪', '🇨🇭', '🇸🇾', '🇹🇼', '🇹🇯', '🇹🇿', '🇹🇭', '🇹🇱', '🇹🇬', '🇹🇰', '🇹🇴', '🇹🇹', '🇹🇳', '🇹🇷', '🇹🇲', '🇹🇨', '🇹🇻', '🇻🇮', '🇺🇬', '🇺🇦', '🇦🇪', '🇬🇧', '🇺🇸', '🇺🇾', '🇺🇿', '🇻🇺', '🇻🇦', '🇻🇪', '🇻🇳', '🇼🇫', '🇪🇭', '🇾🇪', '🇿🇲', '🇿🇼']
  }

  const handleEmojiClick = (emoji) => {
    setMessageInput(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      // Use setTimeout to ensure DOM is updated before scrolling
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
      // Create optimistic message for instant UI update
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
        _isOptimistic: true, // Flag to identify optimistic messages
        _optimisticTimestamp: optimisticTimestamp, // Timestamp to match with real message
      }

      // Add optimistic message to cache immediately
      dispatch(
        chatApi.util.updateQueryData('getMessages', selectedRoom.id, (draft) => {
          draft.push(optimisticMessage)
        })
      )

      // Update rooms cache to show latest message
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

      // Send via WebSocket
      if (sendWebSocketMessage) {
        console.log('Calling sendWebSocketMessage:', { 
          roomId: selectedRoom.id, 
          content: messageContent,
          optimisticMessageId: optimisticMessage.id 
        })
        const sent = sendWebSocketMessage(selectedRoom.id, messageContent)
        console.log('sendWebSocketMessage returned:', sent)
        if (!sent) {
          console.error('Failed to send message via WebSocket - function returned false')
          toast.error('WebSocket bağlantısı yoxdur')
          // Remove optimistic message on error
          dispatch(
            chatApi.util.updateQueryData('getMessages', selectedRoom.id, (draft) => {
              const index = draft.findIndex(m => m._isOptimistic && m.id === optimisticMessage.id)
              if (index !== -1) draft.splice(index, 1)
            })
          )
          setMessageInput(messageContent)
        } else {
          console.log('Message send initiated successfully via WebSocket:', { roomId: selectedRoom.id, content: messageContent })
        }
      } else {
        toast.error('WebSocket bağlantısı yoxdur')
        // Remove optimistic message on error
        dispatch(
          chatApi.util.updateQueryData('getMessages', selectedRoom.id, (draft) => {
            const index = draft.findIndex(m => m._isOptimistic && m.id === optimisticMessage.id)
            if (index !== -1) draft.splice(index, 1)
          })
        )
        setMessageInput(messageContent)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Mesaj göndərilə bilmədi')
      // Remove optimistic message on error
      dispatch(
        chatApi.util.updateQueryData('getMessages', selectedRoom.id, (draft) => {
          const index = draft.findIndex(m => m._isOptimistic)
          if (index !== -1) draft.splice(index, 1)
        })
      )
      // Restore message input if sending failed
      setMessageInput(messageContent)
    }
  }

  const getUserAvatar = (user) => {
    console.log(user);
    
    return user?.avatar?.url || null
  }

  const getRoomName = (room) => {
    if (room.type === 'group') {
      return room.name || 'Qrup'
    }
    return room?.name || room.otherUser?.username || 'İstifadəçi'
  }

  const getRoomAvatar = (room) => {
    if (room.type === 'group') {
      return room.avatar?.url || null
    }
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
      console.error('Failed to create direct chat:', error)
    }
  }

  // Filter users or rooms based on search
  const filteredUsers = users.filter((user) =>
    user.id !== currentUser?.id && (
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  const filteredRooms = rooms.filter((room) =>
    getRoomName(room).toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Söhbət daxili mesaj axtarışı
  const filteredMessages = roomSearchQuery.trim()
    ? messages.filter((m) =>
        m.content?.toLowerCase().includes(roomSearchQuery.trim().toLowerCase())
      )
    : messages

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Bu gün'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Dünən'
    } else {
      return date.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-full bg-white rounded-lg overflow-hidden">
      {/* Left Sidebar */}
      <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col ${selectedRoom ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            {view === 'users' ? (
              <>
                <button
                  onClick={() => {
                    setView('chats')
                    setSearchQuery('')
                  }}
                  className="text-gray-600 hover:text-gray-900 p-1 -ml-1"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-lg md:text-xl font-semibold text-gray-800">İstifadəçilər</h2>
                <div className="w-5 md:w-6"></div>
              </>
            ) : (
              <>
                <h2 className="text-lg md:text-xl font-semibold text-gray-800">Mesajlar</h2>
              </>
            )}
          </div>
          {view === 'chats' && (
            <div className="flex gap-2 mb-2 md:mb-0">
              <button
                onClick={() => setView('users')}
                className="flex-1 px-2 md:px-3 py-1.5 md:py-2 bg-blue-600 text-white text-xs md:text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                Yeni Chat
              </button>
              <button
                onClick={() => setShowGroupModal(true)}
                className="flex-1 px-2 md:px-3 py-1.5 md:py-2 bg-green-600 text-white text-xs md:text-sm rounded-md hover:bg-green-700 transition-colors"
              >
                Yeni Qrup
              </button>
            </div>
          )}
          {/* Search */}
          <div className="mt-2 md:mt-3">
            <input
              type="text"
              placeholder={view === 'users' ? 'İstifadəçi axtar...' : 'Chat axtar...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {view === 'users' ? (
            // Users List
            usersLoading ? (
              <div className="p-4 text-center text-gray-500">Yüklənir...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">İstifadəçi tapılmadı</div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserClick(user.id)}
                  className="p-3 md:p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <Avatar src={getUserAvatar(user)} name={user.username} size="md" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm md:text-base text-gray-900 truncate">{user.username}</h3>
                      {user.email && (
                        <p className="text-xs md:text-sm text-gray-500 truncate">{user.email}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            // Rooms List
            roomsLoading ? (
              <div className="p-4 text-center text-gray-500">Yüklənir...</div>
            ) : filteredRooms.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {rooms.length === 0 ? 'Heç bir chat yoxdur' : 'Chat tapılmadı'}
              </div>
            ) : (
              filteredRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`p-3 md:p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                    selectedRoom?.id === room.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <Avatar src={getRoomAvatar(room)} name={getRoomName(room)} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
                          <h3 className="font-semibold text-sm md:text-base text-gray-900 truncate">
                            {getRoomName(room)}
                          </h3>
                          {room.unreadCount > 0 && (
                            <span className="bg-blue-600 text-white text-xs px-1.5 md:px-2 py-0.5 rounded-full shrink-0">
                              {room.unreadCount}
                            </span>
                          )}
                        </div>
                        {room.lastMessage && (
                          <span className="text-xs text-gray-500 shrink-0">
                            {formatDate(room.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-gray-600 truncate mt-0.5 md:mt-1">
                        {getLastMessage(room)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 flex flex-col ${selectedRoom ? 'flex' : 'hidden md:flex'} min-w-0`}>
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-3 md:p-4 border-b border-gray-200 bg-white shrink-0">
              <div className="flex items-center gap-2 md:gap-3">
                {/* Back button for mobile */}
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="md:hidden text-gray-600 hover:text-gray-900 p-1 -ml-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <Avatar src={getRoomAvatar(selectedRoom)} name={getRoomName(selectedRoom)} size="sm" />
                <div
                  onClick={() => selectedRoom.type === 'group' && setShowGroupSettings(true)}
                  className={selectedRoom.type === 'group' ? 'cursor-pointer' : ''}
                  title={selectedRoom.type === 'group' ? 'Qrup parametrləri' : undefined}
                >
                  <h3 className="font-semibold text-gray-900">
                    {getRoomName(selectedRoom)}
                  </h3>
                  {selectedRoom.type === 'group' && (
                    <p className="text-sm text-gray-600">
                      {selectedRoom.members?.length || 0} üzv
                    </p>
                  )}
                </div>
                <div className="flex-1" />
                <button
                  onClick={() => {
                    setRoomSearchOpen((prev) => {
                      if (prev) setRoomSearchQuery('')
                      return !prev
                    })
                  }}
                  className={`p-2 rounded-md transition-colors ${
                    roomSearchOpen ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                  title="Mesajlarda axtar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
              {roomSearchOpen && (
                <div className="mt-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Bu söhbətdə axtar..."
                    value={roomSearchQuery}
                    onChange={(e) => setRoomSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setRoomSearchOpen(false)
                        setRoomSearchQuery('')
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {roomSearchQuery.trim() && (
                    <p className="mt-1 text-xs text-gray-500">
                      {filteredMessages.length} mesaj tapıldı
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-2 md:p-4 bg-gray-50 min-h-0">
              {messagesLoading ? (
                <div className="text-center text-gray-500 py-4">Yüklənir...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 py-4">Heç bir mesaj yoxdur</div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-4">Axtarışa uyğun mesaj tapılmadı</div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {filteredMessages.map((message) => {
                    const isOwnMessage = message.senderId === currentUser?.id
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] md:max-w-md px-3 md:px-4 py-2 rounded-lg ${
                            isOwnMessage
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          {!isOwnMessage && selectedRoom.type === 'group' && (
                            <p className="text-xs font-semibold mb-1 text-blue-600">
                              {message.sender?.username || 'İstifadəçi'}
                            </p>
                          )}
                          <MessageContent
                            message={message}
                            isOwnMessage={isOwnMessage}
                            canEdit={isOwnMessage && !message._isOptimistic}
                            onEdit={async (content) => {
                              try {
                                await editMessage({ messageId: message.id, roomId: selectedRoom.id, content }).unwrap()
                              } catch (error) {
                                toast.error(error?.data?.message || 'Mesaj redaktə edilə bilmədi')
                                throw error
                              }
                            }}
                          />
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <p
                              className={`text-xs ${
                                isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                              }`}
                            >
                              {formatTime(message.createdAt)}
                            </p>
                            {isOwnMessage && (
                              <svg
                                className={`w-4 h-4 ${
                                  message.isRead ? 'text-blue-200' : 'text-blue-100'
                                }`}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                {/* Double checkmark */}
                                <path d="M1 12l4 4L13 8" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M8 12l4 4L20 8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-2 md:p-4 bg-white border-t border-gray-200 relative shrink-0">
              <div className="flex gap-2 items-end">
                {/* Emoji Button */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 md:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors shrink-0"
                  title="Emoji"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Mesaj yazın..."
                  className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="px-4 md:px-6 py-2 text-sm md:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <span className="hidden md:inline">Göndər</span>
                  <svg className="w-5 h-5 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-full left-0 right-0 md:right-auto mb-2 w-full md:w-80 h-64 md:h-80 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-50"
                >
                  <div className="h-full flex flex-col">
                    {/* Categories Tabs */}
                    <div className="flex border-b border-gray-200 overflow-x-auto bg-gray-50 shrink-0">
                      {Object.keys(emojiCategories).map((category) => (
                        <button
                          key={category}
                          className="px-2 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap"
                        >
                          {category.split(' ')[0]}
                        </button>
                      ))}
                    </div>

                    {/* Emoji Grid */}
                    <div className="flex-1 overflow-y-auto p-2">
                      {Object.entries(emojiCategories).map(([category, emojis]) => (
                        <div key={category} className="mb-3">
                          <h3 className="text-xs font-semibold text-gray-500 mb-1.5 sticky top-0 bg-white py-1 z-10">
                            {category}
                          </h3>
                          <div className="grid grid-cols-6 md:grid-cols-8 gap-0.5">
                            {emojis.map((emoji, index) => (
                              <button
                                key={`${category}-${index}`}
                                onClick={() => handleEmojiClick(emoji)}
                                className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-base md:text-lg hover:bg-gray-100 active:bg-gray-200 rounded transition-colors"
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-lg">Söhbət seçin</p>
            </div>
          </div>
        )}
      </div>

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

      {/* Group Settings Modal */}
      {showGroupSettings && selectedRoom?.type === 'group' && (
        <GroupChatSettingsModal
          room={selectedRoom}
          currentUser={currentUser}
          onClose={() => setShowGroupSettings(false)}
          onUpdated={(room) => setSelectedRoom(room)}
        />
      )}
    </div>
  )
}

export default Chat
