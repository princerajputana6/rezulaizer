'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from '@/lib/router-compat';
import { apiClient } from '../../services/apiClient';

const Field = ({ label, children }) => (
  <div className="grid grid-cols-3 gap-4 py-2">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="col-span-2 text-sm text-gray-900">{children}</div>
  </div>
);

const InterviewDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [interview, setInterview] = useState(null);

  // action states
  const [action, setAction] = useState(null); // 'reschedule' | 'cancel' | 'complete'
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [feedback, setFeedback] = useState({ rating: '', notes: '' });
  const [saving, setSaving] = useState(false);
  // attendees
  const [attAdd, setAttAdd] = useState({ userId: '', role: 'interviewer' });
  const [attSaving, setAttSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get(`/interviews/${id}`);
      setInterview(data?.data || null);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load interview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const doAction = async () => {
    if (!action) return;
    setSaving(true);
    try {
      if (action === 'reschedule') {
        await apiClient.put(`/interviews/${id}/reschedule`, { scheduledDate: new Date(rescheduleDate).toISOString() });
      } else if (action === 'cancel') {
        await apiClient.put(`/interviews/${id}/cancel`, { reason: cancelReason });
      } else if (action === 'complete') {
        await apiClient.put(`/interviews/${id}/complete`, { feedback: { rating: feedback.rating ? Number(feedback.rating) : undefined, notes: feedback.notes } });
      }
      await load();
      setAction(null);
    } catch (e) {
      setError(e?.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Interview Details</h1>
        <div className="flex gap-2">
          <Link to="/interviews" className="btn btn-ghost">Back</Link>
          <button className="btn" onClick={() => setAction('reschedule')}>Reschedule</button>
          <button className="btn btn-warning" onClick={() => setAction('cancel')}>Cancel</button>
          <button className="btn btn-success" onClick={() => setAction('complete')}>Complete</button>
        </div>
      </div>

      {loading && <div className="bg-white p-6 rounded-lg border">Loading...</div>}
      {error && <div className="bg-red-50 text-red-700 p-3 border border-red-200 rounded mb-4">{error}</div>}

      {!loading && interview && (
        <div className="bg-white rounded-lg shadow-soft border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{interview.title || 'Interview'}</h2>
          <p className="text-sm text-gray-500 mb-4">{new Date(interview.scheduledDate).toLocaleString()} • {interview.duration} mins</p>

          <div className="divide-y divide-gray-100">
            <Field label="Status"><span className="badge badge-info capitalize">{interview.status}</span></Field>
            <Field label="Type">{interview.type}</Field>
            <Field label="Mode">{interview.mode}</Field>
            <Field label="Candidate">{interview.candidateId ? `${interview.candidateId.name} (${interview.candidateId.email})` : 'N/A'}</Field>
            <Field label="Interviewer">{interview.interviewerId ? `${interview.interviewerId.firstName} ${interview.interviewerId.lastName} (${interview.interviewerId.email})` : 'N/A'}</Field>
            <Field label="Company">{interview.companyId?.companyName || 'N/A'}</Field>
            {interview.meetingLink && (
              <Field label="Meeting Link"><a className="text-primary-600" href={interview.meetingLink} target="_blank" rel="noreferrer">{interview.meetingLink}</a></Field>
            )}
            {interview.location && <Field label="Location">{interview.location}</Field>}
            {interview.description && <Field label="Description">{interview.description}</Field>}
            {interview.preparation?.topics?.length > 0 && <Field label="Preparation">{interview.preparation.topics.join(', ')}</Field>}
            {interview.attendees?.length > 0 && (
              <Field label="Attendees">
                <div className="space-y-3">
                  <div className="divide-y divide-gray-100 rounded border">
                    {interview.attendees.map((a, i) => (
                      <div key={i} className="p-3 flex items-center justify-between">
                        <div className="text-sm">
                          <div className="font-medium">{a.userId ? `${a.userId.firstName} ${a.userId.lastName}` : 'N/A'}</div>
                          <div className="text-gray-500">Role: {a.role}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm flex items-center gap-1">
                            <input type="checkbox" checked={!!a.confirmed} onChange={async (e) => {
                              try {
                                await apiClient.put(`/interviews/${interview._id}/attendees/${a._id}/confirm`, { confirmed: e.target.checked });
                                await load();
                              } catch {}
                            }} />
                            Confirmed
                          </label>
                          <button className="btn btn-xs btn-ghost" onClick={async () => {
                            try {
                              await apiClient.delete(`/interviews/${interview._id}/attendees/${a._id}`);
                              await load();
                            } catch {}
                          }}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-sm font-medium mb-2">Add Attendee</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input className="input input-bordered" placeholder="User ID" value={attAdd.userId} onChange={e => setAttAdd(prev => ({ ...prev, userId: e.target.value }))} />
                      <select className="select select-bordered" value={attAdd.role} onChange={e => setAttAdd(prev => ({ ...prev, role: e.target.value }))}>
                        <option value="interviewer">Interviewer</option>
                        <option value="observer">Observer</option>
                        <option value="coordinator">Coordinator</option>
                      </select>
                      <button className="btn btn-primary" disabled={!attAdd.userId || attSaving} onClick={async () => {
                        setAttSaving(true);
                        try {
                          await apiClient.post(`/interviews/${interview._id}/attendees`, attAdd);
                          setAttAdd({ userId: '', role: 'interviewer' });
                          await load();
                        } catch {}
                        setAttSaving(false);
                      }}>Add</button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Enter the User ID of an existing user to add as an attendee.</p>
                  </div>
                </div>
              </Field>
            )}
            {interview.feedback && (interview.feedback.rating || interview.feedback.notes) && (
              <Field label="Feedback">
                <div>
                  {interview.feedback.rating && <div>Rating: {interview.feedback.rating}/10</div>}
                  {interview.feedback.notes && <div className="text-gray-700 whitespace-pre-wrap">{interview.feedback.notes}</div>}
                </div>
              </Field>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {action === 'reschedule' && (
        <div className="mt-4 bg-white p-4 border rounded">
          <div className="font-medium mb-2">Reschedule Interview</div>
          <input type="datetime-local" className="input input-bordered" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
          <div className="mt-3 flex gap-2">
            <button className="btn btn-primary" disabled={!rescheduleDate || saving} onClick={doAction}>Save</button>
            <button className="btn btn-ghost" onClick={() => setAction(null)}>Cancel</button>
          </div>
        </div>
      )}

      {action === 'cancel' && (
        <div className="mt-4 bg-white p-4 border rounded">
          <div className="font-medium mb-2">Cancel Interview</div>
          <input className="input input-bordered w-full" placeholder="Reason (optional)" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
          <div className="mt-3 flex gap-2">
            <button className="btn btn-warning" disabled={saving} onClick={doAction}>Confirm Cancel</button>
            <button className="btn btn-ghost" onClick={() => setAction(null)}>Close</button>
          </div>
        </div>
      )}

      {action === 'complete' && (
        <div className="mt-4 bg-white p-4 border rounded">
          <div className="font-medium mb-2">Complete Interview</div>
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
          <div className="mt-3 flex gap-2">
            <button className="btn btn-success" disabled={saving} onClick={doAction}>Save</button>
            <button className="btn btn-ghost" onClick={() => setAction(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewDetailPage;