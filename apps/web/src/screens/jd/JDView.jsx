'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from '@/lib/router-compat';
import jdService from '../../services/jdService';
import testService from '../../services/testService';
import SchedulePicker from '../../components/SchedulePicker';

export default function JDView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jd, setJd] = useState(null);
  const [error, setError] = useState('');

  const [matching, setMatching] = useState({ loading: true, results: [], error: '' });
  const [selectedEmails, setSelectedEmails] = useState({});

  // Invite form (scaffold): allow choosing a testId and schedule time
  const [inviteTestId, setInviteTestId] = useState('');
  const [scheduleAt, setScheduleAt] = useState(null);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState('');
  const [tests, setTests] = useState([]);
  const [testQuery, setTestQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await jdService.get(id);
        setJd(res?.data || res);
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load JD');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await jdService.matchCandidates(id);
        const data = res?.data || res;
        setMatching({ loading: false, results: data.results || [], error: '' });
      } catch (e) {
        setMatching({ loading: false, results: [], error: e?.response?.data?.message || 'Failed to match candidates' });
      }
    })();
  }, [id]);

  const selectedEmailsList = useMemo(() => Object.keys(selectedEmails).filter(k => selectedEmails[k] === true), [selectedEmails]);

  const toggleEmail = (email) => setSelectedEmails(prev => ({ ...prev, [email]: !prev[email] }));
  const toggleAll = () => {
    const all = {};
    matching.results.forEach(r => { if (r.email) all[r.email] = true; });
    setSelectedEmails(all);
  };

  const handleCreateAssessment = () => {
    // Navigate to AI Test Builder prefilled with JD context (scaffold)
    navigate('/tests/create', { state: { jdId: jd?._id, jd } });
  };

  const handleInvite = async () => {
    setInviting(true);
    setInviteInfo('');
    try {
      const emails = selectedEmailsList;
      if (!inviteTestId) throw new Error('Please provide a Test ID to send invites for.');
      if (emails.length === 0) throw new Error('Please select at least one candidate.');
      const res = await testService.sendTestInvitation(inviteTestId, { emails, scheduleAt, message: inviteMsg });
      setInviteInfo(res?.message || 'Invitations processed');
    } catch (e) {
      setInviteInfo(e?.response?.data?.message || e.message || 'Failed to send invites');
    } finally {
      setInviting(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600 text-sm">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{jd.title}</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/jd/${jd._id}/edit`)} className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50 text-sm">Edit</button>
          <button onClick={handleCreateAssessment} className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">Create Assessment From JD</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Description</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{jd.description || '—'}</p>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {(jd.requiredSkills || []).map((s, idx) => (
                <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-800 border">
                  {s.skillName} <span className="ml-2 text-gray-500">(imp {s.importanceLevel}, {s.requiredProficiency})</span>
                </span>
              ))}
              {(!jd.requiredSkills || jd.requiredSkills.length === 0) && <span className="text-sm text-gray-500">None</span>}
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium text-gray-900">Matched Candidates</h2>
              <button onClick={toggleAll} className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50 text-sm">Select All</button>
            </div>
            {matching.loading && <div>Loading candidates...</div>}
            {matching.error && <div className="text-red-600 text-sm">{matching.error}</div>}
            {!matching.loading && matching.results.length === 0 && <div className="text-sm text-gray-500">No candidates found.</div>}
            {!matching.loading && matching.results.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2"><input type="checkbox" onChange={toggleAll} /></th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matching.results.map(r => (
                      <tr key={r.candidateId} className="border-t">
                        <td className="px-4 py-2 text-center">
                          <input type="checkbox" checked={!!selectedEmails[r.email]} onChange={() => toggleEmail(r.email)} />
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{r.name || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{r.email || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.score != null ? r.score : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-base font-semibold text-gray-900">Assessment Invitations</h3>
            <p className="text-xs text-gray-500 mb-2">Choose an existing test to send or schedule invitations to the selected candidates.</p>
            <label className="block text-sm font-medium text-gray-700">Select Test</label>
            <input className="input w-full mb-2" value={testQuery} onChange={e => setTestQuery(e.target.value)} placeholder="Search tests by title" />
            <select className="input w-full mb-3" value={inviteTestId} onChange={e => setInviteTestId(e.target.value)}>
              <option value="">-- Select a Test --</option>
              {tests
                .filter(t => !testQuery || (t.title || '').toLowerCase().includes(testQuery.toLowerCase()))
                .map(t => (
                  <option key={t._id} value={t._id}>
                    {t.title} {t.status ? `(${t.status})` : ''}
                  </option>
                ))}
            </select>

            <SchedulePicker value={scheduleAt} onChange={setScheduleAt} />

            <label className="block text-sm font-medium text-gray-700 mt-3">Message (optional)</label>
            <textarea className="input w-full h-20" value={inviteMsg} onChange={e => setInviteMsg(e.target.value)} placeholder="Include any extra instructions" />

            <button onClick={handleInvite} disabled={inviting} className={`mt-3 w-full px-4 py-2 rounded-full text-white text-sm font-semibold ${inviting ? 'bg-emerald-300' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              {inviting ? 'Processing...' : (scheduleAt ? 'Schedule Invitations' : 'Send Invitations Now')}
            </button>
            {inviteInfo && <p className="text-xs text-gray-600 mt-2">{inviteInfo}</p>}
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-base font-semibold text-gray-900">Experience Range</h3>
            <p className="text-sm text-gray-700">{jd.minExperience} - {jd.maxExperience} years</p>
          </div>
        </div>
      </div>
    </div>
  );
}