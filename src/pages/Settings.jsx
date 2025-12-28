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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tənzimləmələr</h1>
        <p className="text-gray-600 mt-1">Sistem tənzimləmələrini idarə edin</p>
      </div>

      <div>
        {/* Notification Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Bildiriş Tənzimləmələri</h2>
              <p className="text-sm text-gray-500">Tapşırıq xatırladıcıları üçün tənzimləmələr</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Bildirişləri aktivləşdir</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Tapşırıq vaxtı yaxınlaşanda istifadəçilərə bildiriş göndərilsin
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Hours Before Due */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Neçə saat əvvəl bildiriş göndərilsin?
              </label>
              <p className="text-xs text-gray-500 mb-4">
                Tapşırığın bitmə vaxtından neçə saat əvvəl istifadəçilərə xatırladıcı göndərilsin
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="72"
                  value={formData.hoursBeforeDue}
                  onChange={(e) => setFormData({ ...formData, hoursBeforeDue: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  disabled={!formData.isEnabled}
                />
                <div className="flex items-center gap-2">
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
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!formData.isEnabled}
                  />
                  <span className="text-sm text-gray-600">saat</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>1 saat</span>
                <span>24 saat</span>
                <span>48 saat</span>
                <span>72 saat</span>
              </div>
            </div>

            {/* Quick Options */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500">Sürətli seçim:</span>
              {[1, 2, 4, 8, 12, 24, 48].map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setFormData({ ...formData, hoursBeforeDue: hours })}
                  disabled={!formData.isEnabled}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    formData.hoursBeforeDue === hours
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 disabled:opacity-50'
                  }`}
                >
                  {hours} saat
                </button>
              ))}
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isUpdating}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Yadda saxlanılır...</span>
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
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium">Bildirişlər necə işləyir?</p>
              <ul className="mt-2 space-y-1 text-blue-700">
                <li>Sistem hər 5 dəqiqədə bir tapşırıqları yoxlayır</li>
                <li>Bitmə vaxtı yaxınlaşan tapşırıqlar üçün təyin olunmuş userlərə bildiriş göndərilir</li>
                <li>Hər user üçün eyni tapşırıq yalnız bir dəfə bildiriş alır</li>
                <li>Bildirişlər brauzer vasitəsilə real vaxtda göndərilir</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
