import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { API_BASE_URL } from '../config/api'

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/`,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token')?.replace(/^"|"$/g, '').trim()
      if (token && token !== 'null' && token !== 'undefined') {
        headers.set('Authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/api/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'], // Invalidate user data on login
    }),
    verify: builder.query({
      query: () => '/api/auth/verify',
      providesTags: ['User'],
    }),
  }),
})

export const { useLoginMutation, useVerifyQuery } = authApi
