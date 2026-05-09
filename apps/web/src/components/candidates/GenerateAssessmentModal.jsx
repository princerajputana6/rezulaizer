'use client';
import React, { useState, useMemo } from 'react';
import { X, Sparkles } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

const providerOptions = [
  { value: 'groq', label: 'Groq (LLaMA)' },
  { value: 'openai', label: 'OpenAI' },
];

const defaultsByProvider = {
  groq: 'llama-3.1-70b-versatile',
  openai: 'gpt-3.5-turbo',
};

export default function GenerateAssessmentModal({
  isOpen,
  onClose,
  candidateId,
  onSuccess,
}) {
  const [provider, setProvider] = useState('groq');
  const [model, setModel] = useState(defaultsByProvider['groq']);
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);

  const modelPlaceholder = useMemo(() => {
    return provider === 'groq' ? 'llama-3.1-70b-versatile' : 'gpt-3.5-turbo';
  }, [provider]);

  const handleProviderChange = (e) => {
    const p = e.target.value;
    setProvider(p);
    setModel(defaultsByProvider[p] || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!candidateId) return;
    setLoading(true);
    try {
      const body = {
        provider,
        model,
        count: Math.max(5, Math.min(20, parseInt(count) || 10)),
      };
      const res = await apiClient.post(`/candidates/${candidateId}/generate-assessment`, body);
      if (res?.data?.success) {
        onSuccess?.(res.data.data);
        onClose();
      } else {
        throw new Error(res?.data?.message || 'Failed to generate assessment');
      }
    } catch (err) {
      console.error('Generate assessment error:', err);
      alert(err?.response?.data?.message || err.message || 'Failed to generate assessment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Generate Assessment (AI)
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              value={provider}
              onChange={handleProviderChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {providerOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Select Groq (LLaMA) or OpenAI backend.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={modelPlaceholder}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Override the default model if needed.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question Count</label>
            <input
              type="number"
              min={5}
              max={20}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-32 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Between 5 and 20.</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}