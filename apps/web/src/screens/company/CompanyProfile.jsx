'use client';
import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { Building2, Save, Loader, AlertCircle, Users, Plus, Trash2, Mail, Shield } from 'lucide-react';

const CompanyProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    company: {
      companyName: '',
      website: '',
      industry: '',
      size: '',
    },
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      country: '',
      pincode: ''
    },
    contact: {
      name: '',
      email: '',
      phone: ''
    },
    legal: {
      gst: '',
      pan: '',
      cin: ''
    },
    banking: {
      accountName: '',
      accountNumber: '',
      ifsc: '',
      bankName: '',
      branch: ''
    },
    billing: {
      billingEmail: '',
      billingAddress: '',
      currency: 'INR'
    }
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/i;
  const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/i;
  const IFSC_REGEX = /^[A-Z]{4}0[0-9A-Z]{6}$/i;

  const validateField = (section, field, value) => {
    let msg = '';
    if (section === 'legal' && field === 'pan' && value) {
      if (!PAN_REGEX.test(value)) msg = 'PAN should be 10 chars (e.g., ABCDE1234F)';
    }
    if (section === 'legal' && field === 'gst' && value) {
      if (!GST_REGEX.test(value)) msg = 'GST should be 15 chars (e.g., 22ABCDE1234F1Z5)';
    }
    if (section === 'banking' && field === 'ifsc' && value) {
      if (!IFSC_REGEX.test(value)) msg = 'IFSC format e.g., HDFC0123456';
    }
    setFieldErrors(prev => ({ ...prev, [`${section}.${field}`]: msg }));
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get('/companies/profile');
      if (res.data?.success) {
        const p = res.data.data?.profile || {};
        setProfile(prev => ({
          ...prev,
          ...p,
          company: { ...prev.company, ...(p.company || {}) },
          address: { ...prev.address, ...(p.address || {}) },
          contact: { ...prev.contact, ...(p.contact || {}) },
          legal: { ...prev.legal, ...(p.legal || {}) },
          banking: { ...prev.banking, ...(p.banking || {}) },
          billing: { ...prev.billing, ...(p.billing || {}) }
        }));
      } else {
        setError('Failed to load company profile');
      }
    } catch (e) {
      setError('Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      setSaved(false);
      setError('');
      const res = await apiClient.put('/companies/profile', { profile });
      if (res.data?.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError('Failed to save profile');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (section, field, value) => {
    setProfile(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    // live clear error when user edits
    if (fieldErrors[`${section}.${field}`]) {
      setFieldErrors(prev => ({ ...prev, [`${section}.${field}`]: '' }));
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Company Profile</h1>
            <p className="text-gray-600">View and update your company information</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border">
          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <Loader className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {/* Company */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Company</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.company.companyName} onChange={e => setField('company','companyName', e.target.value)} placeholder="Rezulyzer Pvt Ltd" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.company.website} onChange={e => setField('company','website', e.target.value)} placeholder="https://example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.company.industry} onChange={e => setField('company','industry', e.target.value)} placeholder="Software" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.company.size} onChange={e => setField('company','size', e.target.value)} placeholder="51-200" />
                  </div>
                </div>
              </section>

              {/* Address */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.address.line1} onChange={e => setField('address','line1', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.address.line2} onChange={e => setField('address','line2', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.address.city} onChange={e => setField('address','city', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.address.state} onChange={e => setField('address','state', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.address.country} onChange={e => setField('address','country', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.address.pincode} onChange={e => setField('address','pincode', e.target.value)} />
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Primary Contact</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.contact.name} onChange={e => setField('contact','name', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.contact.email} onChange={e => setField('contact','email', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.contact.phone} onChange={e => setField('contact','phone', e.target.value)} />
                  </div>
                </div>
              </section>

              {/* Legal */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Legal</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GST</label>
                    <input
                      className={`w-full border rounded px-3 py-2 uppercase tracking-wider ${fieldErrors['legal.gst'] ? 'border-red-400' : 'border-gray-300'}`}
                      value={profile.legal.gst}
                      maxLength={15}
                      onChange={e => setField('legal','gst', normalizeGST(e.target.value))}
                      onBlur={e => validateField('legal','gst', e.target.value)}
                    />
                    {fieldErrors['legal.gst'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['legal.gst']}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                    <input
                      className={`w-full border rounded px-3 py-2 uppercase tracking-wider ${fieldErrors['legal.pan'] ? 'border-red-400' : 'border-gray-300'}`}
                      value={profile.legal.pan}
                      maxLength={10}
                      onChange={e => setField('legal','pan', normalizePAN(e.target.value))}
                      onBlur={e => validateField('legal','pan', e.target.value)}
                    />
                    {fieldErrors['legal.pan'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['legal.pan']}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CIN</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.legal.cin} onChange={e => setField('legal','cin', e.target.value)} />
                  </div>
                </div>
              </section>

              {/* Banking */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Banking</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.banking.accountName} onChange={e => setField('banking','accountName', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.banking.accountNumber} onChange={e => setField('banking','accountNumber', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IFSC/SWIFT</label>
                    <input
                      className={`w-full border rounded px-3 py-2 uppercase tracking-wider ${fieldErrors['banking.ifsc'] ? 'border-red-400' : 'border-gray-300'}`}
                      value={profile.banking.ifsc}
                      maxLength={11}
                      onChange={e => setField('banking','ifsc', normalizeIFSC(e.target.value))}
                      onBlur={e => validateField('banking','ifsc', e.target.value)}
                    />
                    {fieldErrors['banking.ifsc'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['banking.ifsc']}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.banking.bankName} onChange={e => setField('banking','bankName', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.banking.branch} onChange={e => setField('banking','branch', e.target.value)} />
                  </div>
                </div>
              </section>

              {/* Billing */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Email</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.billing.billingEmail} onChange={e => setField('billing','billingEmail', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.billing.billingAddress} onChange={e => setField('billing','billingAddress', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <input className="w-full border rounded px-3 py-2" value={profile.billing.currency} onChange={e => setField('billing','currency', e.target.value)} placeholder="INR" />
                  </div>
                </div>
              </section>

              <div className="flex justify-end">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Save Changes
                    </>
                  )}
                </button>
              </div>

              {saved && (
                <div className="text-green-700 bg-green-50 border border-green-200 rounded p-3">
                  Changes saved successfully.
                </div>
              )}
            </div>
          )}
        </div>

        <HRTeamSection />
      </div>
    </div>
  );
};

const HRTeamSection = () => {
  const [hrUsers, setHrUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/hr-users');
      if (res.data?.success) setHrUsers(res.data.data || []);
    } catch (e) {
      // surface error inline; keep page usable
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.firstName.trim() || !form.email.trim() || form.password.length < 6) {
      setFormError('First name, email, and a password (6+ chars) are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.post('/api/hr-users', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || form.firstName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
      });
      if (res.data?.success) {
        setForm({ firstName: '', lastName: '', email: '', password: '', phone: '' });
        setShowForm(false);
        load();
      } else {
        setFormError(res.data?.message || 'Failed to add HR user');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add HR user');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Remove this HR member?')) return;
    try {
      await apiClient.delete(`/api/hr-users/${id}`);
      load();
    } catch (err) {
      // swallow; keep UI alive
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border mt-6">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" /> HR Team
          </h2>
          <p className="text-sm text-gray-500">HR managers who can invite candidates and run interviews on behalf of your company.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Add HR Member
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="px-6 py-5 border-b bg-gray-50 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="border rounded px-3 py-2" placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            <input className="border rounded px-3 py-2" placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <input type="email" className="border rounded px-3 py-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className="border rounded px-3 py-2" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input type="password" className="border rounded px-3 py-2 md:col-span-2" placeholder="Initial password (min 6 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>
          {formError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</div>
          )}
          <div className="flex items-center gap-2">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              {submitting ? 'Adding…' : 'Add HR Member'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError(''); }} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-6 flex items-center text-gray-500">
          <Loader className="w-4 h-4 animate-spin mr-2" /> Loading HR members…
        </div>
      ) : hrUsers.length === 0 ? (
        <div className="p-8 text-center text-gray-600">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-900">No HR members yet</p>
          <p className="text-sm">Add your first HR teammate to delegate hiring tasks.</p>
        </div>
      ) : (
        <div className="divide-y">
          {hrUsers.map((u) => {
            const id = u._id || u.id;
            const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
            return (
              <div key={id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                    {fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{fullName}</div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center"><Mail className="w-4 h-4 mr-1" /> {u.email}</span>
                      <span className="flex items-center"><Shield className="w-4 h-4 mr-1" /> HR Manager</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => remove(id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Remove">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CompanyProfile;