import { useState, useEffect } from 'react'
import { useUpdateProfileMutation, useUploadImageMutation } from '../services/adminApi'
import { useVerifyQuery } from '../services/authApi'
import { toast } from 'react-toastify'

const Profile = () => {
  const { data: currentUser, refetch } = useVerifyQuery()
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation()
  const [uploadImage, { isLoading: isUploading }] = useUploadImageMutation()

  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    email: '',
    password: '',
    role: 'user',
    avatarId: 0,
  })

  const [avatarPreview, setAvatarPreview] = useState(null)

  useEffect(() => {
    if (currentUser) {
      // Handle both nested and direct role format
      const userRole = currentUser.role?.role || currentUser.role || 'user'
      
      setFormData({
        username: currentUser.username || '',
        phone: currentUser.phone || '',
        email: currentUser.email || '',
        password: '',
        role: userRole,
        avatarId: currentUser.avatarId || 0,
      })

      if (currentUser.avatar) {
        setAvatarPreview(currentUser.avatar)
      }
    }
  }, [currentUser])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validasiya
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const maxSize = 25 * 1024 * 1024 // 25MB

    if (!allowedTypes.includes(file.type)) {
      toast.error('Yalnız JPG, PNG və WebP formatları dəstəklənir!')
      e.target.value = ''
      return
    }

    if (file.size > maxSize) {
      toast.error('Şəkil ölçüsü 25MB-dan böyük ola bilməz!')
      e.target.value = ''
      return
    }

    // Preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result)
    }
    reader.readAsDataURL(file)

    // Upload
    const formDataImage = new FormData()
    formDataImage.append('file', file)

    try {
      const result = await uploadImage(formDataImage).unwrap()
      setFormData({ ...formData, avatarId: result.id })
      toast.success('Şəkil yükləndi!')
    } catch (error) {
      const errorMessage = error?.data?.message || 'Şəkil yüklənərkən xəta baş verdi!'
      // Backend error mesajlarını Azərbaycan dilinə çevir
      if (errorMessage.includes('type is not correct') || errorMessage.includes('mime')) {
        toast.error('Yalnız JPG, PNG və WebP formatları dəstəklənir!')
      } else if (errorMessage.includes('size') || errorMessage.includes('large')) {
        toast.error('Şəkil ölçüsü 25MB-dan böyük ola bilməz!')
      } else {
        toast.error(errorMessage)
      }
      setAvatarPreview(currentUser?.avatar || null)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      await updateProfile(formData).unwrap()
      toast.success('Profil yeniləndi!')
      refetch()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">Profil Parametrləri</h1>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                {avatarPreview ? (
                  <img
                    src={avatarPreview.url || avatarPreview}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <label
                htmlFor="avatar"
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </label>
              <input
                id="avatar"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* User Info */}
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{currentUser?.username || 'İstifadəçi'}</h2>
              <p className="text-sm text-gray-500 mt-1 break-all">{currentUser?.email}</p>
              <div className="mt-2">
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700">
                  {currentUser?.role?.role || currentUser?.role || 'user'}
                </span>
              </div>
              {isUploading ? (
                <p className="mt-2 text-xs text-blue-600">Şəkil yüklənir...</p>
              ) : (
                <p className="mt-2 text-xs text-gray-400">JPG, PNG, WebP (maks. 25MB)</p>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                Yeni şifrə <span className="text-gray-500 font-normal">(boş buraxın dəyişməmək üçün)</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4 md:mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isUpdating || isUploading}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Yüklənir...' : 'Dəyişiklikləri yadda saxla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Profile
