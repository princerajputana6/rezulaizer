'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { apiClient } from '../../services/apiClient';

const ScheduleInterviewPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorList, setErrorList] = useState([]);
  const [success, setSuccess] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [users, setUsers] = useState([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    candidateId: '',
    interviewerId: '',
    scheduledDate: '',
    duration: 60,
    type: 'technical',
    mode: 'online',
    meetingLink: ''
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [candRes, userRes] = await Promise.all([
          apiClient.get('/candidates/passed'), // Only fetch candidates who passed assessments
          apiClient.get('/users?limit=100')
        ]);
        if (!mounted) return;
        const candidatesList = candRes?.data?.data || candRes?.data?.candidates || [];
        setCandidates(Array.isArray(candidatesList) ? candidatesList : []);
        const usersList = userRes?.data?.data || userRes?.data?.users || [];
        setUsers(Array.isArray(usersList) ? usersList : []);
      } catch (e) {
        console.error('Failed to load candidates/users:', e);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const canSubmit = useMemo(() => {
    return form.title && form.candidateId && form.interviewerId && form.scheduledDate;
  }, [form]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setSuccess('');
    setErrorList([]);
    try {
      const payload = {
        ...form,
        scheduledDate: new Date(form.scheduledDate).toISOString()
      };
      await apiClient.post('/interviews', payload);
      setSuccess('Interview scheduled successfully');
      setTimeout(() => navigate('/interviews'), 800);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to schedule interview');
      const errs = e?.response?.data?.errors;
      if (Array.isArray(errs)) setErrorList(errs);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Schedule Interview</h1>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded border border-red-200 mb-4">{error}</div>}
      {errorList.length > 0 && (
        <div className="bg-yellow-50 text-yellow-800 p-3 rounded border border-yellow-200 mb-4">
          <ul className="list-disc ml-5 text-sm">
            {errorList.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded border border-green-200 mb-4">{success}</div>}

      <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-soft border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input name="title" value={form.title} onChange={onChange} className="mt-1 input input-bordered w-full" placeholder="Technical Interview" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" value={form.description} onChange={onChange} className="mt-1 textarea textarea-bordered w-full" placeholder="Agenda, focus areas, etc." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Candidate</label>
            <select name="candidateId" value={form.candidateId} onChange={onChange} className="mt-1 select select-bordered w-full">
              <option value="">Select candidate</option>
              {candidates.length === 0 && (
                <option disabled>No qualified candidates available</option>
              )}
              {candidates.map(c => (
                <option key={c._id} value={c._id}>
                  {c.firstName} {c.lastName} ({c.email})
                  {c.latestAssessmentPercentage && ` - ${c.latestAssessmentPercentage}%`}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Only showing candidates who passed assessments</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Interviewer</label>
            <select name="interviewerId" value={form.interviewerId} onChange={onChange} className="mt-1 select select-bordered w-full">
              <option value="">Select interviewer</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.email})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date & Time</label>
            <input type="datetime-local" name="scheduledDate" value={form.scheduledDate} onChange={onChange} className="mt-1 input input-bordered w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Duration (mins)</label>
            <input type="number" name="duration" min={15} max={480} value={form.duration} onChange={onChange} className="mt-1 input input-bordered w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select name="type" value={form.type} onChange={onChange} className="mt-1 select select-bordered w-full">
              <option value="technical">Technical</option>
              <option value="behavioral">Behavioral</option>
              <option value="hr">HR</option>
              <option value="final">Final</option>
              <option value="phone">Phone</option>
              <option value="video">Video</option>
              <option value="onsite">Onsite</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Mode</label>
            <select name="mode" value={form.mode} onChange={onChange} className="mt-1 select select-bordered w-full">
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="phone">Phone</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Meeting Link</label>
            <input name="meetingLink" value={form.meetingLink} onChange={onChange} className="mt-1 input input-bordered w-full" placeholder="https://meet.example.com/abc" />
            <p className="text-xs text-gray-500 mt-1">Optional. Must be a valid URL if provided.</p>
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" className="btn btn-primary" disabled={!canSubmit || loading}>
            {loading ? 'Scheduling...' : 'Schedule Interview'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduleInterviewPage;