'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Video,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  ThumbsUp,
  ThumbsDown,
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

export default function VideoInterviewsListNew() {
  const dispatch = useDispatch();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decidingId, setDecidingId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get('/api/candidates/video-interviews');
      if (res.data?.success) setItems(res.data.data?.candidates || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load video interviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const { paged, controls } = usePagination(items, { pageSize: 10 });

  const decide = async (candidate, passed) => {
    const id = candidate._id || candidate.id;
    try {
      setDecidingId(id);
      const res = await apiClient.post(`/api/candidates/${id}/video-interview/result`, { passed });
      if (res.data?.success) {
        dispatch(showToast({ message: passed ? 'Marked selected' : 'Marked rejected', type: 'success' }));
        load();
      }
    } catch (e) {
      dispatch(showToast({ message: e.response?.data?.message || 'Failed to update', type: 'error' }));
    } finally {
      setDecidingId(null);
    }
  };

  const sentCount = items.filter((c) => c.videoInterviewSentAt).length;
  const appearedCount = items.filter((c) => c.videoInterviewAppearedAt).length;
  const decidedCount = items.filter((c) => c.videoInterviewPassed != null).length;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Video Interviews</h1>
              <p className="text-gray-600">Candidates we sent video interview links to and their attendance.</p>
            </div>
          </div>
          <button onClick={load} className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Invites sent</div>
            <div className="text-2xl font-semibold">{sentCount}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Appeared</div>
            <div className="text-2xl font-semibold text-green-600">{appearedCount}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Decided</div>
            <div className="text-2xl font-semibold">{decidedCount}</div>
          </div>
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">Candidate</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Invite sent</th>
                  <th className="text-left px-4 py-3">Appeared</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-500">Loading…</td></tr>
                ) : error ? (
                  <tr><td colSpan={6} className="text-center py-10 text-red-600">{error}</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-500">No video interviews yet.</td></tr>
                ) : (
                  paged.map((c) => {
                    const id = c._id || c.id;
                    const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email;
                    const decided = c.videoInterviewPassed != null;
                    return (
                      <tr key={id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{fullName}</td>
                        <td className="px-4 py-3 text-gray-700">{c.email}</td>
                        <td className="px-4 py-3 text-gray-600">{fmtDate(c.videoInterviewSentAt)}</td>
                        <td className="px-4 py-3">
                          {c.videoInterviewAppearedAt ? (
                            <span className="inline-flex items-center text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {fmtDate(c.videoInterviewAppearedAt)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded text-xs">
                              <Clock className="w-3.5 h-3.5 mr-1" /> Not yet
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {c.videoInterviewPassed === true && (
                            <span className="inline-flex items-center px-2 py-1 rounded border bg-green-100 text-green-800 border-green-200 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Selected
                            </span>
                          )}
                          {c.videoInterviewPassed === false && (
                            <span className="inline-flex items-center px-2 py-1 rounded border bg-red-100 text-red-800 border-red-200 text-xs">
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Rejected
                            </span>
                          )}
                          {c.videoInterviewPassed == null && (
                            <span className="text-xs text-gray-500">{(c.workflowStage || '').replace(/_/g, ' ') || 'Pending review'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!decided && c.videoInterviewAppearedAt ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => decide(c, true)}
                                disabled={decidingId === id}
                                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 text-xs disabled:opacity-60"
                              >
                                <ThumbsUp className="w-3.5 h-3.5 mr-1.5" /> Pass
                              </button>
                              <button
                                onClick={() => decide(c, false)}
                                disabled={decidingId === id}
                                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs disabled:opacity-60"
                              >
                                <ThumbsDown className="w-3.5 h-3.5 mr-1.5" /> Fail
                              </button>
                            </div>
                          ) : decided ? (
                            <span className="text-xs text-gray-400">Decided</span>
                          ) : (
                            <span className="text-xs text-gray-400">Awaiting attendance</span>
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
