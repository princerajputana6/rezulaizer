import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  users: [],
  currentUser: null,
  isLoading: false,
  error: null,
  filters: {
    role: 'all',
    status: 'all',
    search: '',
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUsers: (state, action) => {
      state.users = action.payload.users;
      state.pagination = action.payload.pagination;
      state.isLoading = false;
    },
    addUser: (state, action) => {
      state.users.unshift(action.payload);
    },
    updateUser: (state, action) => {
      const index = state.users.findIndex(user => user.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = action.payload;
      }
    },
    deleteUser: (state, action) => {
      state.users = state.users.filter(user => user.id !== action.payload);
    },
    setCurrentUser: (state, action) => {
      state.currentUser = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    resetUser: (state) => {
      state.currentUser = null;
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setError,
  clearError,
  setUsers,
  addUser,
  updateUser,
  deleteUser,
  setCurrentUser,
  setFilters,
  setPagination,
  resetUser,
} = userSlice.actions;

export const selectUsers = (state) => state.user.users;
export const selectCurrentUser = (state) => state.user.currentUser;
export const selectUserLoading = (state) => state.user.isLoading;
export const selectUserError = (state) => state.user.error;
export const selectUserFilters = (state) => state.user.filters;
export const selectUserPagination = (state) => state.user.pagination;

export default userSlice.reducer;
