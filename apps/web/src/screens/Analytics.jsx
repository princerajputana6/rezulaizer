'use client';
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building2, 
  CreditCard, 
  Activity,
  Download,
  Calendar,
  Globe,
  PieChart,
  LineChart,
  Filter,
  Video
} from 'lucide-react';
import { selectCurrentUser } from '../redux/slices/authSlice';

const Analytics = () => {
  const currentUser = useSelector(selectCurrentUser);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedMetric, setSelectedMetric] = useState('overview');

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      const response = await fetch(`/api/analytics/dashboard?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  // Handle date range change
  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Export analytics data
  const handleExport = async (type, format = 'json') => {
    try {
      const queryParams = new URLSearchParams({
        type,
        format,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      const response = await fetch(`/api/analytics/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        if (format === 'csv') {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${type}-analytics.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          const data = await response.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${type}-analytics.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
    }
  };

  // Metric cards component
  const MetricCard = ({ title, value, change, icon: Icon, color, subtitle }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          {change && (
            <div className={`flex items-center mt-2 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">
                {change >= 0 ? '+' : ''}{change}% from last period
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Proctoring Alerts */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Proctoring Alerts</h3>
          <div className="text-sm text-gray-600">Suspicious Attempts: <span className="font-semibold">{analyticsData?.proctoring?.suspiciousAttempts || 0}</span></div>
        </div>
        {analyticsData?.proctoring?.topFlaggedAttempts?.length > 0 ? (
          <div className="space-y-3">
            {analyticsData.proctoring.topFlaggedAttempts.map((a, idx) => {
              const high = (a.totalWarnings || 0) >= 5; // default threshold
              return (
                <div key={a.attemptId || idx} className={`p-4 rounded border flex items-center justify-between ${high ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div>
                    <div className="font-medium text-gray-900">{a.testTitle}</div>
                    <div className="text-xs text-gray-500">Attempt: {a.attemptId}</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-sm"><span className="text-gray-500">Tab Switches:</span> <span className="font-semibold">{a.tabSwitches}</span></div>
                    <div className="text-sm"><span className="text-gray-500">Fullscreen Exits:</span> <span className="font-semibold">{a.fullscreenExits}</span></div>
                    <div className="text-sm"><span className="text-gray-500">Copy/Paste:</span> <span className="font-semibold">{a.copyPasteAttempts}</span></div>
                    <div className={`text-sm px-2 py-1 rounded ${high ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>Warnings: {a.totalWarnings}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-600">No flagged attempts found in the selected period.</div>
        )}
      </div>
    </div>
  );

  // Chart component (simplified - in production you'd use a library like Chart.js or Recharts)
  const SimpleBarChart = ({ data, title, xKey, yKey, color = 'bg-blue-500' }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {data?.slice(0, 8).map((item, index) => {
          const maxValue = Math.max(...data.map(d => d[yKey]));
          const percentage = (item[yKey] / maxValue) * 100;
          
          return (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-24 text-sm text-gray-600 truncate">
                {item[xKey]}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${color}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="w-16 text-sm font-medium text-gray-900 text-right">
                {item[yKey]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Line chart component (simplified)
  const SimpleLineChart = ({ data, title, xKey, yKey }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-64 flex items-end space-x-2">
        {data?.map((item, index) => {
          const maxValue = Math.max(...data.map(d => d[yKey]));
          const height = (item[yKey] / maxValue) * 200;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className="bg-blue-500 rounded-t w-full min-h-[4px]"
                style={{ height: `${height}px` }}
              ></div>
              <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                {item[xKey]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights into system performance and usage</p>
        </div>
        
        {/* Date Range and Export Controls */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex space-x-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('companies', 'csv')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => handleExport('test-results', 'json')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Metrics (2 per row) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <MetricCard
          title="Total Companies"
          value={analyticsData?.overview?.totalCompanies?.toLocaleString() || '0'}
          change={analyticsData?.overview?.growthRate}
          icon={Building2}
          color="bg-blue-500"
          subtitle={`${analyticsData?.overview?.activeCompanies || 0} active`}
        />
        <MetricCard
          title="Total Candidates"
          value={analyticsData?.overview?.totalCandidates?.toLocaleString() || '0'}
          icon={Users}
          color="bg-green-500"
        />
        <MetricCard
          title="Tests Completed"
          value={analyticsData?.overview?.totalTests?.toLocaleString() || '0'}
          icon={Activity}
          color="bg-purple-500"
        />
        <MetricCard
          title="Total Revenue"
          value={`$${analyticsData?.overview?.totalRevenue?.toLocaleString() || '0'}`}
          icon={CreditCard}
          color="bg-orange-500"
        />
        <MetricCard
          title="Video Interviews"
          value={analyticsData?.overview?.totalVideoInterviews?.toLocaleString() || '0'}
          icon={Video}
          color="bg-teal-500"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Growth Chart */}
        <SimpleLineChart
          data={analyticsData?.charts?.companyGrowth || []}
          title="Company Growth Over Time"
          xKey="period"
          yKey="count"
        />

        {/* Revenue by Month */}
        <SimpleLineChart
          data={analyticsData?.charts?.revenueByMonth || []}
          title="Revenue Trends"
          xKey="period"
          yKey="revenue"
        />

        {/* Tests by Month */}
        <SimpleLineChart
          data={analyticsData?.charts?.testsByMonth || []}
          title="Tests by Month"
          xKey="period"
          yKey="count"
        />

        {/* Candidates by Month */}
        <SimpleLineChart
          data={analyticsData?.charts?.candidatesByMonth || []}
          title="Candidates by Month"
          xKey="period"
          yKey="count"
        />

        {/* Industry Distribution */}
        <SimpleBarChart
          data={analyticsData?.charts?.industryDistribution || []}
          title="Companies by Industry"
          xKey="_id"
          yKey="count"
          color="bg-blue-500"
        />

        {/* Geographic Distribution */}
        <SimpleBarChart
          data={analyticsData?.charts?.geographicData || []}
          title="Geographic Distribution"
          xKey="_id"
          yKey="count"
          color="bg-green-500"
        />
      </div>

      {/* Pass Rate and Top Companies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleLineChart
          data={analyticsData?.charts?.passRateByMonth || []}
          title="Pass Rate Over Time"
          xKey="period"
          yKey="passRate"
        />
        <SimpleBarChart
          data={analyticsData?.top?.companies || []}
          title="Top Companies by Test Activity"
          xKey="companyName"
          yKey="totalAttempts"
          color="bg-indigo-500"
        />
      </div>

      {/* Domain Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleBarChart
          data={analyticsData?.charts?.domainPerformance}
          title="Test Performance by Domain"
          xKey="_id"
          yKey="averageScore"
          color="bg-purple-500"
        />
        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Test Activity</h3>
          <div className="space-y-4">
            {analyticsData?.recentActivity?.slice(0, 8).map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <Activity className="w-4 h-4 text-primary-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.candidateId?.name || 'Unknown Candidate'}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {activity.testId?.testName || 'Unknown Test'} • {activity.companyId?.companyName || 'Unknown Company'}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    activity.status === 'passed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {activity.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.href = '/companies'}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Building2 className="w-6 h-6 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Manage Companies</p>
              <p className="text-sm text-gray-500">Add, edit, or view company details</p>
            </div>
          </button>
          
          <button
            onClick={() => window.location.href = '/questions'}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-6 h-6 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Question Bank</p>
              <p className="text-sm text-gray-500">Manage test questions and domains</p>
            </div>
          </button>
          
          <button
            onClick={() => window.location.href = '/billing'}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <CreditCard className="w-6 h-6 text-purple-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Billing Management</p>
              <p className="text-sm text-gray-500">View invoices and payments</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Analytics;