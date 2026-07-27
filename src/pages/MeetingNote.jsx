import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { toast } from 'react-toastify'
import {
  useGetTaskListQuery,
  useUpdateTaskListMutation,
} from '../services/adminApi'

const MeetingNote = () => {
  const { spaceId, folderId, taskListId } = useParams()
  const navigate = useNavigate()

  const { data: taskListData, isLoading } = useGetTaskListQuery(taskListId)
  const [updateTaskList] = useUpdateTaskListMutation()

  const [content, setContent] = useState('')
  const [saveStatus, setSaveStatus] = useState('saved') // saved | dirty | saving
  const loadedListIdRef = useRef(null)
  const saveTimeoutRef = useRef(null)
  const contentRef = useRef('')
  contentRef.current = content

  // Server məlumatını yalnız ilk yüklənəndə lokal state-ə köçür (yazarkən üstələməsin)
  useEffect(() => {
    if (taskListData && loadedListIdRef.current !== taskListData.id) {
      loadedListIdRef.current = taskListData.id
      setContent(taskListData.content || '')
      setSaveStatus('saved')
    }
  }, [taskListData])

  const saveContent = async (value) => {
    setSaveStatus('saving')
    try {
      await updateTaskList({ id: parseInt(taskListId), content: value }).unwrap()
      setSaveStatus('saved')
    } catch (error) {
      setSaveStatus('dirty')
      toast.error(error?.data?.message || 'Qeyd saxlanılarkən xəta baş verdi!')
    }
  }

  const handleContentChange = (e) => {
    setContent(e.target.value)
    setSaveStatus('dirty')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveContent(contentRef.current), 1500)
  }

  const handleManualSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveContent(contentRef.current)
  }

  // Ctrl/Cmd+S ilə saxla
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleManualSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Səhifədən çıxanda gözləyən debounce-u təmizlə
  useEffect(() => () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          title="Geri"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <nav className="flex items-center text-sm md:text-base flex-1 min-w-0">
          {(taskListData?.folder?.space || taskListData?.space) && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/tasks/space/${spaceId || taskListData?.folder?.space?.id || taskListData?.space?.id}`)}
                className="text-gray-500 font-medium hover:text-blue-600 hover:underline transition-colors"
              >
                {taskListData?.folder?.space?.name || taskListData?.space?.name}
              </button>
              <svg className="w-4 h-4 mx-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
          {taskListData?.folder && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/tasks/space/${spaceId || taskListData?.folder?.space?.id}/folder/${folderId || taskListData.folder.id}`)}
                className="text-gray-500 font-medium hover:text-blue-600 hover:underline transition-colors"
              >
                {taskListData.folder.name}
              </button>
              <svg className="w-4 h-4 mx-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
          <span className="text-gray-900 font-semibold truncate">
            {taskListData?.name || 'Meeting note'}
          </span>
        </nav>

        <span className="text-xs text-gray-400 shrink-0">
          {saveStatus === 'saving' && 'Saxlanılır...'}
          {saveStatus === 'saved' && 'Saxlanıldı'}
          {saveStatus === 'dirty' && 'Saxlanılmamış dəyişikliklər'}
        </span>
        <button
          onClick={handleManualSave}
          disabled={saveStatus !== 'dirty'}
          className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          Saxla
        </button>
      </div>

      {/* Note editor */}
      <textarea
        value={content}
        onChange={handleContentChange}
        onBlur={() => saveStatus === 'dirty' && handleManualSave()}
        placeholder="Görüş qeydlərini bura yazın..."
        className="flex-1 w-full p-4 text-sm text-gray-800 bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent leading-relaxed"
      />
    </div>
  )
}

export default MeetingNote
