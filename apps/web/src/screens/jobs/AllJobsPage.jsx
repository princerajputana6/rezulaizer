'use client';
import React, { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useDispatch } from 'react-redux';
import { 
  Plus, Search, Filter, Briefcase, MapPin, DollarSign, 
  Clock, Users, Eye, Edit, Trash2, Calendar 
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { showToast } from '../../redux/slices/toastSlice';
import Pagination from '@/components/common/Pagination';

const AllJobsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/job-descriptions');
      if (response.data.success) {
        setJobs(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      dispatch(showToast({
        message: 'Failed to load jobs',
        type: 'error'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = () => {
    navigate('/job-descriptions/create');
  };

  const handleViewJob = (jobId) => {
    navigate(`/jobs/${jobId}`);
  };

  const handleEditJob = (jobId) => {
    navigate(`/job-descriptions/${jobId}/edit`);
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await apiClient.delete(`/api/job-descriptions/${jobId}`);
        dispatch(showToast({
          message: 'Job deleted successfully',
          type: 'success'
        }));
        fetchJobs();
      } catch (error) {
        dispatch(showToast({
          message: 'Failed to delete job',
          type: 'error'
        }));
      }
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      closed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Closed' },
      paused: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Paused' }
    };
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Jobs</h1>
            <p className="text-gray-600 mt-1">Manage job descriptions and view matching candidates</p>
          </div>
          <button
            onClick={handleCreateJob}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Job
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your filters'
              : 'Get started by creating your first job description'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <button
              onClick={handleCreateJob}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create First Job
            </button>
          )}
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedJobs.map((job) => (
            <div
              key={job._id}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewJob(job._id)}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                      {job.title}
                    </h3>
                    <p className="text-sm text-gray-600">{job.department || 'No Department'}</p>
                  </div>
                  {getStatusBadge(job.status)}
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  {job.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      {job.location}
                    </div>
                  )}
                  {job.salaryRange && (
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="w-4 h-4 mr-2" />
                      {job.salaryRange.min && job.salaryRange.max 
                        ? `$${job.salaryRange.min.toLocaleString()} - $${job.salaryRange.max.toLocaleString()}`
                        : 'Salary not specified'
                      }
                    </div>
                  )}
                  {job.employmentType && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      {job.employmentType}
                    </div>
                  )}
                </div>

                {/* Skills */}
                {job.requiredSkills && job.requiredSkills.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {job.requiredSkills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                        >
                          {typeof skill === 'string' ? skill : skill.name}
                        </span>
                      ))}
                      {job.requiredSkills.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{job.requiredSkills.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-1" />
                    <span>{job.applicantsCount || 0} applicants</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewJob(job._id);
                    }}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Matches
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditJob(job._id);
                    }}
                    className="inline-flex items-center justify-center px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteJob(job._id);
                    }}
                    className="inline-flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredJobs.length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
        </>
      )}
    </div>
  );
};

export default AllJobsPage;