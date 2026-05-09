'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Wand2, 
  Users, 
  Send, 
  ArrowRight, 
  ArrowLeft,
  Check,
  Search,
  Filter,
  Mail,
  Star,
  MapPin,
  Clock,
  Target,
  Sparkles,
  CheckCircle,
  User,
  Briefcase,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

const AIAssessmentCreator = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState([]);

  // Step 1 - Job Details
  const [jobDetails, setJobDetails] = useState({
    title: '',
    level: '',
    location: '',
    experience: '',
    department: '',
    skills: [],
    salary: ''
  });

  // AI Generated JD (markdown/plain)
  const [generatedJD, setGeneratedJD] = useState('');

  // Real candidates from API
  const [candidates, setCandidates] = useState([]);

  // Refs for inputs to ensure focus is preserved on state updates
  const titleRef = useRef(null);
  const levelRef = useRef(null);
  const experienceRef = useRef(null);
  const departmentRef = useRef(null);
  const locationRef = useRef(null);
  const salaryRef = useRef(null);
  const skillsRef = useRef(null);

  // Local field states to avoid re-renders breaking focus
  const [titleInput, setTitleInput] = useState(jobDetails.title);
  const [levelInput, setLevelInput] = useState(jobDetails.level);
  const [experienceInput, setExperienceInput] = useState(jobDetails.experience);
  const [departmentInput, setDepartmentInput] = useState(jobDetails.department);
  const [locationInput, setLocationInput] = useState(jobDetails.location);
  const [salaryInput, setSalaryInput] = useState(jobDetails.salary);
  const [skillsInput, setSkillsInput] = useState(jobDetails.skills.join(', '));

  // Keep local states in sync if jobDetails changes externally (e.g., template loaded)
  useEffect(() => setTitleInput(jobDetails.title), [jobDetails.title]);
  useEffect(() => setLevelInput(jobDetails.level), [jobDetails.level]);
  useEffect(() => setExperienceInput(jobDetails.experience), [jobDetails.experience]);
  useEffect(() => setDepartmentInput(jobDetails.department), [jobDetails.department]);
  useEffect(() => setLocationInput(jobDetails.location), [jobDetails.location]);
  useEffect(() => setSalaryInput(jobDetails.salary), [jobDetails.salary]);
  useEffect(() => setSkillsInput(jobDetails.skills.join(', ')), [jobDetails.skills]);

  useEffect(() => {
    // Preload candidates
    const load = async () => {
      try {
        const res = await apiClient.get('/api/candidates');
        const payload = res?.data?.data;
        const items = Array.isArray(payload) ? payload : (payload?.items || payload || []);
        // Map to the fields the UI expects
        const mapped = items.map((c, i) => ({
          id: c.id,
          name: c.name || c.first_name || 'Candidate',
          email: c.email,
          title: c.currentPosition?.title || c.current_position || 'Not specified',
          experience: c.profile?.experience?.length ? `${c.profile.experience.length}+ years` : '—',
          skills: (c.skills ? String(c.skills).split(',').map(s => s.trim()).filter(Boolean) : []),
          location: c.profile?.location || '—',
          rating: 4.5, // placeholder
          availability: '—',
          lastActive: '—',
          resumeScore: 85, // placeholder
          domain: '—'
        }));
        setCandidates(mapped);
      } catch (e) {
        // fallback: keep empty
      }
    };
    load();
  }, []);

  const generateJobDescription = async () => {
    setIsGenerating(true);
    try {
      const payload = {
        title: jobDetails.title,
        role: jobDetails.level || 'Individual Contributor',
        salary: jobDetails.salary,
        location: jobDetails.location,
        experienceLevel: (jobDetails.level || '').toLowerCase().replace(/\s+/g, '-'),
        domain: jobDetails.department || ''
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
        const md = `**Job Title: ${jd.title || jobDetails.title}**\n\n` +
`**About the Role:**\n${jd.summary || ''}\n\n` +
`**Key Responsibilities:**\n${(jd.responsibilities||[]).map(r=>`• ${r}`).join('\n')}\n\n` +
`**Required Qualifications:**\n${(jd.qualifications||[]).map(q=>`• ${q}`).join('\n')}\n\n` +
`**Skills:** ${jd.skills || jobDetails.skills.join(', ')}\n\n` +
`**Salary:** ${jd.salary || jobDetails.salary || 'Competitive'}\n` +
`**Location:** ${jd.location || jobDetails.location || '—'}\n`;
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

  const sendAssessments = async () => {
    setIsSending(true);
    try {
      // Minimal backend implementation: create assessment, then invitations
      const createPayload = {
        title: `${jobDetails.title} Assessment`,
        description: generatedJD || `Assessment for ${jobDetails.title}`,
        duration: 60,
        status: 'draft'
      };
      const a = await apiClient.post('/api/assessments', createPayload);
      const assessmentId = a?.data?.data?.id;
      if (!assessmentId) throw new Error('Failed to create assessment');
      // Send invitations
      await Promise.all(selectedCandidates.map(id => apiClient.post('/api/assessment-invitations', {
        assessmentId,
        candidateId: id,
        expiresInDays: 7
      })));
      alert(`Assessment sent to ${selectedCandidates.length} candidates!`);
      setCurrentStep(1);
      setSelectedCandidates([]);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || 'Failed to send assessments');
    } finally {
      setIsSending(false);
    }
  };

  const toggleCandidateSelection = (candidateId) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
              currentStep >= step 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-white border-gray-300 text-gray-400'
            }`}>
              {currentStep > step ? <Check className="w-6 h-6" /> : step}
            </div>
            {step < 3 && (
              <div className={`w-16 h-1 rounded transition-all duration-300 ${
                currentStep > step ? 'bg-blue-600' : 'bg-gray-300'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const Step1 = () => (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-2">
          <label htmlFor="jobTitle" className="text-sm font-semibold text-gray-700">Job Title *</label>
          <input
            type="text"
            value={titleInput}
            id="jobTitle"
            ref={titleRef}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={() => setJobDetails(prev => ({ ...prev, title: titleInput }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="e.g., Senior React Developer"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="expLevel" className="text-sm font-semibold text-gray-700">Experience Level *</label>
          <select
            value={levelInput}
            id="expLevel"
            ref={levelRef}
            onChange={(e) => setLevelInput(e.target.value)}
            onBlur={() => setJobDetails(prev => ({ ...prev, level: levelInput }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          >
            <option value="">Select Level</option>
            <option value="Entry Level">Entry Level (0-2 years)</option>
            <option value="Mid Level">Mid Level (2-5 years)</option>
            <option value="Senior Level">Senior Level (5+ years)</option>
            <option value="Lead/Principal">Lead/Principal (8+ years)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="experience" className="text-sm font-semibold text-gray-700">Experience Required</label>
          <input
            type="text"
            value={experienceInput}
            id="experience"
            ref={experienceRef}
            onChange={(e) => setExperienceInput(e.target.value)}
            onBlur={() => setJobDetails(prev => ({ ...prev, experience: experienceInput }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="e.g., 3-5 years"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="department" className="text-sm font-semibold text-gray-700">Department</label>
          <input
            type="text"
            value={departmentInput}
            id="department"
            ref={departmentRef}
            onChange={(e) => setDepartmentInput(e.target.value)}
            onBlur={() => setJobDetails(prev => ({ ...prev, department: departmentInput }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="e.g., Engineering"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="location" className="text-sm font-semibold text-gray-700">Location</label>
          <input
            type="text"
            value={locationInput}
            id="location"
            ref={locationRef}
            onChange={(e) => setLocationInput(e.target.value)}
            onBlur={() => setJobDetails(prev => ({ ...prev, location: locationInput }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="e.g., San Francisco, CA or Remote"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="salary" className="text-sm font-semibold text-gray-700">Salary Range</label>
          <input
            type="text"
            value={salaryInput}
            id="salary"
            ref={salaryRef}
            onChange={(e) => setSalaryInput(e.target.value)}
            onBlur={() => setJobDetails(prev => ({ ...prev, salary: salaryInput }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="e.g., $120,000 - $160,000"
          />
        </div>
      </div>

      <div className="space-y-2 mb-8">
        <label htmlFor="skills" className="text-sm font-semibold text-gray-700">Key Skills (comma separated)</label>
        <input
          type="text"
          value={skillsInput}
          id="skills"
          ref={skillsRef}
          onChange={(e) => setSkillsInput(e.target.value)}
          onBlur={() => setJobDetails(prev => ({ ...prev, skills: skillsInput.split(',').map(s => s.trim()).filter(Boolean) }))}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          placeholder="e.g., React, TypeScript, Node.js, GraphQL"
        />
        {jobDetails.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {jobDetails.skills.map((skill, index) => (
              <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {!generatedJD ? (
        <button
          onClick={generateJobDescription}
          disabled={!jobDetails.title || !jobDetails.level || isGenerating}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center space-x-2"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generating with AI...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              <span>Generate Job Description with AI</span>
            </>
          )}
        </button>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">AI Generated Job Description</h3>
            </div>
            <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{generatedJD}</pre>
            </div>
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={generateJobDescription}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <Wand2 className="w-4 h-4" />
                <span>Regenerate</span>
              </button>
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 flex items-center space-x-2"
              >
                <span>Continue to Candidate Selection</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const CandidateCard = ({ candidate }) => (
    <div className={`bg-white rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
      selectedCandidates.includes(candidate.id) 
        ? 'border-blue-500 bg-blue-50' 
        : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{candidate.name}</h3>
              <p className="text-gray-600">{candidate.title}</p>
            </div>
          </div>
          <button
            onClick={() => toggleCandidateSelection(candidate.id)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              selectedCandidates.includes(candidate.id)
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-500'
            }`}
          >
            <Check className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Experience:</span>
            <span className="font-semibold text-gray-900">{candidate.experience}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Resume Score:</span>
            <div className="flex items-center space-x-2">
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full" 
                  style={{ width: `${candidate.resumeScore}%`  }}
                />
              </div>
              <span className="font-semibold text-green-600">{candidate.resumeScore}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Rating:</span>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="font-semibold text-gray-900">{candidate.rating}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {candidate.skills.slice(0, 3).map((skill, index) => (
            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
              {skill}
            </span>
          ))}
          {candidate.skills.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
              +{candidate.skills.length - 3} more
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <MapPin className="w-3 h-3" />
            <span>{candidate.location}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{candidate.lastActive}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const Step2 = () => {
    const filteredCandidates = candidates.filter(candidate =>
      (candidate.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (candidate.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (candidate.skills || []).some(skill => (skill || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Select Candidates</h2>
          <p className="text-gray-600">Choose candidates from the same domain for this assessment</p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="px-4 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filter</span>
            </button>
          </div>
          <div className="text-sm text-gray-600">
            {selectedCandidates.length} of {filteredCandidates.length} selected
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredCandidates.map(candidate => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </div>

        {selectedCandidates.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Selected Candidates ({selectedCandidates.length})</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedCandidates.map(id => {
                const candidate = candidates.find(c => c.id === id);
                return (
                  <div key={id} className="bg-white rounded-lg px-3 py-2 flex items-center space-x-2 border">
                    <span className="text-sm font-medium">{candidate?.name}</span>
                    <button
                      onClick={() => toggleCandidateSelection(id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Job Details</span>
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 flex items-center space-x-2"
              >
                <span>Create Personalized Assessments</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const Step3 = () => {
    const selectedCandidatesList = candidates.filter(c => selectedCandidates.includes(c.id));

    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Personalized Assessments</h2>
          <p className="text-gray-600">Send custom assessments tailored to each candidate's profile and the job requirements</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Assessment Overview</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Job Title:</span>
                  <span className="font-semibold text-gray-900">{jobDetails.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Candidates Selected:</span>
                  <span className="font-semibold text-blue-600">{selectedCandidates.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Assessment Type:</span>
                  <span className="font-semibold text-purple-600">AI Personalized</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-semibold text-gray-900">45-60 minutes</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Sparkles className="w-5 h-5" />
                <span>AI Features</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700">Questions tailored to candidate's resume</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700">Job-specific technical challenges</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700">Adaptive difficulty based on responses</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700">Real-time AI proctoring</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700">Instant detailed scoring report</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Selected Candidates</h3>
            {selectedCandidatesList.map((candidate, index) => (
              <div key={candidate.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{candidate.name}</h4>
                      <p className="text-sm text-gray-600">{candidate.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-600">{candidate.email}</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <h5 className="text-sm font-semibold text-gray-900 mb-2">Personalized Assessment Preview:</h5>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>• Technical questions focused on: {candidate.skills.slice(0, 3).join(', ')}</p>
                    <p>• Experience-level adjusted for: {candidate.experience}</p>
                    <p>• Resume-specific scenarios based on their background</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Candidates</span>
              </button>
              <div className="text-sm text-gray-600">
                Ready to send {selectedCandidates.length} personalized assessments
              </div>
            </div>
            <button
              onClick={sendAssessments}
              disabled={isSending}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center space-x-3"
            >
              {isSending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending Assessments...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Send Personalized Assessments</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Create Assessment 
          </h1>
        </div>

        <StepIndicator />

        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-600">
            <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-blue-600' : ''}` }>
              <Briefcase className="w-4 h-4" />
              <span>Job Details & AI JD</span>
            </div>
            <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-blue-600' : ''}` }>
              <Users className="w-4 h-4" />
              <span>Select Candidates</span>
            </div>
            <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-blue-600' : ''}` }>
              <Send className="w-4 h-4" />
              <span>Send Assessments</span>
            </div>
          </div>
        </div>

        {currentStep === 1 && <Step1 />}
        {currentStep === 2 && <Step2 />}
        {currentStep === 3 && <Step3 />}
      </div>
    </div>
  );
};

export default AIAssessmentCreator;