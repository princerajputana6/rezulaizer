'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Settings, Save, Loader, Info } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { showToast } from '@/redux/slices/toastSlice';

const DEFAULTS = {
  mcqCount: 3,
  outputCount: 1,
  practicalCount: 1,
  mcqSeconds: 60,
  outputSeconds: 120,
  practicalSeconds: 600,
  passingScore: 60,
};

export default function AssessmentConfigPanel({ jobId }) {
  const dispatch = useDispatch();
  const [cfg, setCfg] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/api/job-descriptions/${jobId}/assessment-config`);
        if (active && res.data?.success) {
          setCfg({ ...DEFAULTS, ...(res.data.data?.config || {}) });
        }
      } catch (e) {
        // silently fall back to defaults
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [jobId]);

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const totalQuestions = (Number(cfg.mcqCount) || 0) + (Number(cfg.outputCount) || 0) + (Number(cfg.practicalCount) || 0);
  const totalSeconds =
    (Number(cfg.mcqCount) || 0) * (Number(cfg.mcqSeconds) || 0) +
    (Number(cfg.outputCount) || 0) * (Number(cfg.outputSeconds) || 0) +
    (Number(cfg.practicalCount) || 0) * (Number(cfg.practicalSeconds) || 0);
  const totalMinutes = Math.ceil(totalSeconds / 60);

  const save = async () => {
    try {
      setSaving(true);
      const payload = {};
      for (const k of Object.keys(DEFAULTS)) {
        const n = Number(cfg[k]);
        payload[k] = Number.isFinite(n) && n >= 0 ? n : DEFAULTS[k];
      }
      const res = await apiClient.put(`/api/job-descriptions/${jobId}/assessment-config`, payload);
      if (res.data?.success) {
        dispatch(showToast({ message: 'Assessment configuration saved', type: 'success' }));
        setCfg({ ...DEFAULTS, ...(res.data.data?.config || {}) });
      }
    } catch (e) {
      dispatch(showToast({ message: e.response?.data?.message || 'Failed to save', type: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  const NumInput = ({ k, label, hint, min = 0, max = 600 }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={cfg[k]}
        onChange={(e) => set(k, e.target.value === '' ? '' : Number(e.target.value))}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      {hint && <div className="text-[11px] text-gray-500 mt-1">{hint}</div>}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Assessment Pattern</h3>
            <p className="text-sm text-gray-500">Tune the question mix and per-type timing for candidates applying to this role.</p>
          </div>
        </div>
        {loading && <Loader className="w-4 h-4 animate-spin text-gray-400" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-50 rounded border p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-700">Multiple Choice (MCQ)</div>
          <NumInput k="mcqCount" label="Count" min={0} max={20} />
          <NumInput k="mcqSeconds" label="Seconds per MCQ" min={15} max={600} hint={`${Math.round((cfg.mcqSeconds || 0) / 60 * 10) / 10} min each`} />
        </div>
        <div className="bg-gray-50 rounded border p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-700">Output-based</div>
          <NumInput k="outputCount" label="Count" min={0} max={10} />
          <NumInput k="outputSeconds" label="Seconds each" min={30} max={1200} hint={`${Math.round((cfg.outputSeconds || 0) / 60 * 10) / 10} min each`} />
        </div>
        <div className="bg-gray-50 rounded border p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-700">Practical / Coding</div>
          <NumInput k="practicalCount" label="Count" min={0} max={5} />
          <NumInput k="practicalSeconds" label="Seconds each" min={60} max={3600} hint={`${Math.round((cfg.practicalSeconds || 0) / 60 * 10) / 10} min each`} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-50 rounded border p-3">
          <NumInput k="passingScore" label="Passing score (%)" min={0} max={100} hint="Candidates at or above this advance to interview." />
        </div>
        <div className="bg-blue-50 rounded border border-blue-200 p-3 text-sm flex flex-col justify-center">
          <div className="text-blue-800 font-semibold">{totalQuestions} questions</div>
          <div className="text-blue-700 text-xs">Total time: ~{totalMinutes} min</div>
        </div>
        <div className="bg-yellow-50 rounded border border-yellow-200 p-3 text-xs flex items-start text-yellow-900">
          <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
          <span>Applies to <em>future</em> assessments sent for this job. Already-sent tests keep their original timing.</span>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving || loading}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 text-sm"
        >
          {saving ? <><Loader className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : <><Save className="w-4 h-4 mr-2" /> Save Pattern</>}
        </button>
      </div>
    </div>
  );
}
