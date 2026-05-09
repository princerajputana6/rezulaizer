'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  ClipboardList,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Mail,
  Send,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { showToast } from '@/redux/slices/toastSlice';
import { usePagination } from '@/components/common/Pagination';

const tone = (passed) =>
  passed === true
    ? 'bg-green-100 text-green-800 border-green-200'
    : passed === false
    ? 'bg-red-100 text-red-800 border-red-200'
    : 'bg-gray-100 text-gray-700 border-gray-200';

const fmtDate = (s) => {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

export default function AssessmentResults() {
  const dispatch = useDispatch();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | passed | failed
  const [minPct, setMinPct] = useState('');
  const [maxPct, setMaxPct] = useState('');
  const [sendingId, setSendingId] = useState(null);

  const sendVideoInvite = async (candidate) => {
    const id = candidate._id || candidate.id;
    try {
      setSendingId(id);
      const res = await apiClient.post(`/api/candidates/${id}/send-video-interview`);
      if (res.data?.success) {
        dispatch(showToast({ message: `Video interview invite sent to ${candidate.email}`, type: 'success' }));
        // Refresh so the row shows the updated stage immediately
        load();
      }
    } catch (e) {
      dispatch(showToast({ message: e.response?.data?.message || 'Failed to send invite', type: 'error' }));
    } finally {
      setSendingId(null);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (minPct !== '') params.set('minPercentage', minPct);
      if (maxPct !== '') params.set('maxPercentage', maxPct);
      if (search) params.set('search', search);
      const res = await apiClient.get(`/api/candidates/results?${params.toString()}`);
      if (res.data?.success) setItems(res.data.data?.candidates || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load assessment results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const stats = useMemo(() => {
    const total = items.length;
    const passed = items.filter((i) => i.latestAssessmentPassed === true).length;
    const failed = items.filter((i) => i.latestAssessmentPassed === false).length;
    const avg = total > 0
      ? Math.round(items.reduce((s, i) => s + (i.latestAssessmentPercentage || 0), 0) / total)
      : 0;
    return { total, passed, failed, avg };
  }, [items]);

  const { paged, controls } = usePagination(items, { pageSize: 10 });

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Assessment Results</h1>
              <p className="text-gray-600">Every candidate who completed an assessment, with their score.</p>
            </div>
          </div>
          <button onClick={load} className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Total candidates</div>
            <div className="text-2xl font-semibold">{stats.total}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Passed</div>
            <div className="text-2xl font-semibold text-green-600">{stats.passed}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Failed</div>
            <div className="text-2xl font-semibold text-red-600">{stats.failed}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Avg score</div>
            <div className="text-2xl font-semibold">{stats.avg}%</div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search candidate</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
                placeholder="Name or email…"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="all">All</option>
              <option value="passed">Passed only</option>
              <option value="failed">Failed only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Min %</label>
            <input type="number" min="0" max="100" value={minPct} onChange={(e) => setMinPct(e.target.value)} className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max %</label>
            <input type="number" min="0" max="100" value={maxPct} onChange={(e) => setMaxPct(e.target.value)} className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="100" />
          </div>
          <button onClick={load} className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">
            <Filter className="w-4 h-4 mr-2" /> Apply
          </button>
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">Candidate</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Score</th>
                  <th className="text-left px-4 py-3">Percentage</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Stage</th>
                  <th className="text-left px-4 py-3">Submitted</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-500">Loading…</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-red-600">{error}</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-500">No assessment results yet.</td>
                  </tr>
                ) : (
                  paged.map((c) => {
                    const id = c._id || c.id;
                    const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email;
                    const passed = c.latestAssessmentPassed === true;
                    const inviteSent = ['video_interview_invited', 'video_interview_appeared', 'video_interview_passed', 'video_interview_failed', 'selected', 'offer_released'].includes(c.workflowStage);
                    return (
                      <tr key={id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{fullName}</td>
                        <td className="px-4 py-3 text-gray-700"><span className="inline-flex items-center"><Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400" />{c.email}</span></td>
                        <td className="px-4 py-3">{c.latestAssessmentScore ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold">{c.latestAssessmentPercentage ?? 0}%</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded border text-xs font-medium ${tone(c.latestAssessmentPassed)}`}>
                            {c.latestAssessmentPassed === true ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Passed</> :
                             c.latestAssessmentPassed === false ? <><XCircle className="w-3.5 h-3.5 mr-1" /> Failed</> :
                             'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{(c.workflowStage || 'invited').replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(c.latestAssessmentAt)}</td>
                        <td className="px-4 py-3 text-right">
                          {passed && !inviteSent ? (
                            <button
                              onClick={() => sendVideoInvite(c)}
                              disabled={sendingId === id}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs disabled:opacity-60"
                              title="Send video interview invite"
                            >
                              <Send className="w-3.5 h-3.5 mr-1.5" />
                              {sendingId === id ? 'Sending…' : 'Send to Interview'}
                            </button>
                          ) : passed && inviteSent ? (
                            <span className="text-xs text-green-700 inline-flex items-center">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Invite sent
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
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
    </div>
  );
}
