import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://tms-back.apasni.me/',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token')
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['Users', 'Spaces', 'Folders', 'TaskLists', 'Tasks', 'TaskStatuses', 'ActivityLogs', 'Trash', 'Archive', 'TaskActivities', 'NotificationSettings', 'Notifications'],
  endpoints: (builder) => ({
    // Space endpoints
    getSpaces: builder.query({
      query: () => '/api/space',
      providesTags: ['Spaces'],
    }),

    getMySpaces: builder.query({
      query: () => '/api/space/me',
      providesTags: ['Spaces'],
    }),

    getSpace: builder.query({
      query: (id) => `/api/space/${id}`,
      providesTags: ['Spaces'],
    }),

    getSpaceFullDetails: builder.query({
      query: ({ id, search }) => {
        const params = new URLSearchParams()
        if (search) params.append('search', search)
        const queryString = params.toString()
        return `/api/space/${id}/full${queryString ? `?${queryString}` : ''}`
      },
      providesTags: ['Spaces', 'Folders', 'TaskLists', 'Tasks'],
    }),

    createSpace: builder.mutation({
      query: (spaceData) => ({
        url: '/api/space',
        method: 'POST',
        body: spaceData,
      }),
      invalidatesTags: ['Spaces', 'ActivityLogs'],
    }),

    updateSpace: builder.mutation({
      query: ({ id, ...spaceData }) => ({
        url: `/api/space/${id}`,
        method: 'POST',
        body: spaceData,
      }),
      invalidatesTags: ['Spaces', 'ActivityLogs'],
    }),

    deleteSpace: builder.mutation({
      query: (id) => ({
        url: `/api/space/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Spaces', 'Trash', 'ActivityLogs'],
    }),

    reorderSpaces: builder.mutation({
      query: (spaceIds) => ({
        url: '/api/space/reorder',
        method: 'POST',
        body: { spaceIds },
      }),
      invalidatesTags: ['Spaces'],
    }),

    // Get all users
    getUsers: builder.query({
      query: () => '/api/user',
      providesTags: ['Users'],
    }),

    // Create user
    createUser: builder.mutation({
      query: (userData) => ({
        url: '/api/user',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['Users'],
    }),

    // Update user
    updateUser: builder.mutation({
      query: ({ id, ...userData }) => ({
        url: `/api/user/${id}`,
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['Users'],
    }),

    // Delete user
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/api/user/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Users'],
    }),

    // Update profile
    updateProfile: builder.mutation({
      query: (profileData) => ({
        url: '/api/user/me',
        method: 'POST',
        body: profileData,
      }),
    }),

    // Upload image
    uploadImage: builder.mutation({
      query: (formData) => ({
        url: '/api/uploads/image',
        method: 'POST',
        body: formData,
      }),
    }),

    // Get all folders
    getFolders: builder.query({
      query: () => '/api/folder',
      providesTags: ['Folders'],
    }),

    // Get my folders
    getMyFolders: builder.query({
      query: () => '/api/folder/me',
      providesTags: ['Folders'],
    }),

    // Get folders by space
    getFoldersBySpace: builder.query({
      query: (spaceId) => `/api/folder/space/${spaceId}`,
      providesTags: ['Folders'],
    }),

    getFolderFullDetails: builder.query({
      query: ({ id, search }) => {
        const params = new URLSearchParams()
        if (search) params.append('search', search)
        const queryString = params.toString()
        return `/api/folder/${id}/full${queryString ? `?${queryString}` : ''}`
      },
      providesTags: ['Folders', 'TaskLists', 'Tasks'],
    }),

    // Create folder
    createFolder: builder.mutation({
      query: (folderData) => ({
        url: '/api/folder',
        method: 'POST',
        body: folderData,
      }),
      invalidatesTags: ['Folders', 'ActivityLogs'],
    }),

    // Update folder
    updateFolder: builder.mutation({
      query: ({ id, ...folderData }) => ({
        url: `/api/folder/${id}`,
        method: 'POST',
        body: folderData,
      }),
      invalidatesTags: ['Folders', 'Spaces', 'ActivityLogs'],
    }),

    // Delete folder
    deleteFolder: builder.mutation({
      query: (id) => ({
        url: `/api/folder/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Folders', 'Trash', 'ActivityLogs'],
    }),

    reorderFolders: builder.mutation({
      query: ({ spaceId, folderIds }) => ({
        url: `/api/folder/reorder/${spaceId}`,
        method: 'POST',
        body: { folderIds },
      }),
      invalidatesTags: ['Folders', 'Spaces'],
    }),

    moveFolder: builder.mutation({
      query: ({ id, targetSpaceId }) => ({
        url: `/api/folder/${id}/move`,
        method: 'POST',
        body: { targetSpaceId },
      }),
      invalidatesTags: ['Folders', 'Spaces', 'ActivityLogs'],
    }),

    // Get task lists by folder
    getTaskListsByFolder: builder.query({
      query: ({ folderId, search, startDate, endDate }) => {
        const params = new URLSearchParams()
        if (search) params.append('search', search)
        if (startDate) params.append('startDate', startDate)
        if (endDate) params.append('endDate', endDate)

        const queryString = params.toString()
        return `/api/task-list/folder/${folderId}${queryString ? `?${queryString}` : ''}`
      },
      providesTags: ['TaskLists'],
    }),

    // Get task lists by space (direct lists)
    getTaskListsBySpace: builder.query({
      query: (spaceId) => `/api/task-list/space/${spaceId}`,
      providesTags: ['TaskLists'],
    }),

    // Get single task list
    getTaskList: builder.query({
      query: (id) => `/api/task-list/${id}`,
      providesTags: ['TaskLists'],
    }),

    // Create task list
    createTaskList: builder.mutation({
      query: (taskListData) => ({
        url: '/api/task-list',
        method: 'POST',
        body: taskListData,
      }),
      invalidatesTags: ['TaskLists', 'ActivityLogs'],
    }),

    // Update task list
    updateTaskList: builder.mutation({
      query: ({ id, ...taskListData }) => ({
        url: `/api/task-list/${id}`,
        method: 'POST',
        body: taskListData,
      }),
      invalidatesTags: ['TaskLists', 'Spaces', 'ActivityLogs'],
    }),

    // Delete task list
    deleteTaskList: builder.mutation({
      query: (id) => ({
        url: `/api/task-list/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TaskLists', 'Trash', 'ActivityLogs'],
    }),

    reorderTaskLists: builder.mutation({
      query: (listIds) => ({
        url: '/api/task-list/reorder',
        method: 'POST',
        body: { listIds },
      }),
      invalidatesTags: ['TaskLists', 'Spaces', 'Folders'],
    }),

    moveTaskList: builder.mutation({
      query: ({ id, targetFolderId, targetSpaceId }) => ({
        url: `/api/task-list/${id}/move`,
        method: 'POST',
        body: { targetFolderId, targetSpaceId },
      }),
      invalidatesTags: ['TaskLists', 'Spaces', 'Folders', 'ActivityLogs'],
    }),

    // Get my tasks (for notifications)
    getMyTasks: builder.query({
      query: () => '/api/task/my-tasks',
      providesTags: ['Tasks'],
    }),

    // Get tasks by task list
    getTasksByList: builder.query({
      query: ({ taskListId, search, startDate, endDate, statusId, assigneeId }) => {
        const params = new URLSearchParams()
        if (search) params.append('search', search)
        if (startDate) params.append('startDate', startDate)
        if (endDate) params.append('endDate', endDate)
        if (statusId) params.append('statusId', statusId)
        if (assigneeId) params.append('assigneeId', assigneeId)

        const queryString = params.toString()
        return `/api/task/list/${taskListId}${queryString ? `?${queryString}` : ''}`
      },
      providesTags: ['Tasks'],
    }),

    // Create task
    createTask: builder.mutation({
      query: (taskData) => ({
        url: '/api/task',
        method: 'POST',
        body: taskData,
      }),
      invalidatesTags: ['Tasks', 'ActivityLogs'],
    }),

    // Update task
    updateTask: builder.mutation({
      query: ({ id, ...taskData }) => ({
        url: `/api/task/${id}`,
        method: 'POST',
        body: taskData,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        'Tasks',
        'ActivityLogs',
        { type: 'TaskActivities', id }
      ],
    }),

    // Delete task
    deleteTask: builder.mutation({
      query: (id) => ({
        url: `/api/task/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tasks', 'Trash', 'ActivityLogs'],
    }),

    // Reorder task
    reorderTask: builder.mutation({
      query: (reorderData) => ({
        url: '/api/task/reorder',
        method: 'POST',
        body: reorderData,
      }),
      invalidatesTags: ['Tasks'],
    }),

    // Get task activities (for hover)
    getTaskActivities: builder.query({
      query: ({ taskId, limit = 10 }) => `/api/task/${taskId}/activities?limit=${limit}`,
      providesTags: (_result, _error, { taskId }) => [{ type: 'TaskActivities', id: taskId }],
    }),

    // Task Status endpoints
    getTaskStatuses: builder.query({
      query: () => '/api/task-status',
      providesTags: ['TaskStatuses'],
    }),

    createTaskStatus: builder.mutation({
      query: (statusData) => ({
        url: '/api/task-status',
        method: 'POST',
        body: statusData,
      }),
      invalidatesTags: ['TaskStatuses'],
    }),

    updateTaskStatus: builder.mutation({
      query: ({ id, ...statusData }) => ({
        url: `/api/task-status/${id}`,
        method: 'POST',
        body: statusData,
      }),
      invalidatesTags: ['TaskStatuses'],
    }),

    deleteTaskStatus: builder.mutation({
      query: (id) => ({
        url: `/api/task-status/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TaskStatuses'],
    }),

    // Activity Log endpoints
    getActivityLogs: builder.query({
      query: ({ page = 1, limit = 20, userId, type, search, startDate, endDate }) => {
        const params = new URLSearchParams()
        params.append('page', page)
        params.append('limit', limit)
        if (userId) params.append('userId', userId)
        if (type) params.append('type', type)
        if (search) params.append('search', search)
        if (startDate) params.append('startDate', startDate)
        if (endDate) params.append('endDate', endDate)
        return `/api/activity-log?${params.toString()}`
      },
      providesTags: ['ActivityLogs'],
    }),

    // Trash endpoints
    getTrash: builder.query({
      query: () => '/api/trash',
      providesTags: ['Trash'],
    }),

    restoreSpace: builder.mutation({
      query: (id) => ({
        url: `/api/trash/restore/space/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['Trash', 'Spaces', 'ActivityLogs'],
    }),

    restoreFolder: builder.mutation({
      query: (id) => ({
        url: `/api/trash/restore/folder/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['Trash', 'Folders', 'ActivityLogs'],
    }),

    restoreList: builder.mutation({
      query: (id) => ({
        url: `/api/trash/restore/list/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['Trash', 'TaskLists', 'ActivityLogs'],
    }),

    restoreTask: builder.mutation({
      query: (id) => ({
        url: `/api/trash/restore/task/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['Trash', 'Tasks', 'ActivityLogs'],
    }),

    permanentDeleteSpace: builder.mutation({
      query: (id) => ({
        url: `/api/trash/space/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Trash'],
    }),

    permanentDeleteFolder: builder.mutation({
      query: (id) => ({
        url: `/api/trash/folder/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Trash'],
    }),

    permanentDeleteList: builder.mutation({
      query: (id) => ({
        url: `/api/trash/list/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Trash'],
    }),

    permanentDeleteTask: builder.mutation({
      query: (id) => ({
        url: `/api/trash/task/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Trash'],
    }),

    getNotificationSettings: builder.query({
      query: () => '/api/notifications/settings',
      providesTags: ['NotificationSettings'],
    }),

    updateNotificationSettings: builder.mutation({
      query: (settingsData) => ({
        url: '/api/notifications/settings',
        method: 'PUT',
        body: settingsData,
      }),
      invalidatesTags: ['NotificationSettings'],
    }),

    getNotifications: builder.query({
      query: ({ filter = 'all', page = 1, limit = 20 } = {}) =>
        `/api/notifications?filter=${filter}&page=${page}&limit=${limit}`,
      providesTags: ['Notifications'],
    }),

    getUnreadNotificationCount: builder.query({
      query: () => '/api/notifications/unread-count',
      providesTags: ['Notifications'],
    }),

    markNotificationAsRead: builder.mutation({
      query: (id) => ({
        url: `/api/notifications/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notifications'],
    }),

    markAllNotificationsAsRead: builder.mutation({
      query: () => ({
        url: '/api/notifications/read-all',
        method: 'PUT',
      }),
      invalidatesTags: ['Notifications'],
    }),

    deleteNotification: builder.mutation({
      query: (id) => ({
        url: `/api/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notifications'],
    }),

    clearAllNotifications: builder.mutation({
      query: () => ({
        url: '/api/notifications/clear/all',
        method: 'DELETE',
      }),
      invalidatesTags: ['Notifications'],
    }),

    getArchive: builder.query({
      query: () => '/api/archive',
      providesTags: ['Archive'],
    }),

    archiveSpace: builder.mutation({
      query: (id) => ({
        url: `/api/archive/space/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['Archive', 'Spaces'],
    }),

    unarchiveSpace: builder.mutation({
      query: (id) => ({
        url: `/api/archive/unarchive/space/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['Archive', 'Spaces'],
    }),

    archiveFolder: builder.mutation({
      query: (id) => ({
        url: `/api/archive/folder/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['Archive', 'Folders'],
    }),

    unarchiveFolder: builder.mutation({
      query: (id) => ({
        url: `/api/archive/unarchive/folder/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['Archive', 'Folders'],
    }),

    archiveList: builder.mutation({
      query: (id) => ({
        url: `/api/archive/list/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['Archive', 'TaskLists'],
    }),

    unarchiveList: builder.mutation({
      query: (id) => ({
        url: `/api/archive/unarchive/list/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['Archive', 'TaskLists'],
    }),

    archiveTask: builder.mutation({
      query: (id) => ({
        url: `/api/archive/task/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['Archive', 'Tasks'],
    }),

    unarchiveTask: builder.mutation({
      query: (id) => ({
        url: `/api/archive/unarchive/task/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['Archive', 'Tasks'],
    }),
  }),
})

export const {
  // Space hooks
  useGetSpacesQuery,
  useGetMySpacesQuery,
  useGetSpaceQuery,
  useGetSpaceFullDetailsQuery,
  useCreateSpaceMutation,
  useUpdateSpaceMutation,
  useDeleteSpaceMutation,
  useReorderSpacesMutation,
  // User hooks
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useUpdateProfileMutation,
  useUploadImageMutation,
  // Folder hooks
  useGetFoldersQuery,
  useGetMyFoldersQuery,
  useGetFoldersBySpaceQuery,
  useGetFolderFullDetailsQuery,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
  useReorderFoldersMutation,
  useMoveFolderMutation,
  // TaskList hooks
  useGetTaskListsByFolderQuery,
  useGetTaskListsBySpaceQuery,
  useGetTaskListQuery,
  useCreateTaskListMutation,
  useUpdateTaskListMutation,
  useDeleteTaskListMutation,
  useReorderTaskListsMutation,
  useMoveTaskListMutation,
  // Task hooks
  useGetMyTasksQuery,
  useGetTasksByListQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useReorderTaskMutation,
  useGetTaskActivitiesQuery,
  // TaskStatus hooks
  useGetTaskStatusesQuery,
  useCreateTaskStatusMutation,
  useUpdateTaskStatusMutation,
  useDeleteTaskStatusMutation,
  // ActivityLog hooks
  useGetActivityLogsQuery,
  // Trash hooks
  useGetTrashQuery,
  useRestoreSpaceMutation,
  useRestoreFolderMutation,
  useRestoreListMutation,
  useRestoreTaskMutation,
  usePermanentDeleteSpaceMutation,
  usePermanentDeleteFolderMutation,
  usePermanentDeleteListMutation,
  usePermanentDeleteTaskMutation,
  // Notification Settings hooks
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  // Notification hooks
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useClearAllNotificationsMutation,
  // Archive hooks
  useGetArchiveQuery,
  useArchiveSpaceMutation,
  useUnarchiveSpaceMutation,
  useArchiveFolderMutation,
  useUnarchiveFolderMutation,
  useArchiveListMutation,
  useUnarchiveListMutation,
  useArchiveTaskMutation,
  useUnarchiveTaskMutation,
} = adminApi
