import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useDispatch } from 'react-redux'
import { useVerifyQuery } from '../services/authApi'
import { authApi } from '../services/authApi'
import { adminApi } from '../services/adminApi'
import { chatApi } from '../services/chatApi'
import { toast } from 'react-toastify'

const Header = ({ onMenuClick }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { data: currentUser } = useVerifyQuery()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    // Clear all RTK Query caches on logout
    dispatch(authApi.util.resetApiState())
    dispatch(adminApi.util.resetApiState())
    dispatch(chatApi.util.resetApiState())
    toast.success('Çıxış edildi!')
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between">
      {/* Hamburger Menu Button for Mobile */}
      <button
        onClick={onMenuClick}
        className="md:hidden text-gray-600 hover:text-gray-900"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Spacer for desktop */}
      <div className="hidden md:block flex-1"></div>

      {/* Profile Dropdown */}
      <div className="relative ml-auto" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
        >
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar?.url || ""}
                alt="Avatar"
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <span className="text-blue-600 font-medium text-sm">
                {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </div>

          {/* User Info */}
          <div className="text-left hidden md:block">
            <p className="text-sm font-medium text-gray-900">
              {currentUser?.username || 'User'}
            </p>
            <p className="text-xs text-gray-500">{currentUser?.role || 'user'}</p>
          </div>

          {/* Dropdown Arrow */}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-slideDown">
            <button
              onClick={() => {
                navigate('/profile')
                setIsDropdownOpen(false)
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profil
            </button>
            <hr className="my-1 border-gray-200" />
            <button
              onClick={() => {
                handleLogout()
                setIsDropdownOpen(false)
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Çıxış
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header;
