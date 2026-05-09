'use client';
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Plus, Users, Mail, Shield, Trash2, Edit } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { showToast } from '../../redux/slices/toastSlice';

const HRManagement = () => {
  const dispatch = useDispatch();
  const [hrUsers, setHrUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchHRUsers();
  }, []);

  const fetchHRUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/hr-users');
      if (response.data.success) {
        setHrUsers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching HR users:', error);
      dispatch(showToast({
        message: 'Failed to fetch HR users',
        type: 'error'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      dispatch(showToast({
        message: 'Passwords do not match',
        type: 'error'
      }));
      return;
    }

    const trimmedName = (formData.name || '').trim();
    const [firstName, ...rest] = trimmedName.split(/\s+/);
    const lastName = rest.join(' ') || firstName;

    try {
      const response = await apiClient.post('/api/hr-users', {
        firstName,
        lastName,
        email: formData.email,
        password: formData.password,
      });

      if (response.data.success) {
        dispatch(showToast({
          message: 'HR user created successfully',
          type: 'success'
        }));
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        setShowAddForm(false);
        fetchHRUsers();
      }
    } catch (error) {
      dispatch(showToast({
        message: error.response?.data?.message || 'Failed to create HR user',
        type: 'error'
      }));
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this HR user?')) {
      try {
        await apiClient.delete(`/api/hr-users/${userId}`);
        dispatch(showToast({
          message: 'HR user deleted successfully',
          type: 'success'
        }));
        fetchHRUsers();
      } catch (error) {
        dispatch(showToast({
          message: 'Failed to delete HR user',
          type: 'error'
        }));
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HR Management</h1>
          <p className="text-gray-600">Manage HR team members and their access</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add HR User
        </button>
      </div>

      {/* Add HR User Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New HR User</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create HR User
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HR Users List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            HR Team Members ({hrUsers.length})
          </h2>
        </div>
        
        {hrUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No HR users yet</h3>
            <p className="text-gray-600 mb-4">Add HR team members to help manage the hiring process</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First HR User
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {hrUsers.map((user) => {
              const fullName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
              const userId = user._id || user.id;
              return (
                <div key={userId} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {fullName?.charAt(0)?.toUpperCase() || 'H'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{fullName}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {user.email}
                        </div>
                        <div className="flex items-center">
                          <Shield className="w-4 h-4 mr-1" />
                          HR Manager
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDelete(userId)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HRManagement;