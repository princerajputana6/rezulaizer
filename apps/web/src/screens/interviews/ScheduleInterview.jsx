'use client';
import React, { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useDispatch } from 'react-redux';
import { apiClient } from '../../services/apiClient';
import { showToast } from '../../redux/slices/toastSlice';
import {
  Video,
  Calendar,
  Clock,
  Users,
  MapPin,
  Send,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  User,
  Briefcase,
  Mail,
  CheckCircle,
  Loader
} from 'lucide-react';

const ScheduleInterview = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Interview details
  const [interviewData, setInterviewData] = useState({
    title: '',
    jobTitle: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: 60,
    type: 'video',
    location: 'Online Video Call'
  });

  // Candidate selection
  const [allCandidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [jobTitleFilter, setJobTitleFilter] = useState('');

  // Job titles for filtering
  const [jobTitles, setJobTitles] = useState([]);

  useEffect(() => {
    fetchCandidates();
    fetchJobTitles();
  }, []);

  useEffect(() => {
    filterCandidates();
  }, [allCandidates, searchTerm, jobTitleFilter]);

  const fetchCandidates = async () => {
    try {
      // Only fetch candidates who passed assessments (ready for interview)
      const response = await apiClient.get('/api/candidates/passed');
      if (response.data.success) {
        const payload = response.data.data;
        const items = Array.isArray(payload) ? payload : (payload?.candidates || payload?.items || payload || []);
        setCandidates(items);
      }
    } catch (error) {
      console.error('Error fetching passed candidates:', error);
    }
  };

  const fetchJobTitles = async () => {
    try {
      const response = await apiClient.get('/api/job-descriptions');
      if (response.data.success) {
        const jds = response.data.data?.items || [];
        const titles = [...new Set(jds.map(jd => jd.title))];
        setJobTitles(titles);
      }
    } catch (error) {
      console.error('Error fetching job titles:', error);
    }
  };

  const filterCandidates = () => {
    let filtered = allCandidates;

    if (searchTerm) {
      filtered = filtered.filter(candidate =>
        candidate.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.current_position?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (jobTitleFilter) {
      filtered = filtered.filter(candidate =>
        candidate.current_position?.toLowerCase().includes(jobTitleFilter.toLowerCase()) ||
        candidate.skills?.toLowerCase().includes(jobTitleFilter.toLowerCase())
      );
    }

    setFilteredCandidates(filtered);
  };

  const handleInterviewDataChange = (field, value) => {
    setInterviewData(prev => ({ ...prev, [field]: value }));
  };

  const handleCandidateSelect = (candidateId) => {
    setSelectedCandidates(prev =>
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleSelectAll = () => {
    const allSelected = filteredCandidates.every(c => selectedCandidates.includes(c.id));
    if (allSelected) {
      setSelectedCandidates(prev => prev.filter(id => !filteredCandidates.find(c => c.id === id)));
    } else {
      setSelectedCandidates(prev => [
        ...prev,
        ...filteredCandidates.filter(c => !prev.includes(c.id)).map(c => c.id)
      ]);
    }
  };

  const validateStep1 = () => {
    return interviewData.title && interviewData.jobTitle && interviewData.scheduledDate && interviewData.scheduledTime;
  };

  const scheduleInterview = async () => {
    if (selectedCandidates.length === 0) {
      alert('Please select at least one candidate');
      return;
    }

    setLoading(true);
    try {
      // Create the interview
      const interviewDateTime = new Date(`${interviewData.scheduledDate}T${interviewData.scheduledTime}`);
      
      const interviewPayload = {
        ...interviewData,
        scheduledAt: interviewDateTime.toISOString(),
        candidateIds: selectedCandidates,
        status: 'scheduled'
      };

      const response = await apiClient.post('/api/video-interviews', interviewPayload);

      if (response.data.success) {
        const interviewId = response.data.data.id;
        
        // Send invitations to selected candidates
        const invitationPromises = selectedCandidates.map(candidateId => {
          const candidate = allCandidates.find(c => c.id === candidateId);
          return apiClient.post('/api/video-interview-invitations', {
            interviewId,
            candidateId,
            email: candidate?.email,
            scheduledAt: interviewDateTime.toISOString()
          });
        });

        await Promise.all(invitationPromises);
        
        alert(`Interview scheduled successfully! Invitations sent to ${selectedCandidates.length} candidates.`);
        navigate('/video-interviews');
      }
    } catch (error) {
      console.error('Error scheduling interview:', error);
      alert('Failed to schedule interview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const CandidateCard = ({ candidate, isSelected, onSelect }) => (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
        isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onSelect(candidate.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {candidate.first_name || candidate.name || 'Candidate'} {candidate.last_name || ''}
            </h3>
            <p className="text-sm text-gray-500 flex items-center">
              <Mail className="w-3 h-3 mr-1" />
              {candidate.email}
            </p>
            {candidate.current_position && (
              <p className="text-sm text-gray-600 flex items-center">
                <Briefcase className="w-3 h-3 mr-1" />
                {candidate.current_position}
              </p>
            )}
            {candidate.skills && (
              <p className="text-xs text-gray-500 mt-1">
                Skills: {candidate.skills.split(',').slice(0, 3).join(', ')}
                {candidate.skills.split(',').length > 3 && '...'}
              </p>
            )}
          </div>
        </div>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(candidate.id)}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/video-interviews')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Interviews
          </button>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-primary-100 p-2 rounded-lg">
              <Video className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Schedule Video Interview</h1>
              <p className="text-gray-600">Set up AI-powered video interviews with candidates</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="text-sm font-medium">Interview Details</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="text-sm font-medium">Select Candidates</span>
            </div>
          </div>
        </div>

        {/* Step 1: Interview Details */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Interview Details</h2>
              <p className="text-gray-600">Set up the basic information for your video interview</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interview Title *
                </label>
                <input
                  type="text"
                  value={interviewData.title}
                  onChange={(e) => handleInterviewDataChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Senior Developer Interview - Round 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={interviewData.jobTitle}
                  onChange={(e) => handleInterviewDataChange('jobTitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Senior React Developer"
                  list="job-title-suggestions"
                />
                <datalist id="job-title-suggestions">
                  {jobTitles.map(title => (
                    <option key={title} value={title} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interview Type
                </label>
                <select
                  value={interviewData.type}
                  onChange={(e) => handleInterviewDataChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="video">AI Video Interview</option>
                  <option value="technical">Technical Interview</option>
                  <option value="behavioral">Behavioral Interview</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={interviewData.scheduledDate}
                    onChange={(e) => handleInterviewDataChange('scheduledDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="time"
                    value={interviewData.scheduledTime}
                    onChange={(e) => handleInterviewDataChange('scheduledTime', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <select
                  value={interviewData.duration}
                  onChange={(e) => handleInterviewDataChange('duration', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={interviewData.location}
                    onChange={(e) => handleInterviewDataChange('location', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Online Video Call"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={interviewData.description}
                  onChange={(e) => handleInterviewDataChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Additional details about the interview..."
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!validateStep1()}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
              >
                <span>Next: Select Candidates</span>
                <Users className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Candidate Selection */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select Candidates</h2>
              <p className="text-gray-600">Choose candidates to invite for the interview</p>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={jobTitleFilter}
                  onChange={(e) => setJobTitleFilter(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Job Titles</option>
                  {jobTitles.map(title => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {filteredCandidates.every(c => selectedCandidates.includes(c.id)) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Candidates List */}
            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {filteredCandidates.length > 0 ? (
                filteredCandidates.map(candidate => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    isSelected={selectedCandidates.includes(candidate.id)}
                    onSelect={handleCandidateSelect}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No candidates found</p>
                </div>
              )}
            </div>

            {/* Selection Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{selectedCandidates.length}</span> candidates selected for interview
                  </p>
                  <p className="text-xs text-gray-500">
                    Scheduled for {new Date(`${interviewData.scheduledDate}T${interviewData.scheduledTime}`).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center text-primary-600">
                  <CheckCircle className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Ready to schedule</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={scheduleInterview}
                disabled={selectedCandidates.length === 0 || loading}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Scheduling...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Schedule Interview</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleInterview;