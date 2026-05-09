'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from '@/lib/router-compat';
import { useDispatch, useSelector } from 'react-redux';
import { Edit, Clock, ListChecks, AlertCircle } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { showToast } from '../redux/slices/toastSlice';

const TestRoute = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [test, setTest] = useState(null);

  useEffect(() => {
    const fetchTest = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.get(`/tests/${id}`);
        const data = res?.data?.data?.test || res?.data?.data; // support both shapes
        if (!data) throw new Error('Test not found');
        setTest(data);
      } catch (e) {
        const msg = e?.response?.data?.message || e.message || 'Failed to load test';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTest();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-24 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-xl bg-red-50 border border-red-200 text-red-700 rounded p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div>
            <div className="font-medium">Unable to open assessment</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{test?.title || 'Assessment'}</h1>
          <p className="text-gray-600 mt-1">{test?.description}</p>
        </div>
        <button
          onClick={() => navigate(`/tests/${id}/edit`)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Edit className="w-4 h-4 mr-2" /> Edit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded border p-5 space-y-3">
          <div className="flex items-center text-gray-700"><Clock className="w-4 h-4 mr-2" /> Duration: {test?.duration} min</div>
          <div className="flex items-center text-gray-700"><ListChecks className="w-4 h-4 mr-2" /> Questions: {test?.questions?.length || test?.totalQuestions || 0}</div>
          <div className="text-sm text-gray-500">Status: {test?.status}</div>
          {test?.difficulty && <div className="text-sm text-gray-500">Difficulty: {test.difficulty}</div>}
        </div>

        <div className="lg:col-span-2 bg-white rounded border p-5">
          <h2 className="text-lg font-semibold mb-4">Questions</h2>
          {Array.isArray(test?.questions) && test.questions.length > 0 ? (
            <div className="space-y-4">
              {test.questions.map((q, idx) => (
                <div key={q._id || idx} className="border rounded p-4">
                  <div className="font-medium mb-2">{idx + 1}. {q.question || 'Question'}</div>
                  <ul className="list-disc ml-6 text-sm text-gray-700">
                    {(q.options || []).map((opt) => (
                      <li key={opt._id || opt.text}>{opt.text}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500">No questions attached.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestRoute;