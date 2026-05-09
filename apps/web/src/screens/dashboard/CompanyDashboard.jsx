'use client';
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { useNavigate } from '@/lib/router-compat';
import {
  Users,
  ClipboardList,
  Video,
  FileText,
  TrendingUp,
  UserCheck,
  Calendar,
  BarChart3,
  Plus,
  Send,
  Eye,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [recentCandidates, setRecentCandidates] = useState([]);
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Only fetch data that actually exists in the database
      const [statsRes, activitiesRes] = await Promise.all([
        apiClient.get('/api/dashboard/company-stats'),
        apiClient.get('/api/dashboard/activities?limit=5')
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data.stats || {});
      }

      // Set empty arrays for features not yet implemented
      setRecentCandidates([]);
      setRecentAssessments([]);
      setUpcomingInterviews([]);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default empty state on error
      setStats({});
      setRecentCandidates([]);
      setRecentAssessments([]);
      setUpcomingInterviews([]);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, change, changeType, onClick }) => (
    <div 
      className={`bg-white p-6 rounded-lg shadow-sm border ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {change && (
            <div className={`flex items-center mt-1 text-sm ${
              changeType === 'positive' ? 'text-green-600' : 
              changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
            }`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('600', '100')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  const CandidateItem = ({ candidate }) => (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
      <div className="flex items-center">
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
          <UserCheck className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {candidate.first_name} {candidate.last_name}
          </p>
          <p className="text-xs text-gray-500">{candidate.email}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button 
          onClick={() => navigate(`/candidates/${candidate.id}`)}
          className="text-blue-600 hover:text-blue-800"
          title="View Profile"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button 
          className="text-green-600 hover:text-green-800"
          title="Send Assessment"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const AssessmentItem = ({ assessment }) => (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
      <div className="flex items-center">
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
          <ClipboardList className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{assessment.title}</p>
          <p className="text-xs text-gray-500">
            {assessment.status === 'published' ? 'Active' : 'Draft'} • {assessment.duration || 60} mins
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 text-xs rounded-full ${
          assessment.status === 'published' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {assessment.status === 'published' ? 'Active' : 'Draft'}
        </span>
        <button 
          onClick={() => navigate(`/tests/${assessment.id}`)}
          className="text-blue-600 hover:text-blue-800"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const InterviewItem = ({ interview }) => (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
      <div className="flex items-center">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
          <Video className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{interview.candidateName}</p>
          <p className="text-xs text-gray-500">{interview.position}</p>
          <p className="text-xs text-gray-400">
            {new Date(interview.scheduledAt).toLocaleDateString()} at{' '}
            {new Date(interview.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
          Scheduled
        </span>
        <button className="text-blue-600 hover:text-blue-800">
          <Video className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Dashboard</h1>
          <p className="text-gray-600">Manage your recruitment process</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/candidates/add')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Candidate</span>
          </button>
          <button
            onClick={() => navigate('/tests')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Calendar className="w-4 h-4" />
            <span>View Assessments</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Companies"
          value={stats.totalCompanies || 0}
          icon={Users}
          color="text-blue-600"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers || 0}
          icon={ClipboardList}
          color="text-green-600"
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers || 0}
          icon={UserCheck}
          color="text-purple-600"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue || 0}`}
          icon={TrendingUp}
          color="text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Candidates */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Recent Candidates</h3>
            <button 
              onClick={() => navigate('/candidates')}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              View All
            </button>
          </div>
          <div className="p-6">
            {recentCandidates.length > 0 ? (
              <div className="space-y-2">
                {recentCandidates.slice(0, 5).map((candidate, index) => (
                  <CandidateItem key={candidate.id || index} candidate={candidate} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No candidates yet</p>
                <button 
                  onClick={() => navigate('/candidates')}
                  className="text-primary-600 hover:text-primary-800 text-sm mt-2"
                >
                  Add your first candidate
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Assessments */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Recent Assessments</h3>
            <button 
              onClick={() => navigate('/tests')}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              View All
            </button>
          </div>
          <div className="p-6">
            {recentAssessments.length > 0 ? (
              <div className="space-y-2">
                {recentAssessments.slice(0, 5).map((assessment, index) => (
                  <AssessmentItem key={assessment.id || index} assessment={assessment} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No assessments yet</p>
                <button
                  onClick={() => navigate('/candidates')}
                  className="text-primary-600 hover:text-primary-800 text-sm mt-2"
                >
                  Send your first assessment from a candidate profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Interviews */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Interviews</h3>
          <button 
            onClick={() => navigate('/video-interviews')}
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            View All
          </button>
        </div>
        <div className="p-6">
          {upcomingInterviews.length > 0 ? (
            <div className="space-y-2">
              {upcomingInterviews.map((interview) => (
                <InterviewItem key={interview.id} interview={interview} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No upcoming interviews</p>
              <button
                onClick={() => navigate('/schedule-interview')}
                className="text-primary-600 hover:text-primary-800 text-sm mt-2"
              >
                See candidates ready for interview
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/job-descriptions')}
              className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <FileText className="w-6 h-6 text-blue-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-blue-900">Create Job Description</p>
                <p className="text-sm text-blue-600">AI-powered JD creation</p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/candidates')}
              className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Users className="w-6 h-6 text-green-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-green-900">Upload Resumes</p>
                <p className="text-sm text-green-600">Add candidates via resume</p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/analytics')}
              className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <BarChart3 className="w-6 h-6 text-purple-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-purple-900">View Analytics</p>
                <p className="text-sm text-purple-600">Recruitment insights</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;