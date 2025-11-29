import { useState, useMemo, useEffect } from 'react'
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from '../services/adminApi'
import Modal from '../components/Modal'
import { toast } from 'react-toastify'

const Users = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const { data: users = [], isLoading } = useGetUsersQuery()
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation()
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation()
  const [deleteUser] = useDeleteUserMutation()

  // Filter and search users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)

      const matchesRole = roleFilter === 'all' || user.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [users, searchTerm, roleFilter])

  const handleOpenModal = (user = null) => {
    setEditingUser(user)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setEditingUser(null)
    setIsModalOpen(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Bu istifadəçini silmək istədiyinizdən əminsiniz?')) {
      try {
        await deleteUser(id).unwrap()
        toast.success('İstifadəçi silindi!')
      } catch (error) {
        toast.error(error?.data?.message || 'Xəta baş verdi!')
      }
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">İstifadəçilər</h1>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Yeni istifadəçi
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Axtar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="sm:w-40 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Bütün rollar</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yüklənir...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-gray-200">
          İstifadəçi tapılmadı
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                    İstifadəçi adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                    Telefon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">
                    Əməliyyatlar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{user.username}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.phone}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          user.role === 'admin'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="text-blue-600 hover:text-blue-700 font-medium mr-4"
                      >
                        Redaktə
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">{user.username}</h3>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      user.role === 'admin'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {user.email}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {user.phone}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModal(user)}
                    className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    Redaktə
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="flex-1 px-3 py-2 text-xs font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50 transition-colors"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* User Form Modal */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        user={editingUser}
        createUser={createUser}
        updateUser={updateUser}
        isCreating={isCreating}
        isUpdating={isUpdating}
      />
    </div>
  )
}

const UserFormModal = ({
  isOpen,
  onClose,
  user,
  createUser,
  updateUser,
  isCreating,
  isUpdating,
}) => {
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    email: '',
    password: '',
    role: 'user',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        phone: user.phone || '',
        email: user.email || '',
        password: '',
        role: user.role || 'user',
      })
    } else {
      setFormData({
        username: '',
        phone: '',
        email: '',
        password: '',
        role: 'user',
      })
    }
  }, [user])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (user) {
        // Update
        await updateUser({ id: user.id, ...formData }).unwrap()
        toast.success('İstifadəçi yeniləndi!')
      } else {
        // Create
        await createUser(formData).unwrap()
        toast.success('İstifadəçi yaradıldı!')
      }
      onClose()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'İstifadəçini redaktə et' : 'Yeni istifadəçi'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            İstifadəçi adı
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefon
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Şifrə {user && <span className="text-gray-500 font-normal">(boş buraxın dəyişməmək üçün)</span>}
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required={!user}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rol
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Ləğv et
          </button>
          <button
            type="submit"
            disabled={isCreating || isUpdating}
            className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isCreating || isUpdating ? 'Yüklənir...' : user ? 'Yenilə' : 'Yarat'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default Users
