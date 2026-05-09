'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from '@/lib/router-compat';
import { apiClient } from '../../services/apiClient';

const InterviewListPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [activeAction, setActiveAction] = useState(null); // { type: 'reschedule'|'cancel'|'complete', interview: {...} }
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [feedback, setFeedback] = useState({ rating: '', notes: '' });

  // filters & pagination
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0,16); // yyyy-MM-ddTHH:mm
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0,16);
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    if (startDate) params.set('startDate', new Date(startDate).toISOString());
    if (endDate) params.set('endDate', new Date(endDate).toISOString());
    return params.toString();
  }, [page, limit, status, type, startDate, endDate]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const { data } = await apiClient.get(`/interviews?${queryString}`);
        if (!mounted) return;
        setItems(data?.data || []);
        setPagination(data?.pagination || { currentPage: page, totalPages: 1, totalItems: (data?.data || []).length, hasNext: false, hasPrev: false });
      } catch (e) {
        if (!mounted) return;
        setError('Failed to load interviews');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [queryString]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upcoming Interviews</h1>
        <Link to="/interviews/schedule" className="btn btn-primary">Schedule Interview</Link>
      </div>

      {loading && (
        <div className="bg-white p-6 rounded-lg shadow-soft border border-gray-200">Loading interviews...</div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 mb-4">{error}</div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-soft border border-gray-200">
          {/* Filters */}
          <div className="p-4 border-b grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-gray-500">Status</label>
              <select className="select select-bordered w-full" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                <option value="">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="no-show">No Show</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500">Type</label>
              <select className="select select-bordered w-full" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
                <option value="">All</option>
                <option value="technical">Technical</option>
                <option value="behavioral">Behavioral</option>
                <option value="hr">HR</option>
                <option value="final">Final</option>
                <option value="phone">Phone</option>
                <option value="video">Video</option>
                <option value="onsite">Onsite</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500">Start</label>
              <input type="datetime-local" className="input input-bordered w-full" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="block text-xs text-gray-500">End</label>
              <input type="datetime-local" className="input input-bordered w-full" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Per Page</label>
              <select className="select select-bordered w-full" value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {items.length === 0 && (
              <div className="p-6 text-gray-500">No upcoming interviews found.</div>
            )}
            {items.map((it) => (
              <div key={it._id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{new Date(it.scheduledDate).toLocaleString()}</p>
                    <p className="text-lg font-medium text-gray-900">
                      <Link to={`/interviews/${it._id}`} className="text-primary-600 hover:underline">{it.title || 'Interview'}</Link>
                    </p>
                    <p className="text-sm text-gray-600">
                      Candidate: {it.candidateId?.name || 'N/A'}
                      {it.interviewerId ? ` · Interviewer: ${it.interviewerId.firstName || ''} ${it.interviewerId.lastName || ''}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="badge badge-info capitalize mr-2">{it.status}</span>
                    <div className="inline-flex gap-2">
                      <button className="btn btn-xs" onClick={() => { setActiveAction({ type: 'reschedule', interview: it }); setRescheduleDate(''); setActionError(''); }}>Reschedule</button>
                      <button className="btn btn-xs btn-warning" onClick={() => { setActiveAction({ type: 'cancel', interview: it }); setCancelReason(''); setActionError(''); }}>Cancel</button>
                      <button className="btn btn-xs btn-success" onClick={() => { setActiveAction({ type: 'complete', interview: it }); setFeedback({ rating: '', notes: '' }); setActionError(''); }}>Complete</button>
                    </div>
                  </div>
                </div>

                {/* Action Modals (inline simple cards) */}
                {activeAction?.interview?._id === it._id && (
                  <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                    {actionError && (
                      <div className="mb-3 bg-red-50 text-red-700 p-2 rounded border border-red-200 text-sm">{actionError}</div>
                    )}
                    {activeAction.type === 'reschedule' && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-800">Reschedule Interview</p>
                        <input type="datetime-local" className="input input-bordered" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
                        <div className="flex gap-2">
                          <button className="btn btn-primary btn-sm" disabled={!rescheduleDate || actionLoading} onClick={async () => {
                            setActionLoading(true);
                            setActionError('');
                            try {
                              await apiClient.put(`/interviews/${it._id}/reschedule`, { scheduledDate: new Date(rescheduleDate).toISOString() });
                              // refresh list
                              const { data } = await apiClient.get('/interviews/upcoming?days=14&limit=50');
                              setItems(data?.data || []);
                              setActiveAction(null);
                            } catch (e) {
                              setActionError(e?.response?.data?.message || 'Failed to reschedule');
                            } finally {
                              setActionLoading(false);
                            }
                          }}>Save</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setActiveAction(null)}>Cancel</button>
                        </div>
                      </div>
                    )}
                    {activeAction.type === 'cancel' && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-800">Cancel Interview</p>
                        <input className="input input-bordered w-full" placeholder="Reason (optional)" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
                        <div className="flex gap-2">
                          <button className="btn btn-warning btn-sm" disabled={actionLoading} onClick={async () => {
                            setActionLoading(true);
                            setActionError('');
                            try {
                              await apiClient.put(`/interviews/${it._id}/cancel`, { reason: cancelReason });
                              const { data } = await apiClient.get('/interviews/upcoming?days=14&limit=50');
                              setItems(data?.data || []);
                              setActiveAction(null);
                            } catch (e) {
                              setActionError(e?.response?.data?.message || 'Failed to cancel');
                            } finally {
                              setActionLoading(false);
                            }
                          }}>Confirm</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setActiveAction(null)}>Close</button>
                        </div>
                      </div>
                    )}
                    {activeAction.type === 'complete' && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-800">Complete Interview</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600">Rating (1-10)</label>
                            <input type="number" min={1} max={10} className="input input-bordered w-full" value={feedback.rating} onChange={e => setFeedback(prev => ({ ...prev, rating: e.target.value }))} />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs text-gray-600">Notes</label>
                            <input className="input input-bordered w-full" value={feedback.notes} onChange={e => setFeedback(prev => ({ ...prev, notes: e.target.value }))} placeholder="Feedback notes" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="btn btn-success btn-sm" disabled={actionLoading} onClick={async () => {
                            setActionLoading(true);
                            setActionError('');
                            try {
                              await apiClient.put(`/interviews/${it._id}/complete`, { feedback: { rating: feedback.rating ? Number(feedback.rating) : undefined, notes: feedback.notes } });
                              const { data } = await apiClient.get('/interviews/upcoming?days=14&limit=50');
                              setItems(data?.data || []);
                              setActiveAction(null);
                            } catch (e) {
                              setActionError(e?.response?.data?.message || 'Failed to complete');
                            } finally {
                              setActionLoading(false);
                            }
                          }}>Save</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setActiveAction(null)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="p-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalItems} items</div>
            <div className="inline-flex gap-2">
              <button className="btn btn-sm" disabled={!pagination.hasPrev} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
              <button className="btn btn-sm" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewListPage;