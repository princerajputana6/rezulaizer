'use client';
import React, { useEffect, useState } from 'react';
import { useParams, Link } from '@/lib/router-compat';
import { apiClient } from '../../services/apiClient';
import { Video, Calendar, MapPin, Users, Mail, ArrowLeft, Loader } from 'lucide-react';

const VideoInterviewDetails = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ interview: null, invitations: [] });

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/video-interviews/${id}`);
      if (res.data?.success) setData(res.data.data);
    } catch (e) {
      console.error('Failed to load interview details', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <Loader className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  const it = data.interview;
  if (!it) {
    return (
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <Link to="/video-interviews" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Interviews
          </Link>
          <div className="bg-white p-6 border rounded">Interview not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <Link to="/video-interviews" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Interviews
        </Link>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{it.title || 'Untitled Interview'}</h1>
              <p className="text-gray-600">{it.jobTitle || 'Role'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
            <div className="flex items-center"><Calendar className="w-4 h-4 mr-2" />{it.scheduledAt ? new Date(it.scheduledAt * 1000).toLocaleString() : '—'}</div>
            <div className="flex items-center"><MapPin className="w-4 h-4 mr-2" />{it.location || 'Online'}</div>
            <div className="flex items-center"><Users className="w-4 h-4 mr-2" />{data.invitations.length} invitations</div>
          </div>
          {it.description && <p className="mt-4 text-gray-700">{it.description}</p>}
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Invitations</h2>
          </div>
          <div className="divide-y">
            {data.invitations.length === 0 ? (
              <div className="p-6 text-gray-600">No invitations</div>
            ) : data.invitations.map((inv) => (
              <div key={inv.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-500" /> {inv.email || '—'}
                  </div>
                  <div className="text-xs text-gray-500">Candidate ID: {inv.candidateId || '—'}</div>
                </div>
                <div className="text-sm text-gray-700">
                  <span className={`px-2 py-1 rounded ${inv.status === 'sent' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{inv.status || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default VideoInterviewDetails;