'use client';
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { useNavigate } from '@/lib/router-compat';
import {
  ClipboardList,
  Video,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  FileText,
  Award,
  TrendingUp
} from 'lucide-react';

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [availableTests, setAvailableTests] = useState([]);
  const [testHistory, setTestHistory] = useState([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Mock data for candidate dashboard
      setStats({
        availableTests: 3,
        completedTests: 8,
        upcomingInterviews: 2,
        averageScore: 85
      });

      setAvailableTests([
        {
          id: '1',
          title: 'React Developer Assessment',
          company: 'TechCorp',
          duration: 60,
          questions: 25,
          expiresAt: '2024-01-25T23:59:59Z',
          status: 'available'
        },
        {
          id: '2',
          title: 'JavaScript Fundamentals',
          company: 'StartupXYZ',
          duration: 45,
          questions: 20,
          expiresAt: '2024-01-28T23:59:59Z',
          status: 'available'
        }
      ]);

      setTestHistory([
        {
          id: '1',
          title: 'Python Developer Test',
          company: 'DataCorp',
          completedAt: '2024-01-15T10:30:00Z',
          score: 88,
          maxScore: 100,
          status: 'passed'
        },
        {
          id: '2',
          title: 'Full Stack Assessment',
          company: 'WebSolutions',
          completedAt: '2024-01-10T14:20:00Z',
          score: 75,
          maxScore: 100,
          status: 'passed'
        },
        {
          id: '3',
          title: 'Database Design Test',
          company: 'CloudTech',
          completedAt: '2024-01-08T09:15:00Z',
          score: 92,
          maxScore: 100,
          status: 'passed'
        }
      ]);

      setUpcomingInterviews([
        {
          id: '1',
          company: 'TechCorp',
          position: 'Senior React Developer',
          scheduledAt: '2024-01-22T10:00:00Z',
          type: 'video',
          status: 'scheduled'
        },
        {
          id: '2',
          company: 'StartupXYZ',
          position: 'Frontend Developer',
          scheduledAt: '2024-01-24T15:30:00Z',
          type: 'video',
          status: 'scheduled'
        }
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle, onClick }) => (
    <div 
      className={`bg-white p-6 rounded-lg shadow-sm border ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('600', '100')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  const TestItem = ({ test, isAvailable = false }) => (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
          isAvailable ? 'bg-blue-100' : 
          test.status === 'passed' ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {isAvailable ? (
            <ClipboardList className="w-6 h-6 text-blue-600" />
          ) : test.status === 'passed' ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <XCircle className="w-6 h-6 text-red-600" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{test.title}</p>
          <p className="text-xs text-gray-500">{test.company}</p>
          {isAvailable ? (
            <div className="flex items-center mt-1 text-xs text-gray-500">
              <Clock className="w-3 h-3 mr-1" />
              <span>{test.duration} mins • {test.questions} questions</span>
            </div>
          ) : (
            <div className="flex items-center mt-1 text-xs text-gray-500">
              <span>Completed: {new Date(test.completedAt).toLocaleDateString()}</span>
              <span className="mx-2">•</span>
              <span>Score: {test.score}/{test.maxScore}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-3">
        {isAvailable ? (
          <>
            <span className="text-xs text-orange-600">
              Expires: {new Date(test.expiresAt).toLocaleDateString()}
            </span>
            <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm">
              Start Test
            </button>
          </>
        ) : (
          <>
            <span className={`px-2 py-1 text-xs rounded-full ${
              test.status === 'passed' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {test.status === 'passed' ? 'Passed' : 'Failed'}
            </span>
            <button className="text-blue-600 hover:text-blue-800 text-sm">
              View Results
            </button>
          </>
        )}
      </div>
    </div>
  );

  const InterviewItem = ({ interview }) => (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
          <Video className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{interview.position}</p>
          <p className="text-xs text-gray-500">{interview.company}</p>
          <div className="flex items-center mt-1 text-xs text-gray-500">
            <Calendar className="w-3 h-3 mr-1" />
            <span>
              {new Date(interview.scheduledAt).toLocaleDateString()} at{' '}
              {new Date(interview.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
          Scheduled
        </span>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
          Join Interview
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
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600">Track your assessments and interviews</p>
        </div>
        <button 
          onClick={() => navigate('/profile')}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <User className="w-4 h-4" />
          <span>Update Profile</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Available Tests"
          value={stats.availableTests || 0}
          icon={ClipboardList}
          color="text-blue-600"
          subtitle="Ready to take"
          onClick={() => navigate('/available-tests')}
        />
        <StatCard
          title="Completed Tests"
          value={stats.completedTests || 0}
          icon={CheckCircle}
          color="text-green-600"
          subtitle="All time"
          onClick={() => navigate('/test-history')}
        />
        <StatCard
          title="Upcoming Interviews"
          value={stats.upcomingInterviews || 0}
          icon={Video}
          color="text-purple-600"
          subtitle="This week"
          onClick={() => navigate('/my-interviews')}
        />
        <StatCard
          title="Average Score"
          value={`${stats.averageScore || 0}%`}
          icon={Award}
          color="text-orange-600"
          subtitle="Last 10 tests"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Tests */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Available Tests</h3>
            <button 
              onClick={() => navigate('/available-tests')}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              View All
            </button>
          </div>
          <div className="p-6">
            {availableTests.length > 0 ? (
              <div className="space-y-3">
                {availableTests.map((test) => (
                  <TestItem key={test.id} test={test} isAvailable={true} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No available tests</p>
                <p className="text-sm text-gray-400">Check back later for new opportunities</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Test Results */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Recent Results</h3>
            <button 
              onClick={() => navigate('/test-history')}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              View All
            </button>
          </div>
          <div className="p-6">
            {testHistory.length > 0 ? (
              <div className="space-y-3">
                {testHistory.slice(0, 3).map((test) => (
                  <TestItem key={test.id} test={test} isAvailable={false} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No test history</p>
                <p className="text-sm text-gray-400">Complete your first assessment to see results</p>
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
            onClick={() => navigate('/my-interviews')}
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            View All
          </button>
        </div>
        <div className="p-6">
          {upcomingInterviews.length > 0 ? (
            <div className="space-y-3">
              {upcomingInterviews.map((interview) => (
                <InterviewItem key={interview.id} interview={interview} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No upcoming interviews</p>
              <p className="text-sm text-gray-400">Interviews will appear here when scheduled</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Overview */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">85%</p>
              <p className="text-sm text-gray-600">Average Score</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">8</p>
              <p className="text-sm text-gray-600">Tests Passed</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-600">45m</p>
              <p className="text-sm text-gray-600">Avg. Time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;