'use client';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from '@/lib/router-compat';
import { apiClient } from '../../services/apiClient';
import {
  ArrowLeft,
  ArrowRight,
  Users,
  ClipboardList,
  Send,
  CheckCircle,
  User,
  Mail,
  Briefcase,
  Sparkles,
  Loader,
  AlertCircle,
  Search,
  Filter
} from 'lucide-react';

const CreateTestWithCandidates = ({ templateOnly = false, onClose = () => {} }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Get job description from previous step
  const [jobDescription, setJobDescription] = useState(
    location.state?.jobDescription || null
  );
  const [jdForm, setJdForm] = useState({
    title: '',
    department: '',
    location: '',
    experienceLevel: 'mid-level',
    skills: '',
    role: '',
    salary: '',
    industry: ''
  });

  // Candidate matching state
  const [allCandidates, setAllCandidates] = useState([]);
  const [matchedCandidates, setMatchedCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('');

  // Assessment creation state
  const [assessmentData, setAssessmentData] = useState({
    title: '',
    description: '',
    duration: 60,
    passingScore: 70,
    questions: []
  });

  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [aiJDGenerating, setAiJDGenerating] = useState(false);
  const [showJDModal, setShowJDModal] = useState(false);
  const [pendingJD, setPendingJD] = useState(null);
  const [jdTemplates, setJdTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [jdNotes, setJdNotes] = useState('');
  const [touched, setTouched] = useState({ title: false, role: false, salary: false });
  const DOMAIN_OPTIONS = [
    'Software Engineering','Frontend','Backend','Full-Stack','Mobile','DevOps','Cloud','Data Science','Machine Learning','AI/ML','Data Engineering','Data Analytics','Cybersecurity','IT Support','SRE','QA/Testing','Product Management','Project Management','UI/UX Design','Graphic Design','Solutions Architecture','Enterprise Architecture','Systems Engineering','Embedded Systems','Blockchain','AR/VR','Game Development','Business Analysis','Technical Writing','Sales Engineering','Pre-Sales','Customer Success','Technical Support','Finance','Accounting','Investment Banking','Wealth Management','Risk & Compliance','Insurance','Healthcare','Pharmaceuticals','Clinical Research','Biotech','EdTech','Ecommerce','Retail','Supply Chain','Logistics','Manufacturing','Automotive','Aerospace','Energy','Oil & Gas','Green Energy','Telecom','Media & Entertainment','Marketing','Advertising','HR/People Ops','Legal','Real Estate','Hospitality','Travel','Government','Public Sector','Non-Profit','Agriculture','Food & Beverage'
  ];
  const [domainQuery, setDomainQuery] = useState('');
  const filteredDomains = DOMAIN_OPTIONS.filter(d => d.toLowerCase().includes(domainQuery.toLowerCase()));

  const generateJD = async (isAuto = false) => {
    try {
      setAiJDGenerating(true);
      const payload = {
        title: jdForm.title,
        role: jdForm.role,
        salary: jdForm.salary,
        location: jdForm.location,
        experienceLevel: jdForm.experienceLevel,
        domain: jdForm.industry
      };
      let res;
      try {
        res = await apiClient.post('/api/ai/generate-jd', payload);
      } catch (err) {
        if (err?.response?.status === 404) {
          // Fallback alias (backend provides /ai/generate-jd)
          res = await apiClient.post('/ai/generate-jd', payload);
        } else {
          throw err;
        }
      }
      const jd = res?.data?.data?.jobDescription || null;
      if (jd) {
        setPendingJD(jd);
        setShowJDModal(true);
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to generate job description. Please try again.';
      console.error('Failed to generate JD', e);
      if (!isAuto) alert(msg);
    } finally {
      setAiJDGenerating(false);
    }
  };

  useEffect(() => {
    if (jobDescription) {
      // Auto-fill assessment title based on JD
      setAssessmentData(prev => ({
        ...prev,
        title: `${jobDescription.title} Assessment`,
        description: `Assessment for ${jobDescription.title} position`
      }));
      
      // Fetch and match candidates
      fetchAndMatchCandidates();
    } else {
      // If no JD, fetch all candidates
      fetchAllCandidates();
    }
  }, [jobDescription]);

  // Auto-generate JD only when required fields are blur-validated (Title, Role) and Salary loses focus

  // Fetch JD templates for current company
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await apiClient.get('/api/jd-templates');
        if (res.data?.success) setJdTemplates(res.data.data || []);
      } catch (e) {
        console.warn('Failed to load JD templates');
      }
    };
    loadTemplates();
  }, []);

  // Load last selected domain from localStorage on mount
  useEffect(() => {
    try {
      if (!jdForm.industry) {
        const saved = localStorage.getItem('jd_domain');
        if (saved) setJdForm(prev => ({ ...prev, industry: saved }));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill location from company profile if empty
  useEffect(() => {
    const fillLocation = async () => {
      try {
        if (jdForm.location) return;
        const res = await apiClient.get('/api/company/profile');
        const profile = res?.data?.data?.profile || {};
        const loc = profile.location || profile?.address?.city && profile?.address?.country ? `${profile.address.city}, ${profile.address.country}` : '';
        if (loc) setJdForm(prev => ({ ...prev, location: loc }));
      } catch {}
    };
    fillLocation();
  }, [jdForm.location]);

  const useTemplate = (tpl) => {
    if (!tpl) return;
    const jd = {
      title: tpl.title,
      department: tpl.department,
      role: tpl.role,
      salary: tpl.salary,
      location: tpl.location,
      experienceLevel: tpl.experienceLevel,
      skills: tpl.skills,
      summary: tpl.summary,
      responsibilities: tpl.responsibilities || [],
      qualifications: tpl.qualifications || []
    };
    setPendingJD(jd);
    setShowJDModal(true);
  };

  const saveTemplate = async (jd) => {
    try {
      const body = {
        domain: jdForm.industry,
        ...jd,
        department: '',
        experienceLevel: jd.experienceLevel || jdForm.experienceLevel,
        notes: jdNotes
      };
      const res = await apiClient.post('/api/jd-templates', body);
      if (res.data?.success) {
        alert('Saved as template');
        // Refresh templates
        const list = await apiClient.get('/api/jd-templates');
        if (list.data?.success) setJdTemplates(list.data.data || []);
      }
    } catch (e) {
      alert('Failed to save template');
    }
  };

  const acceptJD = (jd) => {
    setJobDescription(jd);
    setAssessmentData(prev => ({
      ...prev,
      title: `${jd.title} Assessment`,
      description: `Assessment for ${jd.title} position`
    }));
    // No longer syncing required skills into form
    setShowJDModal(false);
    setPendingJD(null);
    if (!templateOnly) {
      setStep(2);
      fetchAndMatchCandidates();
    }
  };

  const exportJDPDF = (jd) => {
    // Simple print-to-PDF using a new window
    const html = `<!doctype html><html><head><title>${jd.title} - JD</title>
      <style>body{font-family:system-ui,Segoe UI,Arial;padding:24px} h1{margin:0 0 8px} h2{margin:16px 0 8px} ul{margin:8px 0 0 18px}</style>
      </head><body>
      <h1>${jd.title}</h1>
      <div><strong>Department:</strong> ${jd.department || ''}</div>
      <div><strong>Role:</strong> ${jd.role || ''}</div>
      <div><strong>Salary:</strong> ${jd.salary || ''}</div>
      <div><strong>Location:</strong> ${jd.location || ''}</div>
      <div><strong>Experience:</strong> ${jd.experienceLevel || ''}</div>
      <div><strong>Skills:</strong> ${jd.skills || ''}</div>
      <h2>Summary</h2>
      <div>${jd.summary || ''}</div>
      <h2>Responsibilities</h2>
      <ul>${(jd.responsibilities||[]).map(r=>`<li>${r}</li>`).join('')}</ul>
      <h2>Qualifications</h2>
      <ul>${(jd.qualifications||[]).map(q=>`<li>${q}</li>`).join('')}</ul>
      <script>window.onload=()=>{window.print();}</script>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  const fetchAllCandidates = async () => {
    try {
      const response = await apiClient.get('/api/candidates');
      if (response.data.success) {
        const payload = response.data.data;
        const items = Array.isArray(payload) ? payload : (payload?.items || payload || []);
        setAllCandidates(items);
        setMatchedCandidates(items);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };

  const fetchAndMatchCandidates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/candidates');
      
      if (response.data.success) {
        const payload = response.data.data;
        const candidates = Array.isArray(payload) ? payload : (payload?.items || payload || []);
        setAllCandidates(candidates);
        
        // Simple skill-based matching
        const jdSkills = (jobDescription?.skills || jdForm.skills || '')
          .toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
        
        const matched = candidates.filter(candidate => {
          if (!candidate.skills) return jdSkills.length === 0; // if no skills, include only if no filter
          const candidateSkills = String(candidate.skills).toLowerCase().split(',').map(s => s.trim());
          const matchCount = jdSkills.filter(skill => 
            candidateSkills.some(cSkill => cSkill.includes(skill) || skill.includes(cSkill))
          ).length;
          
          return matchCount > 0;
        }).sort((a, b) => {
          // Sort by skill match relevance
          const aSkills = String(a.skills || '').toLowerCase().split(',').map(s => s.trim());
          const bSkills = String(b.skills || '').toLowerCase().split(',').map(s => s.trim());
          
          const aMatches = jdSkills.filter(skill => 
            aSkills.some(cSkill => cSkill.includes(skill) || skill.includes(cSkill))
          ).length;
          
          const bMatches = jdSkills.filter(skill => 
            bSkills.some(cSkill => cSkill.includes(skill) || skill.includes(cSkill))
          ).length;
          
          return bMatches - aMatches;
        });
        
        setMatchedCandidates(matched);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAssessmentQuestions = async () => {
    setAiGenerating(true);
    try {
      // Simulate AI question generation based on JD
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockQuestions = [
        {
          id: '1',
          question: `What is your experience with ${jobDescription?.skills?.split(',')[0]?.trim() || 'React'}?`,
          type: 'multiple_choice',
          options: [
            { id: 'a', text: 'Less than 1 year', isCorrect: false },
            { id: 'b', text: '1-3 years', isCorrect: true },
            { id: 'c', text: '3-5 years', isCorrect: false },
            { id: 'd', text: 'More than 5 years', isCorrect: false }
          ],
          difficulty: 'medium',
          points: 10
        },
        {
          id: '2',
          question: 'Describe a challenging project you worked on and how you overcame the difficulties.',
          type: 'essay',
          difficulty: 'medium',
          points: 15
        },
        {
          id: '3',
          question: `Write a function that demonstrates your knowledge of ${jobDescription?.skills?.split(',')[1]?.trim() || 'JavaScript'}`,
          type: 'coding',
          difficulty: 'hard',
          points: 20
        },
        {
          id: '4',
          question: 'How do you ensure code quality in your projects?',
          type: 'multiple_choice',
          options: [
            { id: 'a', text: 'Code reviews only', isCorrect: false },
            { id: 'b', text: 'Unit testing only', isCorrect: false },
            { id: 'c', text: 'Both code reviews and testing', isCorrect: true },
            { id: 'd', text: 'Manual testing only', isCorrect: false }
          ],
          difficulty: 'medium',
          points: 10
        },
        {
          id: '5',
          question: 'What is your preferred approach to debugging complex issues?',
          type: 'essay',
          difficulty: 'medium',
          points: 15
        }
      ];

      setGeneratedQuestions(mockQuestions);
      setAssessmentData(prev => ({
        ...prev,
        questions: mockQuestions
      }));
      
      setStep(3);
    } catch (error) {
      console.error('Error generating questions:', error);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCandidateSelect = (candidateId) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleSelectAll = () => {
    const filteredCandidates = getFilteredCandidates();
    const allSelected = filteredCandidates.every(c => selectedCandidates.includes(c.id));
    
    if (allSelected) {
      setSelectedCandidates(prev => prev.filter(id => !filteredCandidates.find(c => c.id === id)));
    } else {
      setSelectedCandidates(prev => [
        ...prev,
        ...filteredCandidates.filter(c => !prev.includes(c.id)).map(c => c.id)
      ]);
    }
  };

  const getFilteredCandidates = () => {
    return matchedCandidates.filter(candidate => {
      const matchesSearch = !searchTerm || 
        candidate.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSkill = !skillFilter ||
        candidate.skills?.toLowerCase().includes(skillFilter.toLowerCase());
      
      return matchesSearch && matchesSkill;
    });
  };

  const sendAssessmentInvitations = async () => {
    if (selectedCandidates.length === 0) {
      alert('Please select at least one candidate');
      return;
    }

    setLoading(true);
    try {
      // First create the assessment
      const assessmentResponse = await apiClient.post('/assessments', {
        ...assessmentData,
        jobDescriptionId: jobDescription?.id,
        status: 'published'
      });

      if (assessmentResponse.data.success) {
        const assessmentId = assessmentResponse.data.data.id;
        
        // Send invitations to selected candidates
        const invitationPromises = selectedCandidates.map(candidateId => 
          apiClient.post('/assessment-invitations', {
            assessmentId,
            candidateId,
            expiresIn: 7 // days
          })
        );

        await Promise.all(invitationPromises);
        
        // Show success message and redirect
        alert(`Assessment created and invitations sent to ${selectedCandidates.length} candidates!`);
        navigate('/tests');
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      alert('Failed to send invitations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const CandidateCard = ({ candidate, isSelected, onSelect }) => (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
        isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onSelect(candidate.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {candidate.first_name || candidate.name || 'Candidate'} {candidate.last_name || ''}
            </h3>
            <p className="text-sm text-gray-500">{candidate.email}</p>
            {candidate.current_position && (
              <p className="text-sm text-gray-600">{candidate.current_position}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {candidate.skills && (
            <div className="text-xs text-gray-500 max-w-32 truncate">
              {candidate.skills.split(',').slice(0, 2).join(', ')}
              {candidate.skills.split(',').length > 2 && '...'}
            </div>
          )}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(candidate.id)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/job-descriptions')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Job Descriptions
          </button>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-primary-100 p-2 rounded-lg">
              <ClipboardList className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Assessment</h1>
              <p className="text-gray-600">Match candidates and create assessment</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="text-sm font-medium">Job Description</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="text-sm font-medium">Select Candidates</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="text-sm font-medium">Assessment</span>
            </div>
          </div>
        </div>

        {/* Step 1: Job Description Review or Creation */}
        {step === 1 && jobDescription && (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Job Description Review</h2>
              <p className="text-gray-600">Review the job description before candidate matching</p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">{jobDescription.title}</h3>
                <p className="text-sm text-gray-600">{jobDescription.department} • {jobDescription.location}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Required Skills</h4>
                <p className="text-gray-700">{jobDescription.skills}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Experience Level</h4>
                <p className="text-gray-700 capitalize">{jobDescription.experienceLevel?.replace('-', ' ')}</p>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
              >
                <span>Find Matching Candidates</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 1 && !jobDescription && (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Job Description</h2>
              <p className="text-gray-600">Provide basic details to tailor your assessment</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                <input
                  type="text"
                  value={jdForm.title}
                  onChange={(e) => setJdForm({ ...jdForm, title: e.target.value })}
                  onBlur={() => setTouched(prev => ({ ...prev, title: true }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Senior React Developer"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Industry / Domain</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={domainQuery}
                    onChange={(e) => setDomainQuery(e.target.value)}
                    placeholder="Search domains..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <select
                    value={jdForm.industry}
                    onChange={(e) => { setJdForm({ ...jdForm, industry: e.target.value }); try { localStorage.setItem('jd_domain', e.target.value); } catch {} }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select domain</option>
                    {filteredDomains.map((d) => (
                      <option key={d} value={d.toLowerCase()}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <input
                  type="text"
                  value={jdForm.role}
                  onChange={(e) => setJdForm({ ...jdForm, role: e.target.value })}
                  onBlur={() => setTouched(prev => ({ ...prev, role: true }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Individual Contributor / Team Lead"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={jdForm.location}
                  onChange={(e) => setJdForm({ ...jdForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Remote / San Francisco, CA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                <select
                  value={jdForm.experienceLevel}
                  onChange={(e) => setJdForm({ ...jdForm, experienceLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="entry-level">Entry Level</option>
                  <option value="mid-level">Mid Level</option>
                  <option value="senior-level">Senior Level</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Salary</label>
                <input
                  type="text"
                  value={jdForm.salary}
                  onChange={(e) => setJdForm({ ...jdForm, salary: e.target.value })}
                  onBlur={() => {
                    setTouched(prev => ({ ...prev, salary: true }));
                    const ready = jdForm.title && jdForm.role && jdForm.salary;
                    const allBlurred = touched.title && touched.role;
                    if (ready && allBlurred && !jobDescription && !aiJDGenerating && !showJDModal && !pendingJD) {
                      generateJD(true);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., ₹18–24 LPA / $120k–$150k"
                />
              </div>
              
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => generateJD(false)}
                disabled={!jdForm.title || aiJDGenerating}
                className="bg-primary-50 text-primary-700 hover:bg-primary-100 disabled:opacity-60 px-6 py-2 rounded-lg flex items-center space-x-2 mr-3 border border-primary-200"
              >
                {aiJDGenerating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Generate with AI</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate with AI</span>
                  </>
                )}
              </button>
              {!templateOnly && (
                <button
                  onClick={() => {
                    const jd = { ...jdForm };
                    setJobDescription(jd);
                    setAssessmentData(prev => ({
                      ...prev,
                      title: `${jd.title} Assessment`,
                      description: `Assessment for ${jd.title} position`
                    }));
                    setStep(2);
                    fetchAndMatchCandidates();
                  }}
                  disabled={!jdForm.title}
                  className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white px-6 py-2 rounded-lg"
                >
                  Continue
                </button>
              )}
            </div>

            {/* Templates selector */}
            {jdTemplates.length > 0 && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Or choose a saved template</label>
                <div className="flex gap-3 items-center">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a template...</option>
                    {jdTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.title} {t.department ? `• ${t.department}` : ''}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => useTemplate(jdTemplates.find(t => t.id === selectedTemplateId))}
                    disabled={!selectedTemplateId}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Load Template
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Candidate Selection */}
        {(!templateOnly) && step === 2 && (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select Candidates</h2>
              <p className="text-gray-600">
                {jobDescription ? 'AI-matched candidates based on job requirements' : 'All available candidates'}
              </p>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Filter by skill..."
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {getFilteredCandidates().every(c => selectedCandidates.includes(c.id)) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Candidates List */}
            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-primary-600" />
                </div>
              ) : getFilteredCandidates().length > 0 ? (
                getFilteredCandidates().map(candidate => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    isSelected={selectedCandidates.includes(candidate.id)}
                    onSelect={handleCandidateSelect}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No matching candidates found</p>
                </div>
              )}
            </div>

            {/* Selection Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">
                <span className="font-medium">{selectedCandidates.length}</span> candidates selected
                {jobDescription && (
                  <span> • <span className="font-medium">{matchedCandidates.length}</span> AI-matched candidates available</span>
                )}
              </p>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={generateAssessmentQuestions}
                disabled={selectedCandidates.length === 0 || aiGenerating}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
              >
                {aiGenerating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Generating Assessment...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Assessment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Assessment Review */}
        {(!templateOnly) && step === 3 && (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Assessment Preview</h2>
              <p className="text-gray-600">Review the AI-generated assessment</p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Assessment Details</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p><strong>Title:</strong> {assessmentData.title}</p>
                  <p><strong>Duration:</strong> {assessmentData.duration} minutes</p>
                  <p><strong>Questions:</strong> {generatedQuestions.length}</p>
                  <p><strong>Selected Candidates:</strong> {selectedCandidates.length}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Generated Questions</h3>
                <div className="space-y-3">
                  {generatedQuestions.map((question, index) => (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Question {index + 1}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {question.difficulty} • {question.points} pts
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{question.question}</p>
                      {question.type === 'multiple_choice' && (
                        <div className="space-y-1">
                          {question.options.map(option => (
                            <div key={option.id} className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${option.isCorrect ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className="text-sm">{option.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={sendAssessmentInvitations}
                disabled={loading}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Sending Invitations...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Assessment Invitations</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* JD Review Modal */}
        {showJDModal && pendingJD && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => { setShowJDModal(false); setPendingJD(null); }} />
            <div className="relative bg-white w-full max-w-3xl mx-4 rounded-lg shadow-lg border p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Review Job Description</h3>
                <button onClick={() => { setShowJDModal(false); setPendingJD(null); }} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><strong>Title:</strong> {pendingJD.title}</div>
                  <div><strong>Role:</strong> {pendingJD.role}</div>
                  <div><strong>Salary:</strong> {pendingJD.salary}</div>
                  <div><strong>Location:</strong> {pendingJD.location}</div>
                  <div><strong>Experience:</strong> {pendingJD.experienceLevel}</div>
                  <div className="md:col-span-2"><strong>Skills:</strong> {pendingJD.skills}</div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Summary</h4>
                  <p className="text-gray-700">{pendingJD.summary}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Responsibilities</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {(pendingJD.responsibilities || []).map((r, i) => (<li key={i}>{r}</li>))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Qualifications</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {(pendingJD.qualifications || []).map((q, i) => (<li key={i}>{q}</li>))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Notes (optional)</h4>
                  <textarea
                    value={jdNotes}
                    onChange={(e) => setJdNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="Any internal notes to save with this template"
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 justify-end">
                <button onClick={() => exportJDPDF(pendingJD)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Export PDF</button>
                <button onClick={() => saveTemplate(pendingJD)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Save as Template</button>
                <button onClick={() => generateJD()} className="px-4 py-2 text-primary-700 border border-primary-200 bg-primary-50 rounded-lg hover:bg-primary-100 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Regenerate</button>
                {templateOnly ? (
                  <>
                    <button onClick={() => { saveTemplate(pendingJD); setShowJDModal(false); setPendingJD(null); onClose(); }} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Save & Close</button>
                    <button onClick={() => { setShowJDModal(false); setPendingJD(null); onClose(); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
                  </>
                ) : (
                  <button onClick={() => acceptJD(pendingJD)} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Use this JD</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateTestWithCandidates;