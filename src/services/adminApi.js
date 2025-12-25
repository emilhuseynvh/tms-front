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
  tagTypes: ['Users', 'Spaces', 'Folders', 'TaskLists', 'Tasks', 'TaskStatuses', 'ActivityLogs', 'Trash'],
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

    createSpace: builder.mutation({
      query: (spaceData) => ({
        url: '/api/space',
        method: 'POST',
        body: spaceData,
      }),
      invalidatesTags: ['Spaces'],
    }),

    updateSpace: builder.mutation({
      query: ({ id, ...spaceData }) => ({
        url: `/api/space/${id}`,
        method: 'POST',
        body: spaceData,
      }),
      invalidatesTags: ['Spaces'],
    }),

    deleteSpace: builder.mutation({
      query: (id) => ({
        url: `/api/space/${id}`,
        method: 'DELETE',
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

    // Create folder
    createFolder: builder.mutation({
      query: (folderData) => ({
        url: '/api/folder',
        method: 'POST',
        body: folderData,
      }),
      invalidatesTags: ['Folders'],
    }),

    // Update folder
    updateFolder: builder.mutation({
      query: ({ id, ...folderData }) => ({
        url: `/api/folder/${id}`,
        method: 'POST',
        body: folderData,
      }),
      invalidatesTags: ['Folders'],
    }),

    // Delete folder
    deleteFolder: builder.mutation({
      query: (id) => ({
        url: `/api/folder/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Folders'],
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

    // Create task list
    createTaskList: builder.mutation({
      query: (taskListData) => ({
        url: '/api/task-list',
        method: 'POST',
        body: taskListData,
      }),
      invalidatesTags: ['TaskLists'],
    }),

    // Update task list
    updateTaskList: builder.mutation({
      query: ({ id, ...taskListData }) => ({
        url: `/api/task-list/${id}`,
        method: 'POST',
        body: taskListData,
      }),
      invalidatesTags: ['TaskLists'],
    }),

    // Delete task list
    deleteTaskList: builder.mutation({
      query: (id) => ({
        url: `/api/task-list/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TaskLists'],
    }),

    // Get tasks by task list
    getTasksByList: builder.query({
      query: ({ taskListId, search, startDate, endDate }) => {
        const params = new URLSearchParams()
        if (search) params.append('search', search)
        if (startDate) params.append('startDate', startDate)
        if (endDate) params.append('endDate', endDate)

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
      invalidatesTags: ['Tasks'],
    }),

    // Update task
    updateTask: builder.mutation({
      query: ({ id, ...taskData }) => ({
        url: `/api/task/${id}`,
        method: 'POST',
        body: taskData,
      }),
      invalidatesTags: ['Tasks'],
    }),

    // Delete task
    deleteTask: builder.mutation({
      query: (id) => ({
        url: `/api/task/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tasks'],
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
      invalidatesTags: ['Trash', 'Spaces'],
    }),

    restoreFolder: builder.mutation({
      query: (id) => ({
        url: `/api/trash/restore/folder/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['Trash', 'Folders'],
    }),

    restoreList: builder.mutation({
      query: (id) => ({
        url: `/api/trash/restore/list/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['Trash', 'TaskLists'],
    }),

    restoreTask: builder.mutation({
      query: (id) => ({
        url: `/api/trash/restore/task/${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['Trash', 'Tasks'],
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
  }),
})

export const {
  // Space hooks
  useGetSpacesQuery,
  useGetMySpacesQuery,
  useGetSpaceQuery,
  useCreateSpaceMutation,
  useUpdateSpaceMutation,
  useDeleteSpaceMutation,
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
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
  // TaskList hooks
  useGetTaskListsByFolderQuery,
  useGetTaskListsBySpaceQuery,
  useCreateTaskListMutation,
  useUpdateTaskListMutation,
  useDeleteTaskListMutation,
  // Task hooks
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
} = adminApi
