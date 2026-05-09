'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  Settings,
  Database,
  ClipboardList,
  Video,
  CreditCard,
  Mail,
  UserCheck,
  BarChart3,
  User,
  FileText,
  Calendar,
} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { apiClient } from '@/services/apiClient';
import CompanyManagement from '@/screens/CompanyManagement';
import AIAssessmentCreator from '@/screens/test/AIAssessmentCreator';

export const CompaniesPage = () => <CompanyManagement />;

export const UsersPage = () => (
  <div className="p-6">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage platform users and permissions</p>
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-600">User management features will be available here.</p>
        </div>
      </div>
    </div>
  </div>
);

export const SystemSettingsPage = () => (
  <div className="p-6">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">System Settings</h1>
            <p className="text-gray-600">Configure platform-wide settings</p>
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-600">System settings will be available here.</p>
        </div>
      </div>
    </div>
  </div>
);

export const DatabasePage = () => (
  <div className="p-6">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Database Management</h1>
            <p className="text-gray-600">Monitor and manage database operations</p>
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-600">Database management tools will be available here.</p>
        </div>
      </div>
    </div>
  </div>
);

export const AllAssessmentsPage = () => (
  <div className="p-8">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">All Assessments</h1>
            <p className="text-slate-600">View all assessments across the platform</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const AllInterviewsPage = () => (
  <div className="p-8">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">All Interviews</h1>
            <p className="text-slate-600">Monitor all interviews across companies</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const BillingPage = () => (
  <div className="p-8">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Billing &amp; Plans</h1>
            <p className="text-slate-600">Manage subscription plans and billing</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const EmailTemplatesPage = () => (
  <div className="p-8">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Email Templates</h1>
            <p className="text-slate-600">Manage email templates and notifications</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const AssessmentsPage = () => {
  const [openTemplateModal, setOpenTemplateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const navigate = useNavigate();

  const loadTemplates = async () => {
    try {
      setLoadingTpl(true);
      const res = await apiClient.get('/api/jd-templates');
      if (res.data?.success) setTemplates(res.data.data || []);
    } catch (e) {
      // ignore
    } finally {
      setLoadingTpl(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const deleteTemplate = async (id) => {
    try {
      await apiClient.delete(`/api/jd-templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      // ignore
    }
  };

  const useTemplate = (tpl) => {
    if (!tpl) return;
    // Next.js router.push doesn't support state; persist via sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'createTest:jobDescription',
        JSON.stringify({
          title: tpl.title,
          department: tpl.department,
          role: tpl.role,
          salary: tpl.salary,
          location: tpl.location,
          experienceLevel: tpl.experienceLevel,
          skills: tpl.skills,
          summary: tpl.summary,
          responsibilities: tpl.responsibilities || [],
          qualifications: tpl.qualifications || [],
        })
      );
    }
    navigate('/create-test');
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Assessments</h1>
              <p className="text-slate-600">Create and manage assessments</p>
            </div>
          </div>
          <div className="mb-4 flex gap-3">
            <button
              onClick={() => setOpenTemplateModal(true)}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Create Assessment
            </button>
            <button
              onClick={loadTemplates}
              className="inline-flex items-center px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-gray-50"
            >
              Refresh Templates
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border mt-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Saved Templates</h2>
            {loadingTpl && <span className="text-sm text-gray-500">Loading...</span>}
          </div>
          {templates.length === 0 ? (
            <p className="text-gray-500">
              No templates saved yet. Click &quot;Create Assessment&quot; to generate and save one.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <div key={t.id} className="border rounded-lg p-4">
                  <div className="mb-2">
                    <h3 className="font-medium text-gray-900 truncate">{t.title}</h3>
                    <p className="text-sm text-gray-500 truncate">
                      {t.department || '—'} {t.domain ? `• ${t.domain}` : ''}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">{t.location || ''}</div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => useTemplate(t)}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      Use
                    </button>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {openTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpenTemplateModal(false)}
          />
          <div className="relative bg-white w-full max-w-5xl mx-4 rounded-lg shadow-lg border p-0">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Create Assessment Template
              </h3>
              <button
                onClick={() => setOpenTemplateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-y-auto">
              <AIAssessmentCreator />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const InterviewReportsPage = () => (
  <div className="p-8">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Interview Reports</h1>
            <p className="text-slate-600">View detailed interview analytics</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ProfilePage = () => (
  <div className="p-8">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">My Profile</h1>
            <p className="text-slate-600">Manage your personal information</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const AvailableTestsPage = () => (
  <div className="p-8">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Available Tests</h1>
            <p className="text-slate-600">Tests available for you to take</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const TestHistoryPage = () => (
  <div className="p-8">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Test History</h1>
            <p className="text-slate-600">View your completed tests</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ResultsPage = () => (
  <div className="p-8">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Results</h1>
            <p className="text-slate-600">View your test results and scores</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const MyInterviewsPage = () => (
  <div className="p-8">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Scheduled Interviews</h1>
            <p className="text-slate-600">Your upcoming interviews</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const InterviewHistoryPage = () => (
  <div className="p-8">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Interview History</h1>
            <p className="text-slate-600">Your completed interviews</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const AnalyticsPage = () => (
  <div className="p-8">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Analytics</h1>
            <p className="text-slate-600">Comprehensive analytics and insights</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const SettingsPage = () => (
  <div className="p-8">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
            <p className="text-slate-600">Configure your preferences</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);
