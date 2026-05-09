'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Wand2, Users, Send, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

function TextField({ label, value, onChange, placeholder, required, type = 'text', id }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">
        {label} {required ? '*' : ''}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, id, required }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">
        {label} {required ? '*' : ''}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

const NewAssessmentPage = () => {
  // Local-only states to avoid broad rerenders
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('');
  const [location, setLocation] = useState('');
  const [experience, setExperience] = useState('');
  const [department, setDepartment] = useState('');
  const [salary, setSalary] = useState('');
  const [skills, setSkills] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedJD, setGeneratedJD] = useState('');

  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [step, setStep] = useState(1);

  const levelOptions = useMemo(() => [
    { value: '', label: 'Select Level' },
    { value: 'Entry Level', label: 'Entry Level (0-2 years)' },
    { value: 'Mid Level', label: 'Mid Level (2-5 years)' },
    { value: 'Senior Level', label: 'Senior Level (5+ years)' },
    { value: 'Lead/Principal', label: 'Lead/Principal (8+ years)' },
  ], []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/api/candidates');
        const payload = res?.data?.data;
        const items = Array.isArray(payload) ? payload : (payload?.items || payload || []);
        const mapped = items.map((c) => ({
          id: c.id,
          name: c.name || c.first_name || 'Candidate',
          email: c.email || c.profile?.email || '',
          title: c.currentPosition?.title || c.current_position || '',
          skills: (c.skills ? String(c.skills).split(',').map((s) => s.trim()).filter(Boolean) : []),
        }));
        setCandidates(mapped);
      } catch (e) {}
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return candidates.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.title || '').toLowerCase().includes(q) ||
      (c.skills || []).some(s => (s || '').toLowerCase().includes(q))
    );
  }, [candidates, search]);

  const toggleId = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const generateJD = async () => {
    setIsGenerating(true);
    try {
      const payload = {
        title,
        role: level || 'Individual Contributor',
        salary,
        location,
        experienceLevel: (level || '').toLowerCase().replace(/\s+/g, '-'),
        domain: department || ''
      };
      let res;
      try {
        res = await apiClient.post('/api/ai/generate-jd', payload);
      } catch (err) {
        if (err?.response?.status === 404) {
          res = await apiClient.post('/ai/generate-jd', payload);
        } else {
          throw err;
        }
      }
      const jd = res?.data?.data?.jobDescription;
      if (jd) {
        const md = `**Job Title: ${jd.title || title}**\n\n` +
`**About the Role:**\n${jd.summary || ''}\n\n` +
`**Key Responsibilities:**\n${(jd.responsibilities||[]).map(r=>`• ${r}`).join('\n')}\n\n` +
`**Required Qualifications:**\n${(jd.qualifications||[]).map(q=>`• ${q}`).join('\n')}\n\n` +
`**Skills:** ${jd.skills || skills}\n\n` +
`**Salary:** ${jd.salary || salary || 'Competitive'}\n` +
`**Location:** ${jd.location || location || '—'}\n`;
        setGeneratedJD(md.trim());
      } else {
        setGeneratedJD('');
      }
    } catch (e) {
      setGeneratedJD('');
      alert(e?.response?.data?.message || e?.message || 'Failed to generate JD');
    } finally {
      setIsGenerating(false);
    }
  };

  const send = async () => {
    setIsSending(true);
    try {
      // Create assessment
      const a = await apiClient.post('/api/assessments', {
        title: `${title} Assessment`,
        description: generatedJD || `Assessment for ${title}`,
        duration: 60,
        passingScore: 70,
        status: 'draft',
        questions: [],
      });
      const assessmentId = a?.data?.data?.id;
      if (!assessmentId) throw new Error('Failed to create assessment');

      // Send invitations (with email)
      const targetList = candidates.filter(c => selectedIds.includes(c.id));
      await Promise.all(targetList.map(c => apiClient.post('/api/assessment-invitations', {
        assessmentId,
        candidateId: c.id,
        email: c.email,
        expiresIn: 7
      })));

      alert(`Assessment sent to ${targetList.length} candidates`);
      setSelectedIds([]);
      setStep(1);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || 'Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Create Assessment</h1>

        <div className="mb-6 flex items-center gap-2 text-sm">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step>=1?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-500'}`}>1</div>
          <div className={`h-[2px] w-12 ${step>1?'bg-blue-600':'bg-gray-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step>=2?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-500'}`}>2</div>
          <div className={`h-[2px] w-12 ${step>2?'bg-blue-600':'bg-gray-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step>=3?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-500'}`}>3</div>
        </div>

        {step === 1 && (
          <div className="bg-white rounded-xl border p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField id="title" label="Job Title" required value={title} onChange={setTitle} placeholder="Senior React Developer" />
              <SelectField id="level" required label="Experience Level" value={level} onChange={setLevel} options={levelOptions} />
              <TextField id="experience" label="Experience" value={experience} onChange={setExperience} placeholder="3-5 years" />
              <TextField id="department" label="Department" value={department} onChange={setDepartment} placeholder="Engineering" />
              <TextField id="location" label="Location" value={location} onChange={setLocation} placeholder="Remote" />
              <TextField id="salary" label="Salary Range" value={salary} onChange={setSalary} placeholder="$120,000 - $160,000" />
            </div>
            <TextField id="skills" label="Key Skills" value={skills} onChange={setSkills} placeholder="React, TypeScript, Node.js" />

            {!generatedJD ? (
              <button
                onClick={generateJD}
                disabled={!title || !level || isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold px-4 py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {isGenerating ? (<>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating with AI...</span>
                </>) : (<>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Job Description with AI</span>
                </>)}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-gray-800">AI Generated JD</div>
                <div className="border rounded-lg p-3 bg-gray-50 max-h-72 overflow-auto text-sm whitespace-pre-wrap">{generatedJD}</div>
                <div className="flex justify-between">
                  <button onClick={generateJD} className="px-3 py-2 border rounded-lg">Regenerate</button>
                  <button onClick={() => setStep(2)} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">Continue <ArrowRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Select Candidates</div>
              <div className="text-sm text-gray-600">{selectedIds.length} selected</div>
            </div>
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search candidates" className="w-full px-3 py-2 border rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(c => (
                <label key={c.id} className={`border rounded-lg p-3 flex items-start gap-3 cursor-pointer ${selectedIds.includes(c.id)?'border-blue-500 bg-blue-50':'border-gray-200'}`}>
                  <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={()=>toggleId(c.id)} className="mt-1" />
                  <div>
                    <div className="font-semibold text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-600">{c.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{(c.skills||[]).slice(0,3).join(', ')}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={()=>setStep(1)} className="px-3 py-2 border rounded-lg flex items-center gap-2"><ArrowLeft className="w-4 h-4"/>Back</button>
              <button onClick={()=>setStep(3)} disabled={!selectedIds.length} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 flex items-center gap-2">Next<ArrowRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <div className="text-lg font-semibold">Send Assessments</div>
            <div className="text-sm text-gray-700">Ready to send to {selectedIds.length} candidate(s).</div>
            <div className="flex justify-between">
              <button onClick={()=>setStep(2)} className="px-3 py-2 border rounded-lg flex items-center gap-2"><ArrowLeft className="w-4 h-4"/>Back</button>
              <button onClick={send} disabled={isSending} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2">
                {isSending ? (<>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending...</span>
                </>) : (<>
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </>)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewAssessmentPage;