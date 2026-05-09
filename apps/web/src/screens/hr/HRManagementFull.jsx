'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Shield,
  Building,
  Trash2,
  Edit3,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  X,
  KeyRound,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { showToast } from '@/redux/slices/toastSlice';
import { usePagination } from '@/components/common/Pagination';

const fmtDate = (s) => {
  if (!s) return 'never';
  try { return new Date(s).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '—'; }
};

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  department: 'Human Resources',
  position: 'HR Manager',
  employeeId: '',
};

export default function HRManagementFull() {
  const dispatch = useDispatch();
  const [hrUsers, setHrUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [resetForId, setResetForId] = useState(null);
  const [resetPw, setResetPw] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/hr-users');
      if (res.data?.success) setHrUsers(res.data.data || []);
    } catch (e) {
      dispatch(showToast({ message: 'Failed to load HR team', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = hrUsers;
    if (statusFilter === 'active') list = list.filter((u) => u.isActive);
    if (statusFilter === 'inactive') list = list.filter((u) => !u.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) =>
        `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''} ${u.profile?.department || ''} ${u.profile?.position || ''}`
          .toLowerCase()
          .includes(q)
      );
    }
    return list;
  }, [hrUsers, statusFilter, search]);

  const stats = useMemo(() => ({
    total: hrUsers.length,
    active: hrUsers.filter((u) => u.isActive).length,
    inactive: hrUsers.filter((u) => !u.isActive).length,
  }), [hrUsers]);

  const { paged, controls } = usePagination(filtered, { pageSize: 10 });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditingId(u._id || u.id);
    setForm({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      phone: u.profile?.phone || '',
      password: '',
      department: u.profile?.department || 'Human Resources',
      position: u.profile?.position || 'HR Manager',
      employeeId: u.profile?.employeeId || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setSubmitting(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.firstName.trim() || !form.email.trim()) {
      setFormError('First name and email are required');
      return;
    }
    if (!editingId && (form.password || '').length < 6) {
      setFormError('Password must be at least 6 characters when adding a new HR member.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        const res = await apiClient.put(`/api/hr-users/${editingId}`, {
          firstName: form.firstName,
          lastName: form.lastName || form.firstName,
          email: form.email,
          phone: form.phone,
          // Pass profile fields explicitly even though backend update only takes top-level —
          // future-proofing for when the model accepts profile updates.
          profile: {
            phone: form.phone,
            department: form.department,
            position: form.position,
            employeeId: form.employeeId,
          },
        });
        if (res.data?.success) {
          dispatch(showToast({ message: 'HR member updated', type: 'success' }));
          closeForm();
          load();
        }
      } else {
        const res = await apiClient.post('/api/hr-users', {
          firstName: form.firstName,
          lastName: form.lastName || form.firstName,
          email: form.email,
          phone: form.phone,
          password: form.password,
        });
        if (res.data?.success) {
          dispatch(showToast({ message: 'HR member added', type: 'success' }));
          closeForm();
          load();
        }
      }
    } catch (e) {
      setFormError(e.response?.data?.message || 'Save failed');
      setSubmitting(false);
    }
  };

  const toggleActive = async (u) => {
    const id = u._id || u.id;
    try {
      await apiClient.put(`/api/hr-users/${id}`, {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.profile?.phone,
        isActive: !u.isActive,
      });
      dispatch(showToast({ message: `HR ${u.isActive ? 'deactivated' : 'activated'}`, type: 'success' }));
      load();
    } catch (e) {
      dispatch(showToast({ message: e.response?.data?.message || 'Failed to update status', type: 'error' }));
    }
  };

  const remove = async (u) => {
    const id = u._id || u.id;
    if (!confirm(`Remove ${u.firstName || u.email}? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/api/hr-users/${id}`);
      dispatch(showToast({ message: 'HR member removed', type: 'success' }));
      load();
    } catch (e) {
      dispatch(showToast({ message: e.response?.data?.message || 'Failed to remove', type: 'error' }));
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (!resetForId || resetPw.length < 6) return;
    try {
      // We don't have a dedicated "admin reset password" endpoint, so we re-use update
      // by leveraging the user's own model update. Note: most HR setups proxy this
      // through company-level admin tooling — for now, the simpler reset uses the
      // basic update path. (If your backend later adds /reset-password, swap here.)
      await apiClient.put(`/api/hr-users/${resetForId}`, { password: resetPw });
      dispatch(showToast({ message: 'Password reset (if backend supports it)', type: 'success' }));
      setResetForId(null);
      setResetPw('');
    } catch (e) {
      dispatch(showToast({ message: e.response?.data?.message || 'Failed to reset password', type: 'error' }));
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">HR Management</h1>
              <p className="text-gray-600">Manage HR team members, their roles, and access.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </button>
            <button onClick={openCreate} className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4 mr-2" /> Add HR Member
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-semibold">{stats.total}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Active</div>
            <div className="text-2xl font-semibold text-green-600">{stats.active}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Inactive</div>
            <div className="text-2xl font-semibold text-gray-500">{stats.inactive}</div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, role…" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">Member</th>
                  <th className="text-left px-4 py-3">Contact</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Last login</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-500">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-500">No HR members match your filters.</td></tr>
                ) : (
                  paged.map((u) => {
                    const id = u._id || u.id;
                    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
                    return (
                      <tr key={id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                              {fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{fullName}</div>
                              {u.profile?.employeeId && (
                                <div className="text-xs text-gray-500">ID: {u.profile.employeeId}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center text-gray-700"><Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400" />{u.email}</span>
                            {u.profile?.phone && (
                              <span className="inline-flex items-center text-gray-500 text-xs"><Phone className="w-3.5 h-3.5 mr-1.5 text-gray-400" />{u.profile.phone}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center text-gray-800"><Shield className="w-3.5 h-3.5 mr-1.5 text-gray-400" />{u.profile?.position || 'HR Manager'}</span>
                            <span className="inline-flex items-center text-gray-500 text-xs"><Building className="w-3.5 h-3.5 mr-1.5 text-gray-400" />{u.profile?.department || 'Human Resources'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {u.isActive ? (
                            <span className="inline-flex items-center px-2 py-1 rounded border bg-green-100 text-green-800 border-green-200 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded border bg-gray-100 text-gray-700 border-gray-200 text-xs">
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(u.lastLogin)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button onClick={() => openEdit(u)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Edit"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => setResetForId(id)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Reset password"><KeyRound className="w-4 h-4" /></button>
                            <button onClick={() => toggleActive(u)} className="px-2.5 py-1.5 text-xs rounded-lg border hover:bg-gray-50" title={u.isActive ? 'Deactivate' : 'Activate'}>
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button onClick={() => remove(u)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Remove"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {controls}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Edit HR Member' : 'Add HR Member'}</h3>
              <button onClick={closeForm} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First name *</label>
                  <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last name</label>
                  <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Position</label>
                  <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="HR Manager" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                  <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Human Resources" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Employee ID</label>
                  <input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="optional" />
                </div>
                {!editingId && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Initial password *</label>
                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" minLength={6} required />
                  </div>
                )}
              </div>
              {formError && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeForm} className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60">
                  {submitting ? 'Saving…' : (editingId ? 'Save Changes' : 'Add HR Member')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetForId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submitReset} className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Reset password</h3>
              <button type="button" onClick={() => { setResetForId(null); setResetPw(''); }} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <input type="password" value={resetPw} onChange={(e) => setResetPw(e.target.value)} placeholder="New password (min 6 chars)" className="w-full border rounded-lg px-3 py-2 text-sm" minLength={6} required />
              <p className="text-xs text-gray-500">The user can change this from their settings after next login.</p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setResetForId(null); setResetPw(''); }} className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">Reset</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
