import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const chatApi = createApi({
  reducerPath: 'chatApi',
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
  tagTypes: ['Rooms', 'Messages'],
  endpoints: (builder) => ({
    // Get all chat rooms
    getRooms: builder.query({
      query: () => '/api/chat/rooms',
      providesTags: ['Rooms'],
    }),

    // Get single room
    getRoom: builder.query({
      query: (roomId) => `/api/chat/rooms/${roomId}`,
      providesTags: (result, error, roomId) => [{ type: 'Rooms', id: roomId }],
    }),

    // Create direct chat
    createDirectChat: builder.mutation({
      query: (userId) => ({
        url: '/api/chat/direct',
        method: 'POST',
        body: { userId },
      }),
      invalidatesTags: ['Rooms'],
    }),

    // Create group chat
    createGroupChat: builder.mutation({
      query: (groupData) => ({
        url: '/api/chat/group',
        method: 'POST',
        body: groupData,
      }),
      invalidatesTags: ['Rooms'],
    }),

    // Add member to group
    addMemberToGroup: builder.mutation({
      query: ({ roomId, userIds }) => ({
        url: '/api/chat/group/add-member',
        method: 'POST',
        body: { roomId, userIds },
      }),
      invalidatesTags: (result, error, { roomId }) => [
        { type: 'Rooms', id: roomId },
        'Rooms',
      ],
    }),

    // Get messages for a room
    getMessages: builder.query({
      query: (roomId) => `/api/chat/rooms/${roomId}/messages`,
      providesTags: (result, error, roomId) => [{ type: 'Messages', id: roomId }],
    }),

    // Send message
    sendMessage: builder.mutation({
      query: ({ roomId, content, currentUserId }) => ({
        url: `/api/chat/rooms/${roomId}/messages`,
        method: 'POST',
        body: { content }, // Don't send currentUserId to backend
      }),
      // Optimistic update
      async onQueryStarted({ roomId, content, currentUserId }, { dispatch, queryFulfilled }) {
        // Optimistic update - add message to cache immediately
        const patchResult = dispatch(
          chatApi.util.updateQueryData('getMessages', roomId, (draft) => {
            draft.push({
              id: `temp-${Date.now()}`,
              content,
              senderId: currentUserId, // Use current user's ID
              createdAt: new Date().toISOString(),
              _isOptimistic: true, // Mark as optimistic
              sender: null, // Backend will provide full sender object
            })
          })
        )

        try {
          const { data } = await queryFulfilled

          // Replace optimistic message with real one from server
          dispatch(
            chatApi.util.updateQueryData('getMessages', roomId, (draft) => {
              const index = draft.findIndex(m => m._isOptimistic)
              if (index !== -1) {
                draft.splice(index, 1, data)
              }
            })
          )
        } catch {
          // Revert optimistic update on error
          patchResult.undo()
          console.error('Failed to send message')
        }
      },
    }),

    // Mark messages as read
    markAsRead: builder.mutation({
      query: (roomId) => ({
        url: `/api/chat/rooms/${roomId}/read`,
        method: 'POST',
      }),
      // Invalidate rooms to refetch with correct unreadCount from backend
      invalidatesTags: ['Rooms'],
    }),

    // Search users and messages
    searchChat: builder.query({
      query: (query) => `/api/chat/search?q=${encodeURIComponent(query)}`,
    }),
  }),
})

export const {
  useGetRoomsQuery,
  useGetRoomQuery,
  useCreateDirectChatMutation,
  useCreateGroupChatMutation,
  useAddMemberToGroupMutation,
  useGetMessagesQuery,
  useSendMessageMutation,
  useMarkAsReadMutation,
  useSearchChatQuery,
} = chatApi
