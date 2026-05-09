'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Award,
  Send,
  RefreshCw,
  Mail,
  CheckCircle2,
  X,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { showToast } from '@/redux/slices/toastSlice';
import { usePagination } from '@/components/common/Pagination';

const fmtDate = (s) => {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
};

const stageLabel = (s) =>
  s === 'offer_released' ? 'Offer Released' :
  s === 'selected' ? 'Selected' :
  s === 'video_interview_passed' ? 'Cleared Interview' :
  (s || '').replace(/_/g, ' ');

export default function InterviewReports() {
  const dispatch = useDispatch();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offerFor, setOfferFor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ role: '', salary: '', startDate: '', message: '' });

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get('/api/candidates/selected');
      if (res.data?.success) setItems(res.data.data?.candidates || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load selected candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const { paged, controls } = usePagination(items, { pageSize: 10 });

  const counts = useMemo(() => ({
    total: items.length,
    offered: items.filter((c) => c.workflowStage === 'offer_released').length,
    pending: items.filter((c) => c.workflowStage !== 'offer_released').length,
  }), [items]);

  const openOffer = (c) => {
    setOfferFor(c);
    setForm({ role: '', salary: '', startDate: '', message: '' });
  };

  const closeOffer = () => {
    setOfferFor(null);
    setSubmitting(false);
  };

  const submitOffer = async (e) => {
    e?.preventDefault?.();
    if (!offerFor) return;
    const id = offerFor._id || offerFor.id;
    try {
      setSubmitting(true);
      const res = await apiClient.post(`/api/candidates/${id}/release-offer`, form);
      if (res.data?.success) {
        dispatch(showToast({ message: `Offer letter sent to ${offerFor.email}`, type: 'success' }));
        closeOffer();
        load();
      }
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Failed to release offer', type: 'error' }));
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Interview Reports</h1>
              <p className="text-gray-600">Selected candidates and offer letter management.</p>
            </div>
          </div>
          <button onClick={load} className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Selected (round 2)</div>
            <div className="text-2xl font-semibold">{counts.total}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Offers released</div>
            <div className="text-2xl font-semibold text-emerald-600">{counts.offered}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Pending offer</div>
            <div className="text-2xl font-semibold text-yellow-600">{counts.pending}</div>
          </div>
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">Candidate</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Score</th>
                  <th className="text-left px-4 py-3">Stage</th>
                  <th className="text-left px-4 py-3">Offer Released</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-500">Loading…</td></tr>
                ) : error ? (
                  <tr><td colSpan={6} className="text-center py-10 text-red-600">{error}</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-500">No selected candidates yet.</td></tr>
                ) : (
                  paged.map((c) => {
                    const id = c._id || c.id;
                    const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email;
                    const offered = c.workflowStage === 'offer_released';
                    return (
                      <tr key={id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{fullName}</td>
                        <td className="px-4 py-3 text-gray-700"><span className="inline-flex items-center"><Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400" />{c.email}</span></td>
                        <td className="px-4 py-3 font-semibold">{c.latestAssessmentPercentage ?? 0}%</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded border text-xs ${offered ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                            {stageLabel(c.workflowStage)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(c.offerReleasedAt)}</td>
                        <td className="px-4 py-3 text-right">
                          {offered ? (
                            <span className="inline-flex items-center text-emerald-700 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Offer sent
                            </span>
                          ) : (
                            <button
                              onClick={() => openOffer(c)}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
                            >
                              <Send className="w-3.5 h-3.5 mr-1.5" /> Release Offer
                            </button>
                          )}
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

      {offerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">Release Offer Letter</h3>
                <p className="text-sm text-gray-500">For {`${offerFor.firstName || ''} ${offerFor.lastName || ''}`.trim() || offerFor.email}</p>
              </div>
              <button onClick={closeOffer} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submitOffer} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role / Position</label>
                <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Senior Frontend Engineer" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Compensation</label>
                  <input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. ₹18 LPA" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tentative start date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Personal note (optional)</label>
                <textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Welcome message…" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeOffer} className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60">
                  {submitting ? 'Sending…' : 'Send Offer Letter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
