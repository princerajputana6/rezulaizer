'use client';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { X } from 'lucide-react';
import { selectModals, closeModal } from '../../redux/slices/uiSlice';

const Modal = () => {
  const dispatch = useDispatch();
  const { isOpen, type, data } = useSelector(selectModals);

  if (!isOpen) return null;

  const handleClose = () => {
    dispatch(closeModal());
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const renderModalContent = () => {
    switch (type) {
      case 'confirm':
        return (
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {data?.title || 'Confirm Action'}
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              {data?.message || 'Are you sure you want to proceed?'}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  data?.onConfirm?.();
                  handleClose();
                }}
                className="btn btn-danger"
              >
                {data?.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        );

      case 'info':
        return (
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {data?.title || 'Information'}
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              {data?.message}
            </p>
            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="btn btn-primary"
              >
                OK
              </button>
            </div>
          </div>
        );

      case 'custom':
        return data?.component || null;

      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="animate-slide-up">
        {renderModalContent()}
      </div>
    </div>
  );
};

export default Modal;