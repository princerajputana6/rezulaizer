'use client';
import React, { useState, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import { useSelector } from 'react-redux';
import { Plus, Edit, Trash2, Eye, Users, Calendar } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { selectCurrentUser } from '../redux/slices/authSlice';

const TestManagement = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useSelector(selectCurrentUser);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const response = await apiClient.get('/tests');
        if (response.data.success && response.data.data) {
          setTests(response.data.data.tests || []);
        } else {
          setTests([]);
        }
      } catch (error) {
        console.error('Error fetching tests:', error);
        setTests([]);
      }
      setLoading(false);
    };

    fetchTests();
  }, []);

  const handleDeleteTest = async (testId) => {
    if (window.confirm('Are you sure you want to delete this test?')) {
      try {
        await apiClient.delete(`/tests/${testId}`);
        setTests(tests.filter(test => test._id !== testId));
      } catch (error) {
        console.error('Error deleting test:', error);
      }
    }
  };

  const TestCard = ({ test }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{test.title}</h3>
          <p className="text-gray-600 text-sm mb-3">{test.description}</p>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {test.duration} min
            </span>
            <span className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {test.questions?.length || 0} questions
            </span>
            <span className={`px-2 py-1 rounded-full text-xs ${
              test.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {test.isActive ? 'Active' : 'Draft'}
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link
            to={`/tests/${test._id}`}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Test"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            to={`/tests/${test._id}/edit`}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Edit Test"
          >
            <Edit className="w-4 h-4" />
          </Link>
          <button
            onClick={() => handleDeleteTest(test._id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Test"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-400">
        Created: {new Date(test.createdAt).toLocaleDateString()}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Test Management</h1>
          <p className="text-gray-600 mt-2">Create, edit, and manage your test templates</p>
        </div>
        <Link
          to="/tests/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Test</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-50 rounded-lg p-8">
            <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tests found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first test template</p>
            <Link
              to="/tests/create"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Test</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <TestCard key={test._id} test={test} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TestManagement;