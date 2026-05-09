'use client';
import React, { useState, useEffect } from 'react';
import dashboardService from '../../services/dashboardService';
import {
  Users,
  Building2,
  ClipboardList,
  Video,
  TrendingUp,
  Activity,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Zap,
  Shield,
  Database,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    totalAssessments: 0,
    totalInterviews: 0,
    monthlyRevenue: 0,
    activeUsers: 0
  });
  const [trends, setTrends] = useState({
    companiesGrowth: '+0%',
    usersGrowth: '+0%',
    assessmentsGrowth: '+0%',
    revenueGrowth: '+0%'
  });
  const [activities, setActivities] = useState([]);
  const [systemServices, setSystemServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all dashboard data in parallel
      const [statsRes, activitiesRes, systemStatusRes] = await Promise.allSettled([
        dashboardService.getDashboardStats(),
        dashboardService.getRecentActivities(4),
        dashboardService.getSystemStatus()
      ]);

      // Handle stats
      if (statsRes.status === 'fulfilled' && statsRes.value.success) {
        setStats(statsRes.value.data.stats);
        setTrends(statsRes.value.data.trends);
      } else {
        // Fallback to mock data if API fails
        setStats({
          totalCompanies: 24,
          totalUsers: 156,
          totalAssessments: 342,
          totalInterviews: 89,
          monthlyRevenue: 12450,
          activeUsers: 89
        });
        setTrends({
          companiesGrowth: '+12%',
          usersGrowth: '+8%',
          assessmentsGrowth: '+15%',
          revenueGrowth: '+23%'
        });
      }

      // Handle activities
      if (activitiesRes.status === 'fulfilled' && activitiesRes.value.success) {
        setActivities(activitiesRes.value.data.activities);
      } else {
        // Fallback activities
        setActivities([
          { icon: 'CheckCircle', color: 'bg-green-600', title: 'New company registered', description: 'TechCorp Inc. - 2 hours ago' },
          { icon: 'Activity', color: 'bg-blue-600', title: 'System maintenance completed', description: 'Database optimization - 4 hours ago' },
          { icon: 'ClipboardList', color: 'bg-purple-600', title: 'High assessment activity', description: '250+ assessments today - 6 hours ago' },
          { icon: 'Video', color: 'bg-orange-600', title: 'Video interview completed', description: 'AI interviewer session - 8 hours ago' }
        ]);
      }

      // Handle system status
      if (systemStatusRes.status === 'fulfilled' && systemStatusRes.value.success) {
        setSystemServices(systemStatusRes.value.data.services);
      } else {
        // Fallback system status
        setSystemServices([
          { displayName: 'API Services', status: 'operational', statusColor: 'bg-green-500', statusTextColor: 'bg-green-100 text-green-700' },
          { displayName: 'Database', status: 'operational', statusColor: 'bg-green-500', statusTextColor: 'bg-green-100 text-green-700' },
          { displayName: 'Video Services', status: 'maintenance', statusColor: 'bg-yellow-500', statusTextColor: 'bg-yellow-100 text-yellow-700' },
          { displayName: 'File Storage', status: 'operational', statusColor: 'bg-green-500', statusTextColor: 'bg-green-100 text-green-700' },
          { displayName: 'AI Processing', status: 'operational', statusColor: 'bg-green-500', statusTextColor: 'bg-green-100 text-green-700' }
        ]);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use fallback data
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse max-w-7xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-100 p-6 rounded-lg h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex items-center space-x-1 text-green-600 text-sm">
          <ArrowUpRight className="w-4 h-4" />
          <span>{trendValue}</span>
        </div>
      </div>
      <div>
        <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
        <p className="text-gray-900 text-2xl font-bold">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border shadow-sm">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Companies"
          value={stats.totalCompanies}
          icon={Building2}
          trend="up"
          trendValue={trends.companiesGrowth}
          color="bg-blue-600"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          trend="up"
          trendValue={trends.usersGrowth}
          color="bg-green-600"
        />
        <StatCard
          title="Assessments"
          value={stats.totalAssessments}
          icon={ClipboardList}
          trend="up"
          trendValue={trends.assessmentsGrowth}
          color="bg-purple-600"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend="up"
          trendValue={trends.revenueGrowth}
          color="bg-orange-600"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {activities.map((item, index) => {
              // Map icon string to component
              const IconComponent = {
                CheckCircle,
                Activity,
                ClipboardList,
                Video,
                Users,
                Building2,
                Settings: Activity,
                AlertCircle
              }[item.icon] || Activity;

              return (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                  <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center`}>
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
          </div>
          <div className="space-y-3">
            {systemServices.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 ${service.statusColor || 'bg-gray-500'} rounded-full`}></div>
                  <span className="font-medium text-gray-900">{service.displayName}</span>
                </div>
                <span className={`text-sm px-2 py-1 rounded-full ${service.statusTextColor || 'bg-gray-100 text-gray-700'}`}>
                  {service.status?.charAt(0).toUpperCase() + service.status?.slice(1) || 'Unknown'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Building2, title: 'Add Company', subtitle: 'Register new company', color: 'bg-blue-600' },
            { icon: Users, title: 'Manage Users', subtitle: 'View all platform users', color: 'bg-green-600' },
            { icon: BarChart3, title: 'View Analytics', subtitle: 'Platform performance', color: 'bg-purple-600' },
            { icon: Activity, title: 'System Health', subtitle: 'Monitor system status', color: 'bg-orange-600' }
          ].map((action, index) => (
            <button key={index} className="group p-4 bg-gray-50 border rounded-lg hover:bg-white hover:shadow-md transition-all text-left">
              <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">{action.title}</h4>
              <p className="text-sm text-gray-500">{action.subtitle}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;