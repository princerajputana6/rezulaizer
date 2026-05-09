'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Settings as SettingsIcon, User, KeyRound, Save, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { showToast } from '@/redux/slices/toastSlice';

const SettingsScreen = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    name: '',
    email: '',
    phone: '',
    userType: '',
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/api/profile');
        if (!active) return;
        if (res.data?.success) {
          const d = res.data.data || {};
          setProfile({
            firstName: d.firstName || '',
            lastName: d.lastName || '',
            name: d.name || '',
            email: d.email || '',
            phone: d.phone || '',
            userType: d.userType || '',
          });
        }
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load settings');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const saveProfile = async () => {
    try {
      setSaving(true);
      setError('');
      const body = {
        firstName: profile.firstName || undefined,
        lastName: profile.lastName || undefined,
        email: profile.email || undefined,
        phone: profile.phone || undefined,
      };
      if (profile.userType === 'Company') body.name = profile.name || undefined;
      const res = await apiClient.put('/api/profile', body);
      if (res.data?.success) {
        dispatch(showToast({ message: 'Profile updated', type: 'success' }));
      }
    } catch (e) {
      dispatch(showToast({ message: e.response?.data?.message || 'Failed to save profile', type: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword.length < 6) {
      dispatch(showToast({ message: 'New password must be at least 6 characters', type: 'error' }));
      return;
    }
    if (pw.newPassword !== pw.confirm) {
      dispatch(showToast({ message: 'Passwords do not match', type: 'error' }));
      return;
    }
    try {
      setPwSaving(true);
      const res = await apiClient.put('/api/profile/password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      if (res.data?.success) {
        dispatch(showToast({ message: 'Password changed', type: 'success' }));
        setPw({ currentPassword: '', newPassword: '', confirm: '' });
      }
    } catch (e) {
      dispatch(showToast({ message: e.response?.data?.message || 'Failed to change password', type: 'error' }));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account, profile, and password</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center text-red-700 bg-red-50 border border-red-200 rounded p-3">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Account Profile</h2>
            {profile.userType && (
              <span className="ml-auto text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {profile.userType}
              </span>
            )}
          </div>
          {loading ? (
            <div className="p-8 flex items-center text-gray-500">
              <Loader className="w-4 h-4 animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {profile.userType === 'Company' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input className="w-full border rounded px-3 py-2" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" className="w-full border rounded px-3 py-2" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input className="w-full border rounded px-3 py-2" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={saveProfile} disabled={saving} className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                  {saving ? (
                    <><Loader className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Save Profile</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
          </div>
          <form onSubmit={changePassword} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input type="password" className="w-full border rounded px-3 py-2" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input type="password" className="w-full border rounded px-3 py-2" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required minLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input type="password" className="w-full border rounded px-3 py-2" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required minLength={6} />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={pwSaving} className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                {pwSaving ? (
                  <><Loader className="w-4 h-4 mr-2 animate-spin" /> Updating…</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Update Password</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
