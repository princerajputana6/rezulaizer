'use client';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from '@/lib/router-compat';
import jdService from '../../services/jdService';

export default function JDList() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await jdService.list();
        const data = res?.data || res;
        setItems(data.items || []);
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load JDs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Job Descriptions</h1>
        <Link to="/jd/new" className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">New JD</Link>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

      {!loading && items.length === 0 && (
        <div className="text-sm text-gray-600">No JDs yet. Create your first one.</div>
      )}

      {!loading && items.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Experience</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(jd => (
                <tr key={jd._id} className="border-t">
                  <td className="px-4 py-2 text-sm text-gray-900">{jd.title}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{jd.minExperience} - {jd.maxExperience} yrs</td>
                  <td className="px-4 py-2 text-sm text-gray-600 capitalize">{jd.status}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => navigate(`/jd/${jd._id}`)} className="px-3 py-1.5 text-sm rounded-md border bg-white hover:bg-gray-50">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}