import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import {
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation
} from '../services/adminApi'

const Settings = () => {
  const { data: settings, isLoading } = useGetNotificationSettingsQuery()
  const [updateSettings, { isLoading: isUpdating }] = useUpdateNotificationSettingsMutation()

  const [formData, setFormData] = useState({
    hoursBeforeDue: 2,
    isEnabled: true
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        hoursBeforeDue: settings.hoursBeforeDue || 2,
        isEnabled: settings.isEnabled ?? true
      })
    }
  }, [settings])

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      await updateSettings(formData).unwrap()
      toast.success('Tənzimləmələr yadda saxlanıldı!')
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tənzimləmələr</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Sistem tənzimləmələrini idarə edin</p>
      </div>

      <div>
        {/* Notification Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Bildiriş Tənzimləmələri</h2>
              <p className="text-xs sm:text-sm text-gray-500">Tapşırıq xatırladıcıları</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-medium text-gray-900">Bildirişləri aktivləşdir</h3>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  <span className="hidden sm:inline">Tapşırıq vaxtı yaxınlaşanda istifadəçilərə bildiriş göndərilsin</span>
                  <span className="sm:hidden">Vaxt yaxınlaşanda bildiriş göndər</span>
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Hours Before Due */}
            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
              <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-2">
                Neçə saat əvvəl bildiriş göndərilsin?
              </label>
              <p className="text-[10px] sm:text-xs text-gray-500 mb-3 sm:mb-4">
                <span className="hidden sm:inline">Tapşırığın bitmə vaxtından neçə saat əvvəl istifadəçilərə xatırladıcı göndərilsin</span>
                <span className="sm:hidden">Bitmə vaxtından əvvəl xatırladıcı</span>
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <input
                  type="range"
                  min="1"
                  max="72"
                  value={formData.hoursBeforeDue}
                  onChange={(e) => setFormData({ ...formData, hoursBeforeDue: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  disabled={!formData.isEnabled}
                />
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={formData.hoursBeforeDue}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      if (val >= 1 && val <= 72) {
                        setFormData({ ...formData, hoursBeforeDue: val })
                      }
                    }}
                    className="w-14 sm:w-16 px-2 py-1 text-sm border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!formData.isEnabled}
                  />
                  <span className="text-xs sm:text-sm text-gray-600">saat</span>
                </div>
              </div>
              <div className="hidden sm:flex justify-between text-xs text-gray-400 mt-2">
                <span>1 saat</span>
                <span>24 saat</span>
                <span>48 saat</span>
                <span>72 saat</span>
              </div>
            </div>

            {/* Quick Options */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
              <span className="text-xs sm:text-sm text-gray-500 w-full sm:w-auto mb-1 sm:mb-0">Sürətli seçim:</span>
              {[1, 2, 4, 8, 12, 24, 48].map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setFormData({ ...formData, hoursBeforeDue: hours })}
                  disabled={!formData.isEnabled}
                  className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full border transition-colors ${
                    formData.hoursBeforeDue === hours
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 disabled:opacity-50'
                  }`}
                >
                  {hours}s
                </button>
              ))}
            </div>

            {/* Save Button */}
            <div className="pt-3 sm:pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Saxlanılır...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Yadda saxla</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-2 sm:gap-3">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs sm:text-sm text-blue-800">
              <p className="font-medium">Bildirişlər necə işləyir?</p>
              <ul className="mt-2 space-y-1 text-blue-700 text-[10px] sm:text-sm">
                <li>• Sistem hər 5 dəqiqədə tapşırıqları yoxlayır</li>
                <li>• Bitmə vaxtı yaxınlaşanda bildiriş göndərilir</li>
                <li>• Hər tapşırıq üçün yalnız bir bildiriş</li>
                <li className="hidden sm:block">• Bildirişlər brauzer vasitəsilə real vaxtda göndərilir</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
