'use client';
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from '@/lib/router-compat';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import SuperAdminDashboard from './SuperAdminDashboard';
import CompanyDashboard from './CompanyDashboard';
import CandidateDashboard from './CandidateDashboard';
import PasswordResetModal from '../../components/PasswordResetModal';

const DashboardPage = () => {
  const currentUser = useSelector(selectCurrentUser);
  const location = useLocation();
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Check for password reset requirement from navigation state
  useEffect(() => {
    if (location.state?.passwordResetRequired) {
      setShowPasswordResetModal(true);
      setUserEmail(location.state.userEmail || currentUser?.email || '');
    }
  }, [location.state, currentUser?.email]);

  // Route to appropriate dashboard based on user role
  const renderDashboard = () => {
    const role = currentUser?.role;

    switch (role) {
      case 'superadmin':
        return <SuperAdminDashboard />;
      case 'company_admin':
      case 'hr_manager':
        return <CompanyDashboard />;
      case 'candidate':
        return <CandidateDashboard />;
      default:
        return (
          <div className="p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Rezulyzer</h1>
              <p className="text-gray-600">Please contact your administrator to set up your role.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {renderDashboard()}
      
      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
        userEmail={userEmail}
      />
    </>
  );
};

export default DashboardPage;