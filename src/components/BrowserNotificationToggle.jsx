import { useEffect, useState } from 'react'
import { useVerifyQuery } from '../services/authApi'
import { useUpdateProfileMutation } from '../services/adminApi'
import { toast } from 'react-toastify'

/**
 * Brauzer bildirişlərini aktiv/deaktiv edən düymə.
 * İcazə yalnız istifadəçi klikində soruşulmalıdır — səhifə yüklənəndə
 * requestPermission Chrome-da avtomatik "denied" olur və bir daha prompt çıxmır.
 */
const BrowserNotificationToggle = () => {
  const { data: currentUser, refetch } = useVerifyQuery()
  const [updateProfile, { isLoading }] = useUpdateProfileMutation()
  const [permission, setPermission] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied'
  )

  const supported = typeof window !== 'undefined' && 'Notification' in window
  const secure = typeof window !== 'undefined' && window.isSecureContext
  const isActive =
    supported && permission === 'granted' && !!currentUser?.browserNotificationsEnabled

  useEffect(() => {
    if (!supported || !navigator.permissions?.query) return
    let status
    navigator.permissions
      .query({ name: 'notifications' })
      .then((result) => {
        status = result
        setPermission(result.state === 'prompt' ? 'default' : result.state)
        result.onchange = () => {
          setPermission(result.state === 'prompt' ? 'default' : result.state)
        }
      })
      .catch(() => {})
    return () => {
      if (status) status.onchange = null
    }
  }, [supported])

  const saveFlag = async (enabled) => {
    try {
      await updateProfile({ browserNotificationsEnabled: enabled }).unwrap()
      localStorage.setItem('browserNotificationsEnabled', enabled ? '1' : '0')
      await refetch()
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
      throw error
    }
  }

  const handleToggle = async () => {
    if (!supported) {
      toast.error('Bu brauzer bildirişləri dəstəkləmir!')
      return
    }

    if (!secure) {
      toast.error('Brauzer bildirişləri yalnız HTTPS və ya localhost-da işləyir')
      return
    }

    if (isActive) {
      try {
        await saveFlag(false)
        toast.success('Brauzer bildirişləri deaktiv edildi')
      } catch {
        /* toast already shown */
      }
      return
    }

    let perm = Notification.permission
    if (perm !== 'granted') {
      try {
        perm = await Notification.requestPermission()
      } catch {
        perm = Notification.permission
      }
      setPermission(perm)
    }

    if (perm === 'granted') {
      try {
        await saveFlag(true)
        toast.success('Brauzer bildirişləri aktiv edildi')
      } catch {
        /* toast already shown */
      }
    } else {
      toast.error(
        'Brauzer icazə vermədi. Ünvan çubuğundakı kilid/ikon üzərinə klikləyib Bildirişlər → İcazə ver seçin, sonra yenidən cəhd edin.'
      )
      try {
        await saveFlag(false)
      } catch {
        /* toast already shown */
      }
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-white border border-gray-200 rounded-lg">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">Brauzer bildirişləri</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Yeni bildiriş gələndə brauzer bildirişi göstərilsin
        </p>
        {permission === 'denied' && (
          <p className="text-xs text-amber-600 mt-1">
            Brauzer bu sayt üçün bildirişləri bloklayıb. Ünvan çubuğundan icazə verin, sonra düyməyə yenidən basın.
          </p>
        )}
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
