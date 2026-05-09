'use client';
import React from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectToken, selectIsAuthenticated } from '../redux/slices/authSlice';

const AuthDebug = () => {
  const currentUser = useSelector(selectCurrentUser);
  const token = useSelector(selectToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  return (
    <div className="bg-gray-100 p-4 rounded-lg mb-4 text-sm">
      <h3 className="font-bold mb-2">Authentication Debug Info:</h3>
      <div className="space-y-1">
        <div><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</div>
        <div><strong>Has Token:</strong> {token ? 'Yes' : 'No'}</div>
        <div><strong>Token Preview:</strong> {token ? token.substring(0, 30) + '...' : 'None'}</div>
        <div><strong>User:</strong> {currentUser ? JSON.stringify(currentUser, null, 2) : 'None'}</div>
        <div><strong>User Role:</strong> {currentUser?.role || 'None'}</div>
        <div><strong>LocalStorage Token:</strong> {localStorage.getItem('token') ? 'Present' : 'Missing'}</div>
      </div>
    </div>
  );
};

export default AuthDebug;