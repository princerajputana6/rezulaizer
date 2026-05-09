'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@/lib/router-compat';
import { useDispatch } from 'react-redux';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Download,
  Edit,
  Send,
  Trash2,
  Building2,
  FileText,
  Clock,
  CheckCircle
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { showToast } from '../../redux/slices/toastSlice';

const CandidateProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [candidate, setCandidate] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchCandidate();
  }, [id]);

  const fetchCandidate = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/candidates/${id}`);
      if (response.data.success) {
        const c = response.data.data.candidate || response.data.data;
        setCandidate(c);
        // Parse profile_json if present
        try {
          const p = c.profile_json ? JSON.parse(c.profile_json) : null;
          setProfile(p);
        } catch (e) {
          setProfile(null);
        }
      }
    } catch (error) {
      console.error('Error fetching candidate:', error);
      dispatch(showToast({
        message: 'Failed to fetch candidate details',
        type: 'error'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      await apiClient.put(`/candidates/${id}/profile`, { profile });
      dispatch(showToast({ message: 'Profile updated successfully', type: 'success' }));
      setEditMode(false);
      // refresh to reflect any server-side transforms
      fetchCandidate();
    } catch (e) {
      dispatch(showToast({ message: 'Failed to update profile', type: 'error' }));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDownloadResume = async () => {
    try {
      const response = await apiClient.get(`/candidates/${id}/resume`);
      
      if (response.data.success && response.data.downloadUrl) {
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
      }
    } catch (error) {
      console.error('Error downloading resume:', error);
      dispatch(showToast({
        message: 'Failed to download resume',
        type: 'error'
      }));
    }
  };

  const handleSendAssessment = async () => {
    try {
      if (!candidate?.email) {
        dispatch(showToast({
          message: 'Candidate email is required to send assessment',
          type: 'error'
        }));
        return;
      }

      const response = await apiClient.post(`/candidates/${id}/send-assessment`, {});
      if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Failed to send assessment');
      }

      dispatch(showToast({
        message: response.data.message || 'Assessment sent successfully to candidate',
        type: 'success'
      }));
    } catch (error) {
      console.error('Error sending assessment:', error);
      dispatch(showToast({
        message: error.response?.data?.message || 'Failed to send assessment',
        type: 'error'
      }));
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this candidate?')) {
      try {
        await apiClient.delete(`/candidates/${id}`);
        dispatch(showToast({
          message: 'Candidate deleted successfully',
          type: 'success'
        }));
        navigate('/candidates');
      } catch (error) {
        console.error('Error deleting candidate:', error);
        dispatch(showToast({
          message: 'Failed to delete candidate',
          type: 'error'
        }));
      }
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse max-w-4xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Candidate Not Found</h1>
          <button
            onClick={() => navigate('/candidates')}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Candidates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/candidates')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Candidates
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/candidates/${id}/edit`)}
            className="inline-flex items-center px-4 py-2 bg-white border text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </button>
          <button
            onClick={handleSendAssessment}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4 mr-2" />
            Send Assessment
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {(candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()).split(' ').filter(n => n).map(n => n[0]).join('').toUpperCase() || 'C'}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Unknown Candidate'}
              </h1>
              {candidate.currentPosition && (
                <p className="text-lg text-gray-600 mb-2">{candidate.currentPosition}</p>
              )}
              <div className="flex items-center space-x-4 text-gray-600">
                {candidate.email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    {candidate.email}
                  </div>
                )}
                {candidate.phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    {candidate.phone}
                  </div>
                )}
              </div>
              <div className="mt-3">
                {getStatusBadge(candidate.status)}
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Basic Information
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-gray-900">{candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{candidate.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-900">{candidate.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(candidate.status)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Applied Date</label>
                  <p className="text-gray-900 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(candidate.createdAt || candidate.appliedAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Resume & Documents */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Documents
              </h2>
              <div className="space-y-3">
                {(candidate.resume || candidate.resume_info_json) ? (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="w-8 h-8 text-blue-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">Resume</p>
                          <p className="text-sm text-gray-500">
                            {candidate.resume?.filename || 
                             candidate.resume?.originalName || 
                             (candidate.resume_info_json ? JSON.parse(candidate.resume_info_json).fileName : 'resume.pdf')}
                          </p>
                          {candidate.resume?.size && (
                            <p className="text-xs text-gray-400">
                              {(candidate.resume.size / 1024).toFixed(2)} KB
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleDownloadResume}
                        className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No resume uploaded</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Parsed Profile (Editable) */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Parsed Resume Profile
            </h2>
            {!profile ? (
              <div className="text-gray-500">No parsed profile available yet.</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                    {editMode ? (
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                        value={profile.summary || ''}
                        onChange={(e) => handleProfileField('summary', e.target.value)}
                        placeholder="Short professional summary"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-pre-line">{profile.summary || '—'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    {editMode ? (
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={profile.location || ''}
                        onChange={(e) => handleProfileField('location', e.target.value)}
                        placeholder="City, Country"
                      />
                    ) : (
                      <p className="text-gray-900">{profile.location || '—'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                    {editMode ? (
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={(profile.skills || []).join(', ')}
                        onChange={(e) => handleProfileField('skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="e.g. React, Node.js, SQL"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(profile.skills || []).length ? (
                          (profile.skills || []).map((s, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">{s}</span>
                          ))
                        ) : (
                          <span className="text-gray-900">—</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                    {Array.isArray(profile.experience) && profile.experience.length ? (
                      <ul className="space-y-2">
                        {profile.experience.map((exp, idx) => (
                          <li key={idx} className="border rounded p-3">
                            <div className="font-medium text-gray-900">{exp.title || 'Role'} {exp.company ? `@ ${exp.company}` : ''}</div>
                            <div className="text-sm text-gray-600">{exp.duration || ''}</div>
                            {exp.description && <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{exp.description}</p>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-900">—</p>
                    )}
                    {editMode && (
                      <p className="text-xs text-gray-500 mt-1">Experience editing can be added later; for now edit in parsed JSON via API if needed.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Education</label>
                    {Array.isArray(profile.education) && profile.education.length ? (
                      <ul className="space-y-2">
                        {profile.education.map((ed, idx) => (
                          <li key={idx} className="border rounded p-3">
                            <div className="font-medium text-gray-900">{ed.institution || 'Institute'}</div>
                            <div className="text-sm text-gray-600">{ed.degree || ''} {ed.year ? `(${ed.year})` : ''}</div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-900">—</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {editMode && (
              <div className="flex items-center justify-end mt-6">
                <button
                  onClick={handleProfileSave}
                  disabled={savingProfile}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            )}
          </div>

          {/* Raw JSON view / edit */}
          {profile && (
            <div className="mt-6">
              <details className="bg-white border rounded-lg">
                <summary className="cursor-pointer select-none px-4 py-2 font-medium text-gray-800">Raw Parsed JSON</summary>
                <div className="p-4">
                  {editMode ? (
                    <textarea
                      className="w-full h-56 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                      value={JSON.stringify(profile, null, 2)}
                      onChange={(e) => {
                        try {
                          const obj = JSON.parse(e.target.value);
                          setProfile(obj);
                        } catch {
                          // ignore invalid json while typing
                        }
                      }}
                    />
                  ) : (
                    <pre className="text-sm whitespace-pre-wrap font-mono">{JSON.stringify(profile, null, 2)}</pre>
                  )}
                </div>
              </details>
            </div>
          )}

          {/* Assessment History */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Assessment History
            </h2>
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No assessments assigned yet</p>
              <button
                onClick={handleSendAssessment}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send className="w-4 h-4 mr-2" />
                Send First Assessment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateProfile;