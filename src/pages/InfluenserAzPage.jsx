import { useState } from 'react'
import { Link } from 'react-router'
import { useGetMySpacesQuery, useGetAppSettingsQuery, useSetAppSettingMutation } from '../services/adminApi'
import { useVerifyQuery } from '../services/authApi'
import { toast } from 'react-toastify'

const sectionLabel = 'text-[11px] font-semibold uppercase tracking-wider text-indigo-600/90'

export const DEFAULT_WORKSPACE_NAME = 'influenser.az'

/**
 * Bütün sahələr və siyahıların tam səhifə görünüşü (sidebar → workspace).
 */
export default function InfluenserAzPage() {
  const { data: mySpaces = [], isLoading } = useGetMySpacesQuery()
  const { data: settings = {} } = useGetAppSettingsQuery()
  const { data: currentUser } = useVerifyQuery()
  const [setAppSetting, { isLoading: isSaving }] = useSetAppSettingMutation()

  const isAdmin = currentUser?.role === 'admin'
  const workspaceName = settings.workspaceName || DEFAULT_WORKSPACE_NAME

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const startEditing = () => {
    setNameInput(workspaceName)
    setIsEditingName(true)
  }

  const saveName = async () => {
    if (!nameInput.trim()) return
    try {
      await setAppSetting({ key: 'workspaceName', value: nameInput.trim() }).unwrap()
      toast.success('Workspace adı yeniləndi!')
      setIsEditingName(false)
    } catch (error) {
      toast.error(error?.data?.message || 'Xəta baş verdi!')
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 md:py-10 min-h-[calc(100vh-8rem)]">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 text-white p-6 sm:p-8 md:p-10 mb-8 md:mb-10 shadow-lg shadow-indigo-900/20 ring-1 ring-white/10">
        <p className="text-indigo-200/90 text-sm font-medium mb-1">Navigasiya</p>
        {isEditingName ? (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') setIsEditingName(false)
              }}
              autoFocus
              className="text-2xl sm:text-3xl font-bold tracking-tight bg-white/10 border border-white/30 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-white/50 text-white min-w-0"
            />
            <button
              onClick={saveName}
              disabled={isSaving || !nameInput.trim()}
              className="px-3 py-1.5 text-sm font-medium bg-white text-indigo-900 rounded-md hover:bg-indigo-50 disabled:opacity-50 transition-colors"
            >
              Saxla
            </button>
            <button
              onClick={() => setIsEditingName(false)}
              className="px-3 py-1.5 text-sm font-medium border border-white/40 rounded-md hover:bg-white/10 transition-colors"
            >
              Ləğv et
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{workspaceName}</h1>
            {isAdmin && (
              <button
                onClick={startEditing}
                className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title="Workspace adını dəyiş"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>
        )}
        <p className="text-indigo-100/90 mt-2 text-sm sm:text-base max-w-2xl">
          Bütün sahələriniz və onların altındakı siyahılar — bir ekranda.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-28">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : mySpaces.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 p-14 md:p-16 text-center">
          <p className="text-gray-600 font-medium">Heç bir sahə tapılmadı.</p>
          <p className="text-sm text-gray-500 mt-2">Yeni sahə yaratmaq üçün sidebar-da «Tapşırıqlar» altından əlavə edin.</p>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8">
          {mySpaces.map((space) => {
            const directLists = (space.taskLists || []).filter((l) => !l.folderId)
            const folderList = space.folders || []
            return (
              <div
                key={space.id}
                className="rounded-2xl border border-gray-200/90 bg-white shadow-md shadow-gray-200/50 overflow-hidden ring-1 ring-gray-100"
              >
                <Link
                  to={`/tasks/space/${space.id}`}
                  className="flex items-center gap-3 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-50 to-indigo-50/60 hover:from-indigo-50 hover:to-violet-50 transition-colors group"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm group-hover:bg-indigo-700 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-gray-900 text-base sm:text-lg truncate block group-hover:text-indigo-900 transition-colors">
                      {space.name}
                    </span>
                    <span className="text-xs text-indigo-600/80 font-medium">Sahəyə keç →</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-5 text-sm border-t border-gray-100 bg-white">
                  {directLists.length > 0 && (
                    <div>
                      <div className={`${sectionLabel} mb-2`}>Siyahılar (birbaşa)</div>
                      <ul className="grid gap-1 sm:grid-cols-1 lg:grid-cols-2">
                        {directLists.map((list) => (
                          <li key={list.id}>
                            <Link
                              to={`/tasks/space/${space.id}/list/${list.id}`}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-indigo-200 hover:bg-indigo-50/80 text-gray-800 hover:text-indigo-900 transition-all"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              </span>
                              <span className="font-medium truncate">{list.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {folderList.map((folder) => {
                    const lists = folder.taskLists || []
                    if (lists.length === 0) return null
                    return (
                      <div key={folder.id} className="pt-1 border-t border-gray-100 first:border-t-0 first:pt-0">
                        <Link
                          to={`/tasks/space/${space.id}/folder/${folder.id}`}
                          className={`${sectionLabel} mb-2 flex items-center gap-2 hover:text-indigo-800 hover:underline transition-colors w-fit`}
                        >
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          </span>
                          {folder.name}
                        </Link>
                        <ul className="grid gap-1 sm:grid-cols-1 lg:grid-cols-2 border-l-2 border-indigo-100 pl-3 ml-1">
                          {lists.map((list) => (
                            <li key={list.id}>
                              <Link
                                to={`/tasks/space/${space.id}/folder/${folder.id}/list/${list.id}`}
                                className="flex items-center gap-3 py-2.5 px-2 -ml-2 rounded-xl hover:bg-violet-50 text-gray-800 hover:text-violet-900 transition-colors"
                              >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                </span>
                                <span className="font-medium truncate">{list.name}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                  {directLists.length === 0 && folderList.every((f) => !(f.taskLists || []).length) && (
                    <p className="text-sm text-gray-500 py-2">Bu sahədə siyahı yoxdur.</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
