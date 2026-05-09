'use client';

import React from 'react';
import { useNavigate } from '@/lib/router-compat';
import { CheckCircle2, LogOut } from 'lucide-react';

const CandidateDashboard = () => {
  const navigate = useNavigate();

  const logout = () => {
    if (typeof window !== 'undefined') {
      try {
        // Clear every candidate-side session artefact so the link can't be reused.
        localStorage.removeItem('candidate_token');
        localStorage.removeItem('candidate_info');
        sessionStorage.removeItem('assessment_token');
        sessionStorage.removeItem('dash_test_id');
        sessionStorage.removeItem('dash_attempt_id');
      } catch (_) {}
    }
    // Send the candidate away from the assessment area entirely.
    navigate('/assessment/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border p-10 text-center">
        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-5">
          <CheckCircle2 className="w-9 h-9 text-green-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Thanks for taking the assessment!
        </h1>
        <p className="text-gray-600 mb-2">
          Your responses have been recorded.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          The hiring team will review your assessment and reach out by email with the next step.
          You don&apos;t need to do anything else right now.
        </p>

        <button
          onClick={logout}
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 text-sm"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </button>

        <p className="text-xs text-gray-400 mt-6">
          For your security, logging out will end your assessment session immediately.
        </p>
      </div>
    </div>
  );
};

export default CandidateDashboard;
