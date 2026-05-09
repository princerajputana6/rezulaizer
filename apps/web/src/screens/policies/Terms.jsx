'use client';
import React from 'react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms & Conditions</h1>
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4 text-gray-700">
          <p>
            These Terms and Conditions ("Terms") govern your use of the Rezulyzer platform. By accessing or
            using our services, you agree to be bound by these Terms.
          </p>
          <h2 className="text-xl font-semibold text-gray-900">Use of Service</h2>
          <p>
            You agree to use the service only for lawful purposes and in compliance with applicable laws and
            regulations. You are responsible for maintaining the confidentiality of your account credentials.
          </p>
          <h2 className="text-xl font-semibold text-gray-900">Limitation of Liability</h2>
          <p>
            Rezulyzer is provided on an "as is" basis. We are not liable for any indirect or consequential
            damages arising from the use of our platform.
          </p>
          <h2 className="text-xl font-semibold text-gray-900">Changes</h2>
          <p>
            We may update these Terms from time to time. Continued use of the platform constitutes acceptance
            of the updated Terms.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;