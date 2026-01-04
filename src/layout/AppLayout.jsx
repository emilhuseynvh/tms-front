import { Outlet } from 'react-router'
import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import FloatingChat from '../components/FloatingChat'
import TaskNotifications from '../components/TaskNotifications'
import { useWebSocket } from '../hooks/useWebSocket'
import { useGetRoomsQuery } from '../services/chatApi'
import { useVerifyQuery } from '../services/authApi'
import { useGetMyTasksQuery } from '../services/adminApi'

const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const { data: rooms = [] } = useGetRoomsQuery()
  const { data: currentUser } = useVerifyQuery()
  const { data: myTasks = [] } = useGetMyTasksQuery(undefined, { skip: !currentUser })

  useWebSocket(null, rooms, currentUser?.id)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <FloatingChat />
      <TaskNotifications tasks={myTasks} />
    </div>
  )
}

export default AppLayout