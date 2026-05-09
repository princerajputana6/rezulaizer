import { createSlice } from '@reduxjs/toolkit';

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const token = isBrowser ? localStorage.getItem('token') : null;
const storedUser = isBrowser && localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

// Helper function to ensure user has role field for backward compatibility
const ensureUserRole = (user) => {
  if (!user) return null;
  if (user.role) return user; // Already has role
  
  // Try to infer role from other fields for backward compatibility
  if (user.permissions?.systemSettings) return { ...user, role: 'superadmin' };
  if (user.permissions?.manageUsers) return { ...user, role: 'company_admin' };
  if (user.permissions?.viewReports) return { ...user, role: 'hr_manager' };
  
  return { ...user, role: 'candidate' }; // Default fallback
};

const user = ensureUserRole(storedUser);

const initialState = {
  user: user,
  token: token,
  isAuthenticated: !!token && !!user,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      const userWithRole = ensureUserRole(action.payload.user);
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = userWithRole;
      state.token = action.payload.token;
      state.error = null;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(userWithRole));
    },
    loginFailure: (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = action.payload;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    setCredentials: (state, action) => {
      const userWithRole = ensureUserRole(action.payload.user);
      state.user = userWithRole;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(userWithRole));
    },
    clearError: (state) => {
      state.error = null;
    },
    updateProfile: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  setCredentials,
  clearError,
  updateProfile,
} = authSlice.actions;

export const selectCurrentUser = (state) => state.auth.user;
export const selectToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer;
