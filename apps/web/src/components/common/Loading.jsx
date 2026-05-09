'use client';
import React from 'react';
import { useSelector } from 'react-redux';
import { selectGlobalLoading } from '../../redux/slices/uiSlice';

const Loading = () => {
  const isLoading = useSelector(selectGlobalLoading);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
};

export default Loading;