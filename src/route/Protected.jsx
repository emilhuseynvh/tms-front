import { Navigate } from 'react-router'
import { useVerifyQuery } from '../services/authApi'

const Protected = ({ children }) => {
  const token = localStorage.getItem('token')

  const { data, isLoading, isError } = useVerifyQuery(undefined, {
    skip: !token,
  })

  if (!token) {
    return <Navigate to="/login" replace />
  }

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
    localStorage.removeItem('token')
    return <Navigate to="/login" replace />
  }

  return children
}

export default Protected
