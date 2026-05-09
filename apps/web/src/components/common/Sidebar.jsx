'use client';
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { NavLink, useLocation } from '@/lib/router-compat';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  BarChart3, 
  Settings, 
  Plus,
  BookOpen,
  Trophy,
  UserCheck,
  Brain,
  Building2,
  UserPlus,
  Database,
  PieChart,
  CreditCard,
  FileBarChart,
  Shield,
  History,
  Award,
  HelpCircle,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  Bell,
  Cog,
  Video,
  Calendar,
  Clock
} from 'lucide-react';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import { selectSidebarOpen, toggleSidebar, setSidebarOpen } from '../../redux/slices/uiSlice';
import { logout } from '../../redux/slices/authSlice';

const Sidebar = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const sidebarOpen = useSelector(selectSidebarOpen);
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // Persist sidebar open state across reloads
  React.useEffect(() => {
    const stored = localStorage.getItem('sidebarOpen');
    if (stored !== null) {
      dispatch(setSidebarOpen(stored === 'true'));
    }
  }, [dispatch]);

  React.useEffect(() => {
    localStorage.setItem('sidebarOpen', String(sidebarOpen));
  }, [sidebarOpen]);

  // Role-based navigation configuration (expanded sections like requested UI)
  const getNavigationByRole = (role) => {
    if (role === 'super_admin' || role === 'admin') {
      return [
        { name: 'Admin Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'System Monitor', href: '/system-monitor', icon: Shield, badge: '2' },
        {
          name: 'Company Management',
          icon: Building2,
          children: [
            { name: 'All Companies', href: '/companies', icon: Building2 },
            { name: 'Add Company', href: '/companies/add', icon: Plus },
            { name: 'Company Settings', href: '/companies/settings', icon: Settings },
            { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard }
          ]
        },
        {
          name: 'AI Model Management',
          icon: Brain,
          children: [
            { name: 'Model Status', href: '/ai/models/status', icon: Database },
            { name: 'API Usage', href: '/ai/api-usage', icon: PieChart },
            { name: 'Model Config', href: '/ai/config', icon: Settings },
            { name: 'Performance Metrics', href: '/ai/performance', icon: BarChart3 }
          ]
        },
        {
          name: 'System Administration',
          icon: Cog,
          children: [
            { name: 'User Management', href: '/users', icon: Users },
            { name: 'Database Admin', href: '/admin/db', icon: Database },
            { name: 'Notifications', href: '/admin/notifications', icon: Bell },
            { name: 'System Logs', href: '/admin/logs', icon: FileBarChart }
          ]
        }
      ];
    }

    if (role === 'company') {
      return [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Analytics', href: '/analytics', icon: BarChart3, badge: 'New' },
        {
          name: 'Test Management',
          icon: FileText,
          children: [
            { name: 'Test Library', href: '/tests', icon: FileText },
            { name: 'AI Question Generator', href: '/tests/ai-generator', icon: Brain },
            { name: 'Test Settings', href: '/tests/settings', icon: Settings },
            { name: 'Preview Tests', href: '/tests/preview', icon: FileText }
          ]
        },
        {
          name: 'AI Interviews',
          icon: Video,
          children: [
            { name: 'AI Interviewer Setup', href: '/interviews/setup', icon: UserPlus },
            { name: 'Schedule Interviews', href: '/interviews/schedule', icon: Calendar },
            { name: 'Live Interviews', href: '/interviews/live', icon: Video, badge: '3' },
            { name: 'Interview Records', href: '/interviews/records', icon: FileBarChart }
          ]
        },
        {
          name: 'Candidates',
          icon: Users,
          children: [
            { name: 'All Candidates', href: '/candidates', icon: Users },
            { name: 'Shortlisted', href: '/candidates/shortlisted', icon: UserCheck },
            { name: 'Top Performers', href: '/candidates/top', icon: Trophy },
            { name: 'Resume Bank', href: '/candidates/resume-bank', icon: FileText },
            { name: 'Export Data', href: '/candidates/export', icon: FileBarChart }
          ]
        },
        {
          name: 'Reports & Analytics',
          icon: BarChart3,
          children: [
            { name: 'Test Performance', href: '/reports/tests', icon: BarChart3 },
            { name: 'Success Metrics', href: '/reports/success', icon: Trophy },
            { name: 'Time Analytics', href: '/reports/time', icon: Clock },
            { name: 'AI Insights', href: '/reports/ai-insights', icon: Brain }
          ]
        },
        { name: 'Settings', href: '/settings', icon: Settings }
      ];
    }

    // Candidate or default
    return [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'My Tests', href: '/my-tests', icon: BookOpen },
      { name: 'Test History', href: '/test-history', icon: History },
      { name: 'Results', href: '/results', icon: Trophy },
      { name: 'Certificates', href: '/certificates', icon: Award },
      { name: 'Practice Tests', href: '/practice', icon: Brain },
      { name: 'Profile Settings', href: '/profile', icon: Settings },
      { name: 'Support', href: '/support', icon: HelpCircle }
    ];
  };

  const navigation = getNavigationByRole(currentUser?.role);

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  const filteredNavigation = navigation.filter(item => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    if (item.name.toLowerCase().includes(searchLower)) return true;
    if (item.children) {
      return item.children.some(child => 
        child.name.toLowerCase().includes(searchLower)
      );
    }
    return false;
  });

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-500';
      case 'company': return 'bg-blue-500';
      case 'user': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'company': return 'Company';
      case 'user': return 'Candidate';
      default: return 'User';
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => dispatch(toggleSidebar())}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 max-h-screen bg-white shadow-2xl transition-all duration-300 z-50 lg:relative lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0 w-80' : '-translate-x-full lg:translate-x-0 lg:w-16'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="text-xl font-bold text-white">Rezulyzer</h1>
                  <p className="text-xs text-blue-100">Intelligent Assessment</p>
                </div>
              )}
            </div>
            {/* Mobile toggle */}
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
            {/* Desktop toggle */}
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="hidden lg:inline-flex ml-2 p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>

          {/* Search */}
          {sidebarOpen && (currentUser?.role === 'super_admin' || currentUser?.role === 'company') && (
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              if (item.children) {
                const isExpanded = expandedGroups[item.name];
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleGroup(item.name)}
                      className="w-full group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700"
                    >
                      <div className="flex items-center">
                        <item.icon className="flex-shrink-0 h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                        {sidebarOpen && <span className="ml-3 font-medium">{item.name}</span>}
                      </div>
                      {sidebarOpen && (
                        <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-90' : ''
                        }`} />
                      )}
                    </button>
                    {sidebarOpen && isExpanded && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.children.map((child) => {
                          const isActive = location.pathname === child.href;
                          return (
                            <NavLink
                              key={child.name}
                              to={child.href}
                              className={`group flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                                isActive
                                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              <child.icon className={`flex-shrink-0 h-4 w-4 ${
                                isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                              }`} />
                              <span className="ml-2 flex-1">{child.name}</span>
                              {child.badge && (
                                <span className="ml-2 bg-red-500 text-white text-xxs rounded-full px-2 py-0.5">{child.badge}</span>
                              )}
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = location.pathname === item.href || 
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center justify-between px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className={`flex-shrink-0 h-5 w-5 ${
                      isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                    }`} />
                    {sidebarOpen && <span className="ml-3">{item.name}</span>}
                    {!sidebarOpen && (
                      <div className="absolute left-20 ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap shadow-lg">
                        {item.name}
                      </div>
                    )}
                  </div>
                  {sidebarOpen && item.badge && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="border-t border-gray-200 bg-gray-50">
            {sidebarOpen && (
              <div className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`w-12 h-12 ${getRoleColor(currentUser?.role)} rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg`}>
                    {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {currentUser?.firstName} {currentUser?.lastName}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getRoleColor(currentUser?.role)}`}>
                        {getRoleLabel(currentUser?.role)}
                      </span>
                      <Bell className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            )}
            {!sidebarOpen && (
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors group relative"
                >
                  <LogOut className="w-5 h-5 mx-auto" />
                  <div className="absolute left-16 ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap">
                    Logout
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;