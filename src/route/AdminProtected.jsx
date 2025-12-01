import { Navigate } from 'react-router'
import { useVerifyQuery } from '../services/authApi'

const AdminProtected = ({ children }) => {
  const { data: currentUser, isLoading, isError } = useVerifyQuery()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yüklənir...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return <Navigate to="/projects" replace />
  }

  // Get user role (handle both nested and direct role)
  const userRole = currentUser?.role?.role || currentUser?.role || 'user'
  const isAdmin = userRole.toLowerCase() === 'admin'

  if (!isAdmin) {
    // Redirect non-admin users to projects page
    return <Navigate to="/projects" replace />
  }

  return children
}

export default AdminProtected

