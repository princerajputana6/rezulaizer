'use client';
import React, { useState } from 'react';
import { X, Eye, EyeOff, Copy, Mail, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { showToast } from '../redux/slices/toastSlice';
import { apiClient } from '../services/apiClient';

const CompanyCredentialsModal = ({ isOpen, onClose, company }) => {
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resending, setResending] = useState(false);
  const [newPassword, setNewPassword] = useState(null);
  const [emailSent, setEmailSent] = useState(true);

  if (!isOpen || !company) return null;

  const copyToClipboard = async () => {
    const credentials = `Email: ${company.email}\nPassword: ${newPassword || '[Password already reset]'}`;
    try {
      await navigator.clipboard.writeText(credentials);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      dispatch(showToast({ message: 'Credentials copied to clipboard', type: 'success' }));
    } catch (err) {
      dispatch(showToast({ message: 'Failed to copy credentials', type: 'error' }));
    }
  };

  const handleResendCredentials = async () => {
    if (!company.passwordResetRequired) {
      dispatch(showToast({ 
        message: 'Company has already completed initial setup', 
        type: 'warning' 
      }));
      return;
    }

    setResending(true);
    try {
      const response = await apiClient.post(`/companies/${company._id}/resend-credentials`);
      
      if (response.data.success) {
        const { temporaryPassword, emailSent: emailSentStatus } = response.data.data;
        setNewPassword(temporaryPassword);
        setEmailSent(emailSentStatus);
        
        if (emailSentStatus) {
          dispatch(showToast({ 
            message: 'Credentials resent successfully via email', 
            type: 'success' 
          }));
        } else {
          dispatch(showToast({ 
            message: 'Password updated but email failed to send. New password is displayed below.', 
            type: 'warning' 
          }));
        }
      }
    } catch (error) {
      dispatch(showToast({ 
        message: error.response?.data?.message || 'Failed to resend credentials', 
        type: 'error' 
      }));
    } finally {
      setResending(false);
    }
  };

  const handleManualEmail = () => {
    const password = newPassword || '[Password already reset - use resend function]';
    const subject = 'Welcome to Rezulyzer - Login Credentials';
    const body = `Dear ${company.contactPerson?.name || 'Team'},

Welcome to Rezulyzer!

Your company login credentials:
Email: ${company.email}
Password: ${password}

Please login and reset your password on first access.

Best regards,
Rezulyzer Team`;

    window.open(`mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Company Credentials</h2>
            <p className="text-sm text-gray-600">{company.companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Company Info */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="text-sm text-gray-600">
              <p><strong>Contact:</strong> {company.contactPerson?.name}</p>
              <p><strong>Industry:</strong> {company.industry}</p>
              <p><strong>Status:</strong> 
                <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                  company.passwordResetRequired 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {company.passwordResetRequired ? 'Pending Setup' : 'Active'}
                </span>
              </p>
            </div>
          </div>

          {/* Status Warning */}
          {!company.passwordResetRequired && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-center text-sm text-yellow-800">
                <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Company has completed initial setup. Original password is no longer available.</span>
              </div>
            </div>
          )}

          {/* Email Status Warning */}
          {newPassword && !emailSent && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <div className="flex items-center text-sm text-orange-800">
                <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Email failed to send, but password has been updated. Please share the credentials manually.</span>
              </div>
            </div>
          )}

          {/* Email Success Status */}
          {newPassword && emailSent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center text-sm text-green-800">
                <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>New credentials have been sent successfully via email.</span>
              </div>
            </div>
          )}

          {/* Credentials */}
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-3">Login Credentials</h4>
            
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <div className="bg-gray-50 px-2 py-1 rounded text-sm font-mono">
                  {company.email}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <div className="bg-gray-50 px-2 py-1 rounded text-sm font-mono pr-8">
                    {company.passwordResetRequired ? (
                      showPassword ? (newPassword || '[Click resend to generate]') : '••••••••••••'
                    ) : (
                      '[Password already reset]'
                    )}
                  </div>
                  {company.passwordResetRequired && (
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {company.passwordResetRequired && (
              <button
                onClick={copyToClipboard}
                disabled={!newPassword}
                className="mt-2 w-full flex items-center justify-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <Copy className="w-3 h-3 mr-1" />
                {copied ? 'Copied!' : 'Copy Credentials'}
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {company.passwordResetRequired && (
              <button
                onClick={handleResendCredentials}
                disabled={resending}
                className="w-full flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {resending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend Credentials
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={handleManualEmail}
              className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Manual Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyCredentialsModal;