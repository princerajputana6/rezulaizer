'use client';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import jdService from '../../services/jdService';

export default function JDForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(!!isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    minExperience: 0,
    maxExperience: 3,
    status: 'active',
    requiredSkills: [
      { skillName: '', importanceLevel: 3, requiredProficiency: 'intermediate' }
    ]
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await jdService.get(id);
        const data = res?.data || res;
        setForm({
          title: data.title || '',
          description: data.description || '',
          minExperience: data.minExperience ?? 0,
          maxExperience: data.maxExperience ?? 3,
          status: data.status || 'active',
          requiredSkills: Array.isArray(data.requiredSkills) && data.requiredSkills.length > 0 ? data.requiredSkills : [{ skillName: '', importanceLevel: 3, requiredProficiency: 'intermediate' }]
        });
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load JD');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const setSkill = (idx, key, value) => {
    setForm(prev => {
      const arr = [...prev.requiredSkills];
      arr[idx] = { ...arr[idx], [key]: value };
      return { ...prev, requiredSkills: arr };
    });
  };

  const addSkill = () => setForm(prev => ({ ...prev, requiredSkills: [...prev.requiredSkills, { skillName: '', importanceLevel: 3, requiredProficiency: 'intermediate' }] }));
  const removeSkill = (idx) => setForm(prev => ({ ...prev, requiredSkills: prev.requiredSkills.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, requiredSkills: form.requiredSkills.filter(s => s.skillName.trim()) };
      if (isEdit) {
        await jdService.update(id, payload);
      } else {
        await jdService.create(payload);
      }
      navigate('/jd');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save JD');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">{isEdit ? 'Edit JD' : 'New JD'}</h1>
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input className="input w-full" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required minLength={3} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea className="input w-full h-28" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Min Experience (years)</label>
            <input type="number" min={0} max={50} className="input w-full" value={form.minExperience} onChange={e => setForm({ ...form, minExperience: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Max Experience (years)</label>
            <input type="number" min={0} max={50} className="input w-full" value={form.maxExperience} onChange={e => setForm({ ...form, maxExperience: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills</label>
          <div className="space-y-3">
            {form.requiredSkills.map((s, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input className="input col-span-5" placeholder="Skill name"
                  value={s.skillName} onChange={e => setSkill(idx, 'skillName', e.target.value)} />
                <input type="number" min={1} max={5} className="input col-span-2" placeholder="Importance 1-5"
                  value={s.importanceLevel} onChange={e => setSkill(idx, 'importanceLevel', Number(e.target.value))} />
                <select className="input col-span-3" value={s.requiredProficiency} onChange={e => setSkill(idx, 'requiredProficiency', e.target.value)}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                <button type="button" onClick={() => removeSkill(idx)} className="col-span-2 px-3 py-2 text-sm rounded-md border bg-white hover:bg-gray-50">Remove</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addSkill} className="mt-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm">+ Add Skill</button>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={`px-5 py-2 rounded-full text-white text-sm font-semibold ${saving ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{saving ? 'Saving...' : 'Save'}</button>
          <button type="button" onClick={() => navigate('/jd')} className="px-5 py-2 rounded-full border text-sm bg-white hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}