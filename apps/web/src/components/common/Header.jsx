'use client';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Menu, Bell, Search, User, LogOut, Settings } from 'lucide-react';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import { selectSidebarOpen, toggleSidebar, selectNotifications } from '../../redux/slices/uiSlice';
import { logout } from '../../redux/slices/authSlice';

const Header = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const sidebarOpen = useSelector(selectSidebarOpen);
  const notifications = useSelector(selectNotifications);

  const handleLogout = () => {
    dispatch(logout());
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Search */}
          <div className="relative hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search tests, users..."
              className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md">
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* User menu */}
          <div className="relative group">
            <button className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 p-1 hover:bg-gray-50 transition-colors">
              <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
                {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
              </div>
            </button>

            {/* Dropdown menu */}
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border">
              {/* User Info Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
                    {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {currentUser?.firstName} {currentUser?.lastName}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {currentUser?.role?.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-gray-400">
                      {currentUser?.email}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Menu Items */}
              <a
                href="#"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <User className="h-4 w-4 mr-3" />
                Profile
              </a>
              <a
                href="#"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Settings className="h-4 w-4 mr-3" />
                Settings
              </a>
              <hr className="my-1" />
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;