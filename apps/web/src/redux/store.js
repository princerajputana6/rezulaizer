import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import testSlice from './slices/testSlice';
import userSlice from './slices/userSlice';
import uiSlice from './slices/uiSlice';
import toastSlice from './slices/toastSlice';
import { apiSlice } from './api/apiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    test: testSlice,
    user: userSlice,
    ui: uiSlice,
    toast: toastSlice,
    api: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(apiSlice.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;
