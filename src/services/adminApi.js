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
  tagTypes: ['Users', 'Folders', 'TaskLists', 'Tasks'],
  endpoints: (builder) => ({
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
  }),
})

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useUpdateProfileMutation,
  useUploadImageMutation,
  useGetFoldersQuery,
  useGetMyFoldersQuery,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
  useGetTaskListsByFolderQuery,
  useCreateTaskListMutation,
  useUpdateTaskListMutation,
  useDeleteTaskListMutation,
  useGetTasksByListQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useReorderTaskMutation,
} = adminApi
