'use client';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { NavLink, useLocation } from '@/lib/router-compat';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  ClipboardList,
  Video,
  Settings,
  UserCheck,
  Briefcase,
  Calendar,
  BarChart3,
  Shield,
  Database,
  Mail,
  CreditCard,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Zap
} from 'lucide-react';
import logo from '../../assets/images/rezulaizer.png';

const RoleBasedSidebar = ({ isCollapsed, onToggle }) => {
  const currentUser = useSelector(selectCurrentUser);
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({});

  // Get normalized role at component level
  const role = currentUser?.role || currentUser?.userType;
  const normalizedRole = role?.toLowerCase();

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const getSidebarItems = () => {

    switch (normalizedRole) {
      case 'superadmin':
        return [
          {
            section: 'Overview',
            icon: LayoutDashboard,
            items: [
              { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
              { name: 'Analytics', href: '/analytics', icon: BarChart3 },
            ]
          },
          {
            section: 'Management',
            icon: Shield,
            items: [
              { name: 'Companies', href: '/companies', icon: Building2 },
              { name: 'Users', href: '/users', icon: Users },
              { name: 'System Settings', href: '/system-settings', icon: Settings },
              { name: 'Database', href: '/database', icon: Database },
            ]
          },
          {
            section: 'Platform',
            icon: Zap,
            items: [
              { name: 'All Assessments', href: '/all-assessments', icon: ClipboardList },
              { name: 'All Interviews', href: '/all-interviews', icon: Video },
              { name: 'Billing & Plans', href: '/billing', icon: CreditCard },
              { name: 'Email Templates', href: '/email-templates', icon: Mail },
            ]
          }
        ];

      case 'company':
      case 'company_admin':
      case 'hr':
      case 'hr_manager':
        return [
          {
            section: 'Overview',
            icon: LayoutDashboard,
            items: [
              { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
              { name: 'Analytics', href: '/analytics', icon: BarChart3 },
            ]
          },
          {
            section: 'Recruitment',
            icon: Briefcase,
            items: [
              { name: 'Candidates', href: '/candidates', icon: UserCheck },
              { name: 'All Jobs', href: '/jobs', icon: Briefcase },
              { name: 'Assessments', href: '/tests', icon: ClipboardList },
              ...((normalizedRole === 'company' || normalizedRole === 'company_admin') ? [{ name: 'HR Management', href: '/hr-management', icon: Users }] : []),
            ]
          },
          {
            section: 'Interviews',
            icon: Video,
            items: [
              { name: 'Schedule Interview', href: '/schedule-interview', icon: Calendar },
              { name: 'Video Interviews', href: '/video-interviews', icon: Video },
              { name: 'Interview Reports', href: '/interview-reports', icon: BarChart3 },
            ]
          },
          {
            section: 'Settings',
            icon: Settings,
            items: [
              { name: 'Company Profile', href: '/company-profile', icon: Building2 },
              { name: 'Settings', href: '/settings', icon: Settings },
            ]
          }
        ];

      case 'candidate':
        return [
          {
            section: 'My Profile',
            icon: Users,
            items: [
              { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
              { name: 'My Profile', href: '/profile', icon: Users },
            ]
          },
          {
            section: 'Assessments',
            icon: ClipboardList,
            items: [
              { name: 'Available Tests', href: '/available-tests', icon: ClipboardList },
              { name: 'Test History', href: '/test-history', icon: FileText },
              { name: 'Results', href: '/results', icon: BarChart3 },
            ]
          },
          {
            section: 'Interviews',
            icon: Video,
            items: [
              { name: 'Scheduled Interviews', href: '/my-interviews', icon: Video },
              { name: 'Interview History', href: '/interview-history', icon: Calendar },
            ]
          }
        ];

      default:
        return [];
    }
  };

  const sidebarItems = getSidebarItems();

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <div className={`bg-white shadow-lg transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} h-screen flex flex-col border-r border-gray-200`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <img 
                src={logo || '/logo.png'} 
                alt="Rezulyzer" 
                className="h-10 w-auto object-contain"
                onError={(e) => { e.target.src = '/logo.png'; }}
              />
            </div>
          )}
          {isCollapsed && (
            <div className="flex items-center justify-center w-full">
              <img 
                src={logo || '/logo.png'} 
                alt="Rezulyzer" 
                className="h-8 w-auto object-contain"
                onError={(e) => { e.target.src = '/logo.png'; }}
              />
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {sidebarItems.map((section, sectionIndex) => {
          const SectionIcon = section.icon;
          const isExpanded = expandedSections[section.section] ?? true;
          
          return (
            <div key={sectionIndex} className="mb-3">
              {!isCollapsed ? (
                <>
                  <button
                    onClick={() => toggleSection(section.section)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center space-x-2">
                      <SectionIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-xs uppercase tracking-wide font-semibold">{section.section}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                  
                  <div className={`mt-1 space-y-1 transition-all duration-200 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                    {section.items.map((item, itemIndex) => {
                      const Icon = item.icon;
                      const itemIsActive = isActive(item.href);
                      
                      return (
                        <NavLink
                          key={itemIndex}
                          to={item.href}
                          className={`flex items-center px-3 py-2 ml-4 text-sm font-medium rounded-lg transition-colors ${
                            itemIsActive
                              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className={`w-4 h-4 mr-3 ${
                            itemIsActive ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                          <span>{item.name}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  {section.items.map((item, itemIndex) => {
                    const Icon = item.icon;
                    const itemIsActive = isActive(item.href);
                    
                    return (
                      <NavLink
                        key={itemIndex}
                        to={item.href}
                        className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
                          itemIsActive
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                        title={item.name}
                      >
                        <Icon className="w-4 h-4" />
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200">
        {!isCollapsed && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                {currentUser?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.email}</p>
                <p className="text-xs text-gray-500">
                  {normalizedRole === 'superadmin' ? 'Super Administrator' : 
                   normalizedRole === 'company' || normalizedRole === 'company_admin' ? 'Company Admin' :
                   normalizedRole === 'hr' || normalizedRole === 'hr_manager' ? 'HR Manager' : 'Candidate'}
                </p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className={`flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default RoleBasedSidebar;