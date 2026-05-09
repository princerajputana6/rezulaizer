'use client';
import React, { useState, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import { useSelector } from 'react-redux';
import { apiClient } from '../services/apiClient';
import { selectCurrentUser, selectToken, selectIsAuthenticated } from '../redux/slices/authSlice';
import UserTable from '../components/UserTable';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useSelector(selectCurrentUser);
  const token = useSelector(selectToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    const fetchUsers = async () => {
      // Debug authentication state
      console.log('Auth Debug:', {
        isAuthenticated,
        hasToken: !!token,
        currentUser,
        userRole: currentUser?.role
      });

      if (!isAuthenticated || !token) {
        console.error('Not authenticated or no token available');
        setLoading(false);
        return;
      }

      if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
        console.error('User does not have admin privileges:', currentUser?.role);
        setLoading(false);
        return;
      }

      try {
        console.log('Making API request to /users with token:', token?.substring(0, 20) + '...');
        const response = await apiClient.get('/users');
        console.log('API Response:', response.data);
        
        // Handle the response structure properly
        if (response.data.success && response.data.data) {
          setUsers(response.data.data.users || []);
        } else {
          setUsers([]);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        console.error('Error details:', {
          status: error.response?.status,
          message: error.response?.data?.message,
          headers: error.config?.headers
        });
        setUsers([]);
      }
      setLoading(false);
    };

    fetchUsers();
  }, [isAuthenticated, token, currentUser]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Link to="/users/add" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Add User
        </Link>
      </div>
      {!isAuthenticated && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          You are not authenticated. Please log in first.
        </div>
      )}
      {isAuthenticated && currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin' && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          You need admin privileges to access user management. Current role: {currentUser?.role}
        </div>
      )}
      {loading ? <p>Loading...</p> : <UserTable users={users} />}
    </div>
  );
};

export default UserManagement;