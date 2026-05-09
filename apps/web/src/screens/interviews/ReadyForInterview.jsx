'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Video,
  Send,
  CheckCircle2,
  RefreshCw,
  Mail,
  Sliders,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { showToast } from '@/redux/slices/toastSlice';
import { usePagination } from '@/components/common/Pagination';

const fmtDate = (s) => {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

export default function ReadyForInterview() {
  const dispatch = useDispatch();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [threshold, setThreshold] = useState(60);
  const [sendingId, setSendingId] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch passed candidates
      const res = await apiClient.get(`/api/candidates/passed?threshold=${threshold}`);
      if (res.data?.success) {
        setItems(res.data.data?.candidates || []);
      }
      
      // Fetch debug info - all candidates with assessment results
      try {
        const debugRes = await apiClient.get('/api/candidates/results?limit=100');
        if (debugRes.data?.success) {
          const allResults = debugRes.data.data?.candidates || [];
          setDebugInfo({
            total: allResults.length,
            passed: allResults.filter(c => c.latestAssessmentPassed).length,
            failed: allResults.filter(c => c.latestAssessmentPassed === false).length,
            aboveThreshold: allResults.filter(c => c.latestAssessmentPercentage >= threshold).length
          });
        }
      } catch (e) {
        console.warn('Failed to load debug info:', e);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load passed candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { paged, controls } = usePagination(items, { pageSize: 10 });

  const sendVideoInvite = async (candidate) => {
    const id = candidate._id || candidate.id;
    try {
      setSendingId(id);
      const res = await apiClient.post(`/api/candidates/${id}/send-video-interview`);
      if (res.data?.success) {
        dispatch(showToast({ message: `Video interview link sent to ${candidate.email}`, type: 'success' }));
        load();
      } else {
        throw new Error(res.data?.message || 'Failed');
      }
    } catch (e) {
      dispatch(showToast({ message: e.response?.data?.message || 'Failed to send invite', type: 'error' }));
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Ready for Interview</h1>
              <p className="text-gray-600">Candidates who cleared the assessment above your threshold.</p>
            </div>
          </div>
          <button onClick={load} className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </button>
        </div>

        {/* Debug Info Banner */}
        {debugInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Assessment Results Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-blue-600 font-medium">Total Tested</div>
                    <div className="text-2xl font-bold text-blue-900">{debugInfo.total}</div>
                  </div>
                  <div>
                    <div className="text-green-600 font-medium">Passed</div>
                    <div className="text-2xl font-bold text-green-900">{debugInfo.passed}</div>
                  </div>
                  <div>
                    <div className="text-red-600 font-medium">Failed</div>
                    <div className="text-2xl font-bold text-red-900">{debugInfo.failed}</div>
                  </div>
                  <div>
                    <div className="text-purple-600 font-medium">≥{threshold}%</div>
                    <div className="text-2xl font-bold text-purple-900">{debugInfo.aboveThreshold}</div>
                  </div>
                </div>
              </div>
              <a
                href="/candidates"
                className="text-sm text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
              >
                View All Candidates →
              </a>
            </div>
          </div>
        )}

        <div className="bg-white border rounded-lg p-4 flex items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center"><Sliders className="w-3.5 h-3.5 mr-1.5" /> Pass threshold (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">
            Apply threshold
          </button>
          <div className="ml-auto text-sm text-gray-500">
            Showing <strong>{items.length}</strong> candidate(s) at &ge; {threshold}%
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
                  <th className="text-left px-4 py-3">Submitted</th>
                  <th className="text-left px-4 py-3">Video Interview</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-500">Loading…</td></tr>
                ) : error ? (
                  <tr><td colSpan={6} className="text-center py-10 text-red-600">{error}</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Video className="w-12 h-12 text-gray-300" />
                        <div>
                          <p className="text-gray-900 font-medium mb-1">No candidates ready for interview</p>
                          {debugInfo && debugInfo.total === 0 ? (
                            <p className="text-sm text-gray-500">
                              No candidates have taken assessments yet. Send assessment invites from the{' '}
                              <a href="/jobs" className="text-blue-600 hover:underline">Jobs page</a>.
                            </p>
                          ) : debugInfo && debugInfo.aboveThreshold === 0 ? (
                            <p className="text-sm text-gray-500">
                              {debugInfo.total} candidate(s) tested, but none scored ≥{threshold}%. Try lowering the threshold.
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500">
                              Adjust the threshold above to see more candidates.
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((c) => {
                    const id = c._id || c.id;
                    const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email;
                    const sent = !!c.videoInterviewSentAt;
                    const appeared = !!c.videoInterviewAppearedAt;
                    return (
                      <tr key={id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{fullName}</td>
                        <td className="px-4 py-3 text-gray-700"><span className="inline-flex items-center"><Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400" />{c.email}</span></td>
                        <td className="px-4 py-3 font-semibold">{c.latestAssessmentPercentage ?? 0}%</td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(c.latestAssessmentAt)}</td>
                        <td className="px-4 py-3">
                          {appeared ? (
                            <span className="inline-flex items-center text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Appeared {fmtDate(c.videoInterviewAppearedAt)}
                            </span>
                          ) : sent ? (
                            <span className="inline-flex items-center text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded text-xs">
                              Sent {fmtDate(c.videoInterviewSentAt)}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">Not sent</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => sendVideoInvite(c)}
                            disabled={sendingId === id}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs disabled:opacity-60"
                          >
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                            {sent ? 'Resend Invite' : 'Send Video Interview Invite'}
                          </button>
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
