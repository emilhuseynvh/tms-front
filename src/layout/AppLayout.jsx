import { Outlet } from 'react-router'
import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import FloatingChat from '../components/FloatingChat'
import { useWebSocket } from '../hooks/useWebSocket'
import { useNotificationSocket } from '../hooks/useNotificationSocket.jsx'
import { useGetRoomsQuery } from '../services/chatApi'
import { useVerifyQuery } from '../services/authApi'

const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Initialize WebSocket globally - works on all pages
  const { data: rooms = [] } = useGetRoomsQuery()
  const { data: currentUser } = useVerifyQuery()

  useWebSocket(null, rooms, currentUser?.id) // Pass current user ID
  useNotificationSocket(currentUser?.id) // Initialize notification socket

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Floating Chat */}
      <FloatingChat />
    </div>
  )
}

export default AppLayout