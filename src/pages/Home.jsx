import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useGetMySpacesQuery, useGetSpaceFullDetailsQuery } from '../services/adminApi'
import InlineTaskTable from '../components/InlineTaskTable'

/** Bir siyahının bloku: başlıq + inline task cədvəli */
const ListBlock = ({ list, folderName, spaceId, folderId, navigate }) => {
  const isMeeting = list.type === 'meeting'
  const base = folderId ? `/tasks/space/${spaceId}/folder/${folderId}` : `/tasks/space/${spaceId}`
  const url = isMeeting ? `${base}/note/${list.id}` : `${base}/list/${list.id}`

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/80 border-b border-gray-100">
        {isMeeting ? (
          <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        )}
        <button
          type="button"
          onClick={() => navigate(url)}
          className="font-medium text-sm text-gray-900 hover:text-blue-600 truncate text-left"
        >
          {list.name}
        </button>
        {folderName && (
          <span className="text-[11px] text-gray-400 truncate">/ {folderName}</span>
        )}
        {!isMeeting && (
          <span className="ml-auto text-[11px] text-gray-400 shrink-0">
            {(list.tasks || []).filter((t) => !t.parentId).length} tapşırıq
          </span>
        )}
      </div>
      {isMeeting ? (
        <div className="px-3 py-3 text-xs text-gray-500">
          Meeting note —{' '}
          <button type="button" onClick={() => navigate(url)} className="text-blue-600 hover:underline">
            açmaq üçün klikləyin
          </button>
        </div>
      ) : (
        <InlineTaskTable
          tasks={list.tasks || []}
          taskListId={list.id}
          emptyText="Bu siyahıda tapşırıq yoxdur"
        />
      )}
    </div>
  )
}

/** Bir workspace-in (space) icmalı — açılanda tam detallar yüklənir */
const SpaceOverview = ({ space, navigate }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { data, isLoading } = useGetSpaceFullDetailsQuery(
    { id: space.id },
    { skip: !isExpanded }
  )

  const folders = data?.folders || []
  const directLists = data?.directLists || []
  const taskCount = data?.allTasks?.length

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Space başlığı */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">{space.name}</h2>
          <p className="text-xs text-gray-500">
            {(space.folders?.length || 0)} qovluq · {(space.taskLists?.filter((l) => !l.folderId).length || 0)} birbaşa siyahı
            {isExpanded && taskCount !== undefined && ` · ${taskCount} tapşırıq`}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate(`/tasks/space/${space.id}`) }}
          className="text-xs text-blue-600 hover:underline shrink-0 px-2"
        >
          Sahəyə keç →
        </button>
      </div>

      {/* İçərik */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-3 sm:p-4 space-y-4 bg-gray-50/40">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : folders.length === 0 && directLists.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">Bu sahədə siyahı yoxdur.</p>
          ) : (
            <>
              {directLists.map((list) => (
                <ListBlock
                  key={list.id}
                  list={list}
                  spaceId={space.id}
                  navigate={navigate}
                />
              ))}
              {folders.map((folder) =>
                (folder.taskLists || []).map((list) => (
                  <ListBlock
                    key={list.id}
                    list={list}
                    folderName={folder.name}
                    spaceId={space.id}
                    folderId={folder.id}
                    navigate={navigate}
                  />
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

const Home = () => {
  const navigate = useNavigate()
  const { data: mySpaces = [], isLoading } = useGetMySpacesQuery()

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Ana səhifə</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bütün workspace-lərin icmalı — siyahılar və tapşırıqlar üzərində birbaşa əməliyyat aparın
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : mySpaces.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 font-medium">Heç bir sahə tapılmadı.</p>
          <p className="text-sm text-gray-500 mt-2">Sidebar-dan yeni sahə yaradın.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mySpaces.map((space) => (
            <SpaceOverview key={space.id} space={space} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Home
