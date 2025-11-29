import { configureStore } from '@reduxjs/toolkit'
import { authApi } from './authApi'
import { adminApi } from './adminApi'
import { chatApi } from './chatApi'

export const store = configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      adminApi.middleware,
      chatApi.middleware
    ),
})