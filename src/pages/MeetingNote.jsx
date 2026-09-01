import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { toast } from 'react-toastify'
import {
  useGetTaskListQuery,
  useUpdateTaskListMutation,
} from '../services/adminApi'

// Köhnə plain-text qeydləri HTML-ə çevir
const toEditorHtml = (raw) => {
  if (!raw) return ''
  if (raw.includes('<')) return raw
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .split('\n')
    .map((line) => `<div>${line || '<br>'}</div>`)
    .join('')
}

const ToolbarButton = ({ onAction, title, children, className = '', active = false }) => (
  <button
    type="button"
    title={title}
    aria-pressed={active}
    onMouseDown={(e) => {
      e.preventDefault()
      onAction()
    }}
    className={`px-2 py-1 min-w-[30px] text-sm rounded transition-colors ${
      active
        ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    } ${className}`}
  >
    {children}
  </button>
)

const MeetingNote = () => {
  const { spaceId, folderId, taskListId } = useParams()
  const navigate = useNavigate()

  const { data: taskListData, isLoading } = useGetTaskListQuery(taskListId)
  const [updateTaskList] = useUpdateTaskListMutation()

  const [saveStatus, setSaveStatus] = useState('saved') // saved | dirty | saving
  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    heading: '',
  })
  const editorRef = useRef(null)
  const loadedListIdRef = useRef(null)
  const saveTimeoutRef = useRef(null)

  // Server məlumatını yalnız ilk yüklənəndə editora köçür (yazarkən üstələməsin)
  useEffect(() => {
    if (taskListData && loadedListIdRef.current !== taskListData.id && editorRef.current) {
      loadedListIdRef.current = taskListData.id
      editorRef.current.innerHTML = toEditorHtml(taskListData.content || '')
      setSaveStatus('saved')
    }
  }, [taskListData])

  const refreshFormats = () => {
    const sel = window.getSelection()
    if (!sel?.anchorNode || !editorRef.current?.contains(sel.anchorNode)) return
    const heading = (document.queryCommandValue('formatBlock') || '')
      .toLowerCase()
      .replace(/[<>]/g, '')
    setFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      heading,
    })
  }

  const saveContent = async () => {
    if (!editorRef.current) return
    setSaveStatus('saving')
    try {
      await updateTaskList({ id: parseInt(taskListId), content: editorRef.current.innerHTML }).unwrap()
      setSaveStatus('saved')
    } catch (error) {
      setSaveStatus('dirty')
      toast.error(error?.data?.message || 'Qeyd saxlanılarkən xəta baş verdi!')
    }
  }

  const markDirty = () => {
    setSaveStatus('dirty')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(saveContent, 1500)
  }

  const handleManualSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveContent()
  }

  // Toolbar əmrləri
  const exec = (command, value = null) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    markDirty()
    refreshFormats()
  }

  const applyHeading = (tag) => {
    const current = (document.queryCommandValue('formatBlock') || '').toLowerCase()
    exec('formatBlock', current === tag ? 'div' : tag)
  }

  const insertChecklist = () => {
    exec('insertHTML', '<ul class="checklist"><li><input type="checkbox">&nbsp;</li></ul><div><br></div>')
  }

  // Başlıq sətrində Enter basanda növbəti sətir normal mətn olsun (başlıq davam etməsin)
  const handleEditorKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    const sel = window.getSelection()
    if (!sel?.anchorNode) return
    const node = sel.anchorNode.nodeType === Node.ELEMENT_NODE ? sel.anchorNode : sel.anchorNode.parentElement
    const heading = node?.closest?.('h1, h2, h3, h4')
    if (heading && editorRef.current?.contains(heading)) {
      e.preventDefault()
      document.execCommand('insertParagraph')
      document.execCommand('formatBlock', false, 'div')
      markDirty()
    }
  }

  // Checkbox kliklərini HTML atributuna sinxronlaşdır ki, saxlananda vəziyyət itməsin
  const handleEditorClick = (e) => {
    if (e.target.matches?.('input[type="checkbox"]')) {
      if (e.target.checked) {
        e.target.setAttribute('checked', '')
      } else {
        e.target.removeAttribute('checked')
      }
      markDirty()
    }
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

  useEffect(() => {
    document.addEventListener('selectionchange', refreshFormats)
    return () => document.removeEventListener('selectionchange', refreshFormats)
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

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 bg-white border border-gray-200 border-b-0 rounded-t-lg">
        <ToolbarButton title="Qalın (Ctrl+B)" onAction={() => exec('bold')} active={formats.bold} className="font-bold">B</ToolbarButton>
        <ToolbarButton title="Kursiv (Ctrl+I)" onAction={() => exec('italic')} active={formats.italic} className="italic">I</ToolbarButton>
        <ToolbarButton title="Altdan xətt (Ctrl+U)" onAction={() => exec('underline')} active={formats.underline} className="underline">U</ToolbarButton>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolbarButton title="Başlıq 1" onAction={() => applyHeading('h1')} active={formats.heading === 'h1'} className="font-semibold">H1</ToolbarButton>
        <ToolbarButton title="Başlıq 2" onAction={() => applyHeading('h2')} active={formats.heading === 'h2'} className="font-semibold">H2</ToolbarButton>
        <ToolbarButton title="Başlıq 3" onAction={() => applyHeading('h3')} active={formats.heading === 'h3'} className="font-semibold">H3</ToolbarButton>
        <ToolbarButton title="Başlıq 4" onAction={() => applyHeading('h4')} active={formats.heading === 'h4'} className="font-semibold">H4</ToolbarButton>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolbarButton title="Ayırıcı xətt" onAction={() => exec('insertHorizontalRule')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeWidth={2} d="M4 12h16" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="Checklist" onAction={insertChecklist}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Note editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => {
          markDirty()
          refreshFormats()
        }}
        onKeyDown={handleEditorKeyDown}
        onKeyUp={refreshFormats}
        onClick={(e) => {
          handleEditorClick(e)
          refreshFormats()
        }}
        onBlur={() => saveStatus === 'dirty' && handleManualSave()}
        data-placeholder="Görüş qeydlərini bura yazın..."
        className="note-editor flex-1 w-full p-4 text-sm text-gray-800 bg-white border border-gray-200 rounded-b-lg overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent leading-relaxed"
      />
    </div>
  )
}

export default MeetingNote
