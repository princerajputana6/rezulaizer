'use client';
import React from 'react';
import { Link } from '@/lib/router-compat';

const PageStub = ({ title, description, actions = [] }) => {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-soft border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="text-gray-600 mt-2">{description}</p>
          )}
        </div>
        <div className="p-6">
          <div className="text-gray-500">
            <p>This page is not implemented yet. It is a placeholder for future development.</p>
            <p className="mt-2">Use the navigation to explore other parts of the app.</p>
          </div>
          {actions?.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {actions.map((a) => (
                <Link key={a.to} to={a.to} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                  {a.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageStub;