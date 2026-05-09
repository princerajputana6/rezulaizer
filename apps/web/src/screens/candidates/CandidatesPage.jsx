'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useDispatch } from 'react-redux';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Eye, 
  Edit, 
  Download, 
  Trash2,
  ChevronDown,
  Users,
  UserCheck,
  UserX,
  Clock,
  Send
} from 'lucide-react';
import { showToast } from '../../redux/slices/toastSlice';
import { apiClient, uploadClient } from '../../services/apiClient';
import GenerateAssessmentModal from '../../components/candidates/GenerateAssessmentModal';

const CandidatesPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    activeCandidates: 0,
    inactiveCandidates: 0,
    totalTestsAssigned: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const candidatesPerPage = 10;

  // Modal state for AI Assessment
  const [showGenModal, setShowGenModal] = useState(false);
  const [selectedForGen, setSelectedForGen] = useState(null);

  // Fetch candidates from API
  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: candidatesPerPage,
        sortBy,
        sortOrder
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const response = await apiClient.get('/candidates', { params });
      
      if (response.data.success) {
        const candidatesData = response.data.data?.candidates || response.data.data || [];
        const paginationData = response.data.data?.pagination || response.data.pagination || {};
        
        setCandidates(Array.isArray(candidatesData) ? candidatesData : []);
        setPagination(paginationData);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      
      // Set empty array to prevent crashes
      setCandidates([]);
      setPagination({});
      
      // Show appropriate error message
      let errorMessage = 'Failed to fetch candidates';
      if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      dispatch(showToast({
        message: errorMessage,
        type: 'error'
      }));
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, sortBy, sortOrder]);
  
  // Fetch candidate statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/candidates/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching candidate stats:', error);
    }
  }, []);
  
  // Open AI assessment modal for a candidate
  const handleGenerateAssessment = (candidateId) => {
    setSelectedForGen(candidateId);
    setShowGenModal(true);
  };

  const handleGenSuccess = (data) => {
    dispatch(showToast({ message: 'Assessment generated successfully', type: 'success' }));
    fetchCandidates();
  };

  // Send assessment invitation email to a candidate
  const handleSendAssessment = async (candidateId) => {
    try {
      dispatch(showToast({ message: 'Generating assessment... This may take up to 2 minutes.', type: 'info' }));
      
      // Use uploadClient for longer timeout (2 minutes) since assessment generation involves AI
      const response = await uploadClient.post(`/candidates/${candidateId}/send-assessment`, {}, {
        headers: {
          'Content-Type': 'application/json', // Override multipart for this request
        }
      });
      
      if (response.data.success) {
        dispatch(showToast({ message: 'Assessment invitation sent successfully!', type: 'success' }));
      } else {
        throw new Error('Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending assessment invitation:', error);
      
      let errorMessage = 'Failed to send assessment invitation';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Assessment generation timed out. Please try again or contact support.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      dispatch(showToast({ message: errorMessage, type: 'error' }));
    }
  };
  
  useEffect(() => {
    fetchCandidates();
    fetchStats();
  }, [fetchCandidates, fetchStats]);
  
  // Handle candidate actions
  const handleViewProfile = (candidateId) => {
    navigate(`/candidates/${candidateId}`);
  };

  const handleEditCandidate = (candidateId) => {
    navigate(`/candidates/${candidateId}/edit`);
  };

  const handleDownloadResume = async (candidateId) => {
    try {
      const response = await apiClient.get(`/candidates/${candidateId}/resume`);
      
      if (response.data.success && response.data.downloadUrl) {
        // Open the signed URL in a new tab for download
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.setAttribute('download', response.data.fileName);
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        dispatch(showToast({
          message: 'Resume download started',
          type: 'success'
        }));
      } else {
        throw new Error('Invalid download response');
      }
    } catch (error) {
      console.error('Error downloading resume:', error);
      dispatch(showToast({
        message: 'Failed to download resume',
        type: 'error'
      }));
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (window.confirm('Are you sure you want to delete this candidate?')) {
      try {
        await apiClient.delete(`/candidates/${candidateId}`);
        dispatch(showToast({
          message: 'Candidate deleted successfully',
          type: 'success'
        }));
        fetchCandidates(); // Refresh the list
      } catch (error) {
        console.error('Error deleting candidate:', error);
        dispatch(showToast({
          message: 'Failed to delete candidate',
          type: 'error'
        }));
      }
    }
  };

  const handleSelectCandidate = (candidateId) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCandidates.length === candidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(candidates.map(c => c._id));
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      hired: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Hired' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactive' }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-600 mt-2">Manage and track your candidate applications</p>
        </div>
        <button
          onClick={() => navigate('/candidates/add')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Candidates
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Candidates</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCandidates}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeCandidates}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <UserX className="w-6 h-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inactiveCandidates}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tests Assigned</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTestsAssigned}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="hired">Hired</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedCandidates.length === candidates.length && candidates.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied Date
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!Array.isArray(candidates) || candidates.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-8 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-lg font-medium">No candidates found</p>
                    <p className="text-sm">Get started by adding your first candidate</p>
                    <button
                      onClick={() => navigate('/candidates/add')}
                      className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Candidates
                    </button>
                  </td>
                </tr>
              ) : (
                (Array.isArray(candidates) ? candidates : []).map((candidate) => (
                  <tr key={candidate._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCandidates.includes(candidate._id)}
                        onChange={() => handleSelectCandidate(candidate._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {((candidate.firstName || '') + ' ' + (candidate.lastName || '')).trim().split(' ').map(n => n[0]).join('') || 'C'}
                        </div>
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900">
                            {candidate.firstName} {candidate.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{candidate.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {candidate.currentPosition || 'Not specified'}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {getStatusBadge(candidate.status)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(candidate.applicationInfo?.appliedDate || candidate.createdAt)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleViewProfile(candidate._id)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDownloadResume(candidate._id)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                          title="Download Resume"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteCandidate(candidate._id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Candidate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                disabled={currentPage === pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * candidatesPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * candidatesPerPage, pagination.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {[...Array(pagination.pages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                    disabled={currentPage === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Generate Assessment Modal */}
      <GenerateAssessmentModal
        isOpen={showGenModal}
        onClose={() => setShowGenModal(false)}
        candidateId={selectedForGen}
        onSuccess={handleGenSuccess}
      />
    </div>
  );
};

export default CandidatesPage;