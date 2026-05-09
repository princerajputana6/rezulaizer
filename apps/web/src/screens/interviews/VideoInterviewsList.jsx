'use client';
import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { Link } from '@/lib/router-compat';
import { Video, Calendar, Clock, Users, Plus, Loader } from 'lucide-react';

const VideoInterviewsList = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/video-interviews');
      if (res.data?.success) {
        setItems(res.data.data || []);
      }
    } catch (e) {
      console.error('Failed to load video interviews', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Video Interviews</h1>
              <p className="text-gray-600">Manage and review scheduled interviews</p>
            </div>
          </div>
          <a href="/schedule-interview" className="inline-flex items-center px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">
            <Plus className="w-4 h-4 mr-2" /> Schedule Interview
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <Loader className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-gray-600">No interviews found</div>
          ) : (
            <div className="divide-y">
              {items.map((it) => (
                <Link to={`/video-interviews/${it.id}`} key={it.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                      <Video className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{it.title || 'Untitled Interview'}</div>
                      <div className="text-sm text-gray-600">{it.jobTitle || 'Role'}</div>
                      {it.description && <div className="text-xs text-gray-500 mt-1 max-w-xl truncate">{it.description}</div>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-sm text-gray-600 flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {it.scheduledAt ? new Date(it.scheduledAt * 1000).toLocaleString() : '—'}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {it.invitations || 0} invited
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoInterviewsList;