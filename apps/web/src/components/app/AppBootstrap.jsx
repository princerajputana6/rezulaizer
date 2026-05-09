'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '@/redux/slices/authSlice';
import { selectToast, hideToast } from '@/redux/slices/uiSlice';
import { apiClient } from '@/services/apiClient';
import LegacyToast from '@/components/common/Toast';

function UiToastBanner() {
  const dispatch = useDispatch();
  const toast = useSelector(selectToast);

  useEffect(() => {
    if (toast?.show) {
      const timer = setTimeout(() => dispatch(hideToast()), toast.duration || 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, dispatch]);

  if (!toast?.show) return null;

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[60] px-4 py-3 border rounded-lg shadow-lg max-w-sm ${
        styles[toast.type] || styles.info
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 text-sm font-medium">{toast.message}</div>
        <button
          onClick={() => dispatch(hideToast())}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function AppBootstrap({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      apiClient
        .get('/auth/me')
        .then((response) => {
          dispatch(
            setCredentials({
              user: response.data?.data?.user,
              token,
            })
          );
        })
        .catch(() => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
          }
        });
    }
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-50">
      <UiToastBanner />
      <LegacyToast />
      {children}
    </div>
  );
}
