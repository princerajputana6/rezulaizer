'use client';
import React, { useState } from 'react';
import { CheckCircle, Copy, Mail, Eye, EyeOff, X } from 'lucide-react';

const CompanyCreatedModal = ({ isOpen, onClose, companyData }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !companyData) return null;

  const { company, temporaryPassword } = companyData;

  const copyToClipboard = async () => {
    const credentials = `Email: ${company.email}\nPassword: ${temporaryPassword}`;
    try {
      await navigator.clipboard.writeText(credentials);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header with prominent close button */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Company Created!</h2>
              <p className="text-sm text-gray-600">Credentials generated</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">

          {/* Company Info */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <h3 className="font-medium text-gray-900 mb-1">{company.companyName}</h3>
            <p className="text-sm text-gray-600">{company.contactPerson?.name} • {company.industry}</p>
          </div>

          {/* Login Credentials Display */}
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Temporary Password</label>
                <div className="relative">
                  <div className="bg-gray-50 px-2 py-1 rounded text-sm font-mono pr-8">
                    {showPassword ? temporaryPassword : '••••••••••••'}
                  </div>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={copyToClipboard}
              className="mt-2 w-full flex items-center justify-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Copy className="w-3 h-3 mr-1" />
              {copied ? 'Copied!' : 'Copy Credentials'}
            </button>
          </div>

          {/* Email Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center text-sm text-blue-800">
              <Mail className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" />
              <span>Credentials sent to {company.email}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              Close
            </button>
            <button
              onClick={() => {
                window.open(`mailto:${company.email}?subject=Welcome to Rezulyzer&body=Your login credentials:%0D%0AEmail: ${company.email}%0D%0APassword: ${temporaryPassword}`, '_blank');
              }}
              className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center"
            >
              <Mail className="w-3 h-3 mr-1" />
              Manual Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyCreatedModal;