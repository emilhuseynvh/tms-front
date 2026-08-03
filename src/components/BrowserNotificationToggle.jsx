import { useState } from 'react'
import { useVerifyQuery } from '../services/authApi'
import { useUpdateProfileMutation } from '../services/adminApi'
import { toast } from 'react-toastify'

/**
 * Brauzer bildirişlərini aktiv/deaktiv edən düymə.
 * Aktiv sayılması üçün həm brauzer icazəsi (Notification.permission), həm istifadəçi seçimi lazımdır.
 */
const BrowserNotificationToggle = () => {
  const { data: currentUser, refetch } = useVerifyQuery()
  const [updateProfile, { isLoading }] = useUpdateProfileMutation()
  const [, forceRender] = useState(0)

  const supported = typeof window !== 'undefined' && 'Notification' in window
  const permission = supported ? Notification.permission : 'denied'
  const isActive = supported && permission === 'granted' && !!currentUser?.browserNotificationsEnabled

  const saveFlag = async (enabled) => {
    try {
      await updateProfile({ browserNotificationsEnabled: enabled }).unwrap()
      localStorage.setItem('browserNotificationsEnabled', enabled ? '1' : '0')
      refetch()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  const handleToggle = async () => {
    if (!supported) {
      toast.error('Bu brauzer bildirişləri dəstəkləmir!')
      return
    }

    if (isActive) {
      // Deaktiv et (brauzer icazəsi qalır, sadəcə istifadəçi seçimi sönür)
      await saveFlag(false)
      toast.success('Brauzer bildirişləri deaktiv edildi')
      return
    }

    // Aktiv etmək üçün brauzerdən icazə istə
    let perm = Notification.permission
    if (perm === 'default') {
      perm = await Notification.requestPermission()
      forceRender((n) => n + 1)
    }

    if (perm === 'granted') {
      await saveFlag(true)
      toast.success('Brauzer bildirişləri aktiv edildi')
    } else if (perm === 'denied') {
      toast.error('Brauzer bildirişlərə icazə vermir — brauzer parametrlərindən icazə verin')
      await saveFlag(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-white border border-gray-200 rounded-lg">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">Brauzer bildirişləri</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Yeni bildiriş gələndə brauzer bildirişi göstərilsin
        </p>
      </div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors shrink-0 disabled:opacity-50 ${
          isActive
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {isActive ? 'Aktivdir' : 'Deaktivdir'}
      </button>
    </div>
  )
}

export default BrowserNotificationToggle
