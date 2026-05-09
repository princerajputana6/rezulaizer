'use client';
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { hideToast } from '../../redux/slices/toastSlice';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';

const Toast = () => {
  const dispatch = useDispatch();
  const toasts = useSelector(state => state.toast.toasts);

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const handleClose = (id) => {
    dispatch(hideToast(id));
  };

  // Auto-hide toasts after their duration
  useEffect(() => {
    toasts.forEach(toast => {
      if (toast.duration > 0) {
        const timer = setTimeout(() => {
          dispatch(hideToast(toast.id));
        }, toast.duration);

        return () => clearTimeout(timer);
      }
    });
  }, [toasts, dispatch]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center p-4 border rounded-lg shadow-lg max-w-sm animate-slide-in ${getToastStyles(toast.type)}`}
        >
          <div className="flex-shrink-0 mr-3">
            {getToastIcon(toast.type)}
          </div>
          <div className="flex-1 text-sm font-medium">
            {toast.message}
          </div>
          <button
            onClick={() => handleClose(toast.id)}
            className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;