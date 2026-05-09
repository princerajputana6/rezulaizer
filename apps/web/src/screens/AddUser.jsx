'use client';
import React, { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useDispatch } from 'react-redux';
import { apiClient } from '../services/apiClient';
import { showToast } from '../redux/slices/uiSlice';

const AddUser = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    userType: 'startup',
    companyName: '',
    companyStrength: '1-10',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // The API only accepts firstName, lastName, email, password, and role.
      // I'll send the required fields and log the extra ones for now.
      const { firstName, lastName, email, password } = formData;
      console.log('Registering with extra data:', formData);

      await apiClient.post('/auth/register', { 
        firstName, 
        lastName, 
        email, 
        password, 
        role: 'user' // Defaulting to 'user' role
      });

      dispatch(showToast({ message: 'User registered successfully!', type: 'success' }));
      navigate('/login');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      dispatch(showToast({ message: errorMessage, type: 'error' }));
      console.error('Registration error:', error);
    }
    setLoading(false);
  };

  const renderCompanyFields = () => {
    switch (formData.userType) {
      case 'consultancy':
        return (
          <>
            <div className="mb-4">
              <label className="block text-gray-700">Consultancy Name</label>
              <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full p-2 border rounded" required />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700">Number of Consultants</label>
              <select name="companyStrength" value={formData.companyStrength} onChange={handleChange} className="w-full p-2 border rounded">
                <option>1-10</option>
                <option>11-50</option>
                <option>51-200</option>
                <option>200+</option>
              </select>
            </div>
          </>
        );
      case 'startup':
      case 'enterprise':
        return (
          <>
            <div className="mb-4">
              <label className="block text-gray-700">Company Name</label>
              <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full p-2 border rounded" required />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700">Company Strength</label>
              <select name="companyStrength" value={formData.companyStrength} onChange={handleChange} className="w-full p-2 border rounded">
                <option>1-10</option>
                <option>11-50</option>
                <option>51-200</option>
                <option>201-1000</option>
                <option>1000+</option>
              </select>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Register User</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700">First Name</label>
            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Last Name</label>
            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">User Type</label>
            <select name="userType" value={formData.userType} onChange={handleChange} className="w-full p-2 border rounded">
              <option value="startup">Startup Company</option>
              <option value="consultancy">Consultancy Firm</option>
              <option value="enterprise">Enterprise Level Company</option>
            </select>
          </div>
          {renderCompanyFields()}
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddUser;