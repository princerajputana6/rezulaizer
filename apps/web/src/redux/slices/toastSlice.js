import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  toasts: []
};

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    showToast: (state, action) => {
      const { message, type = 'info', duration = 5000 } = action.payload;
      const id = Date.now() + Math.random();
      
      state.toasts.push({
        id,
        message,
        type,
        duration,
        timestamp: Date.now()
      });
    },
    hideToast: (state, action) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },
    clearAllToasts: (state) => {
      state.toasts = [];
    }
  }
});

export const { showToast, hideToast, clearAllToasts } = toastSlice.actions;
export default toastSlice.reducer;
