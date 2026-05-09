'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@/lib/router-compat';
import { useDispatch } from 'react-redux';
import { 
  ArrowLeft, Briefcase, MapPin, DollarSign, Clock, Users, 
  Mail, Phone, Download, Eye, Filter, Search, Send, CheckSquare,
  Award, TrendingUp, GraduationCap, MapPinned, FolderKanban, Zap, CheckCircle, XCircle
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { showToast } from '../../redux/slices/toastSlice';
import AssessmentConfigPanel from './AssessmentConfigPanel';
import Pagination from '@/components/common/Pagination';

// ─── Smart Skill Matching Utilities ──────────────────────────────────────────

// Synonym groups: any skill in the same group matches any other
const SKILL_SYNONYMS = [
  ['javascript', 'js', 'javascript/typescript', 'typescript', 'ts', 'js/ts'],
  ['react', 'reactjs', 'react.js', 'reactjs'],
  ['node', 'nodejs', 'node.js'],
  ['next', 'nextjs', 'next.js'],
  ['vue', 'vuejs', 'vue.js'],
  ['angular', 'angularjs'],
  ['git', 'github', 'gitlab', 'bitbucket', 'version control', 'version control (git)'],
  ['rest', 'rest api', 'rest apis', 'restful', 'api development', 'api design', 'apis'],
  ['database', 'database design', 'db design', 'mongodb', 'mysql', 'postgresql', 'sql', 'nosql'],
  ['agile', 'scrum', 'agile methodologies', 'agile/scrum'],
  ['css', 'tailwind', 'tailwind css', 'bootstrap', 'styled components', 'sass', 'scss'],
  ['team collaboration', 'teamwork', 'cross-functional team collaboration', 'collaboration'],
  ['problem solving', 'problem-solving', 'analytical skills'],
  ['technical documentation', 'documentation', 'technical writing'],
  ['aws', 'amazon web services', 'cloud', 'azure', 'gcp'],
  ['ci/cd', 'devops', 'continuous integration', 'deployment'],
  ['redux', 'state management', 'context api', 'zustand'],
];

const normalizeSkill = (skill) => skill.toLowerCase().trim()
  .replace(/[^a-z0-9/ .+]/g, '')  // keep letters, numbers, /, ., +
  .replace(/\s+/g, ' ');

// Tokenize compound skills like "JavaScript/TypeScript" → ["javascript", "typescript"]
const tokenizeSkill = (skill) => {
  const norm = normalizeSkill(skill);
  return norm.split(/[/,&|]/).map(s => s.trim()).filter(Boolean);
};

const getSynonymGroup = (skill) => {
  const norm = normalizeSkill(skill);
  return SKILL_SYNONYMS.find(group => group.some(s => norm.includes(s) || s.includes(norm))) || null;
};

// Returns true if candidateSkill matches any token of jdSkill (exact, synonym, or partial)
const skillMatches = (jdSkill, candidateSkills) => {
  const jdTokens = tokenizeSkill(jdSkill);
  const normCandidateSkills = candidateSkills.map(normalizeSkill);

  for (const jdToken of jdTokens) {
    const jdGroup = getSynonymGroup(jdToken);

    for (const cSkill of normCandidateSkills) {
      const cTokens = tokenizeSkill(cSkill);
      const cGroup = getSynonymGroup(cSkill);

      // 1. Exact token match
      if (cTokens.includes(jdToken) || jdToken === cSkill) return true;
      // 2. Partial containment
      if (cSkill.includes(jdToken) || jdToken.includes(cSkill)) return true;
      // 3. Synonym group overlap
      if (jdGroup && cGroup && jdGroup.some(s => cGroup.includes(s))) return true;
      // 4. JD token in candidate synonym group
      if (cGroup && cGroup.some(s => s.includes(jdToken) || jdToken.includes(s))) return true;
    }
  }
  return false;
};

// Calculate experience years from workExperience array
const calcExperienceYears = (workExperience = []) => {
  let totalMonths = 0;
  workExperience.forEach(exp => {
    const parseDate = (str) => {
      if (!str || str.toLowerCase() === 'present') return new Date();
      const d = new Date(str);
      return isNaN(d) ? new Date() : d;
    };
    const start = parseDate(exp.startDate);
    const end = parseDate(exp.endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (months > 0) totalMonths += months;
  });
  return Math.round((totalMonths / 12) * 10) / 10;
};

// ─── Main Matching Function ───────────────────────────────────────────────────
const computeMatchScore = (candidate, job) => {
  const requiredSkills = (job.requiredSkills || []).map(s => typeof s === 'string' ? s : s.name);
  const candidateSkills = candidate.skills || [];

  // 1. Skill Match (50%)
  const matchedSkills = [];
  const missingSkills = [];
  requiredSkills.forEach(jdSkill => {
    if (skillMatches(jdSkill, candidateSkills)) {
      matchedSkills.push(jdSkill);
    } else {
      missingSkills.push(jdSkill);
    }
  });
  const skillScore = requiredSkills.length > 0
    ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
    : 50;

  // 2. Experience Match (25%)
  const expYears = calcExperienceYears(candidate.workExperience);
  const minExp = job.experienceRequired?.min || 0;
  const maxExp = job.experienceRequired?.max || 10;
  let expScore = 0;
  if (expYears >= minExp && expYears <= maxExp) expScore = 100;
  else if (expYears > maxExp) expScore = Math.max(60, 100 - (expYears - maxExp) * 5);
  else expScore = Math.max(0, Math.round((expYears / Math.max(minExp, 1)) * 80));

  // 3. Education Match (10%)
  const eduKeywords = ['btech', 'b.tech', 'b-tech', 'bachelor', 'be', 'b.e', 'mtech', 'm.tech', 'master', 'phd', 'mba'];
  const hasEdu = (candidate.education || []).some(e => {
    const deg = (e.degree || '').toLowerCase();
    return eduKeywords.some(k => deg.includes(k));
  });
  const eduScore = hasEdu ? 100 : 60;

  // 4. Location Match (10%)
  const jdLocation = (job.location || '').toLowerCase();
  const candidateLocation = (candidate.address || '').toLowerCase();
  let locationScore = 50;
  if (jdLocation.includes('remote') || candidateLocation.includes('remote')) locationScore = 100;
  else if (jdLocation && candidateLocation) {
    const jdParts = jdLocation.split(/[,/]/).map(s => s.trim());
    const locationMatch = jdParts.some(part => candidateLocation.includes(part) || part.includes(candidateLocation.split(',')[0]?.trim()));
    locationScore = locationMatch ? 100 : 40;
  }

  // 5. Project Relevance (5%)
  const projects = candidate.projects || [];
  const projectSkills = projects.flatMap(p => p.technologies || []);
  const relevantProjects = projects.filter(p =>
    (p.technologies || []).some(tech => skillMatches(tech, requiredSkills))
  );
  const projectScore = projects.length > 0
    ? Math.round((relevantProjects.length / projects.length) * 100)
    : 50;

  // Weighted total
  const totalScore = Math.round(
    skillScore * 0.50 +
    expScore * 0.25 +
    eduScore * 0.10 +
    locationScore * 0.10 +
    projectScore * 0.05
  );

  return {
    totalScore,
    breakdown: {
      skills: skillScore,
      experience: expScore,
      education: eduScore,
      location: locationScore,
      projects: projectScore
    },
    matchedSkills,
    missingSkills,
    experienceYears: expYears
  };
};

const JobDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiRunning, setAiRunning] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    minScore: 0,
    skills: [],
    searchTerm: ''
  });

  useEffect(() => {
    fetchJobAndCandidates();
  }, [id]);

  const fetchJobAndCandidates = async () => {
    try {
      setLoading(true);
      const [jobResponse, candidatesResponse] = await Promise.all([
        apiClient.get(`/api/job-descriptions/${id}`),
        apiClient.get('/api/candidates')
      ]);

      const jobData = jobResponse.data.success ? jobResponse.data.data : null;
      setJob(jobData);

      if (jobData && candidatesResponse.data.success) {
        const allCandidates = candidatesResponse.data.data.candidates || candidatesResponse.data.data;
        const scored = allCandidates.map(candidate => {
          const result = computeMatchScore(candidate, jobData);
          return {
            ...candidate,
            matchScore: result.totalScore,
            matchBreakdown: result.breakdown,
            matchedSkills: result.matchedSkills,
            missingSkills: result.missingSkills,
            experienceYears: result.experienceYears
          };
        });
        scored.sort((a, b) => b.matchScore - a.matchScore);
        setCandidates(scored);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      dispatch(showToast({ message: 'Failed to load job details', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const runAiMatching = async () => {
    try {
      setAiRunning(true);
      dispatch(showToast({ message: 'Running AI deep analysis... this may take a minute', type: 'info' }));
      await apiClient.post(`/api/matching/advanced/${id}`, { saveResults: true });
      dispatch(showToast({ message: 'AI analysis complete!', type: 'success' }));
    } catch (error) {
      dispatch(showToast({ message: 'AI analysis failed: ' + (error?.response?.data?.message || error.message), type: 'error' }));
    } finally {
      setAiRunning(false);
    }
  };


  const handleSelectCandidate = (candidateId) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCandidates.length === filteredCandidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(filteredCandidates.map(c => c._id));
    }
  };

  const handleSendBulkAssessment = async () => {
    if (selectedCandidates.length === 0) {
      dispatch(showToast({ message: 'Please select at least one candidate', type: 'error' }));
      return;
    }

    try {
      dispatch(showToast({ message: `Sending assessment invitations to ${selectedCandidates.length} candidate(s)...`, type: 'info' }));

      const response = await apiClient.post('/api/candidates/send-assessment', {
        candidateIds: selectedCandidates,
        jobId: id
      });

      if (response.data.success) {
        const { sent, failed } = response.data.data;
        if (sent.length > 0) {
          dispatch(showToast({
            message: `✅ Assessment invitations sent to ${sent.length} candidate(s)${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
            type: 'success'
          }));
        }
        if (failed.length > 0 && sent.length === 0) {
          dispatch(showToast({ message: `Failed to send invitations. Check email configuration.`, type: 'error' }));
        }
      }
      setSelectedCandidates([]);
    } catch (error) {
      dispatch(showToast({
        message: error?.response?.data?.message || 'Failed to send assessments',
        type: 'error'
      }));
    }
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesScore = candidate.matchScore >= filters.minScore;
    const matchesSearch = !filters.searchTerm || 
      candidate.firstName?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      candidate.lastName?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(filters.searchTerm.toLowerCase());
    
    return matchesScore && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreBorder = (score) => {
    if (score >= 80) return 'border-green-200';
    if (score >= 60) return 'border-blue-200';
    if (score >= 40) return 'border-yellow-200';
    return 'border-red-200';
  };

  const getDecisionBadge = (score) => {
    if (score >= 80) return { label: 'Strong Fit', color: 'bg-green-500 text-white' };
    if (score >= 60) return { label: 'Consider', color: 'bg-blue-500 text-white' };
    if (score >= 40) return { label: 'Weak Fit', color: 'bg-yellow-500 text-white' };
    return { label: 'Not a Fit', color: 'bg-red-500 text-white' };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h2>
        <button onClick={() => navigate('/jobs')} className="text-blue-600 hover:text-blue-800">
          Back to Jobs
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/jobs')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back to Jobs
        </button>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
              <div className="flex flex-wrap gap-4 text-gray-600 mb-4">
                {job.department && (
                  <div className="flex items-center">
                    <Briefcase className="w-4 h-4 mr-1" />
                    {job.department}
                  </div>
                )}
                {job.location && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {job.location}
                  </div>
                )}
                {job.workType && (
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {job.workType}
                  </div>
                )}
              </div>
              
              {job.requiredSkills && job.requiredSkills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                      {typeof skill === 'string' ? skill : skill.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Matching Candidates ({filteredCandidates.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={runAiMatching}
              disabled={aiRunning}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-60"
            >
              <Zap className="w-4 h-4 mr-2" />
              {aiRunning ? 'Running AI...' : 'Run AI Analysis'}
            </button>
            {selectedCandidates.length > 0 && (
              <button
                onClick={handleSendBulkAssessment}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Assessment ({selectedCandidates.length})
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Match Score</label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.minScore}
              onChange={(e) => setFilters(prev => ({ ...prev, minScore: parseInt(e.target.value) }))}
              className="w-full"
            />
            <div className="text-sm text-gray-600 text-center">{filters.minScore}%</div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSelectAll}
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              {selectedCandidates.length === filteredCandidates.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
      </div>

      {/* Candidates List - Compact */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    checked={selectedCandidates.length === filteredCandidates.length && filteredCandidates.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Match</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Skills</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Exp</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Decision</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedCandidates.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-3 py-8 text-center text-gray-500">
                    No candidates match your filters
                  </td>
                </tr>
              ) : (
                paginatedCandidates.map((candidate) => {
                  const decision = getDecisionBadge(candidate.matchScore);
                  return (
                    <tr key={candidate._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(candidate._id)}
                          onChange={() => handleSelectCandidate(candidate._id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                            {candidate.firstName?.[0]}{candidate.lastName?.[0]}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {candidate.firstName} {candidate.lastName}
                            </div>
                            <div className="text-xs text-gray-500">{candidate.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className={`text-lg font-bold ${getScoreColor(candidate.matchScore)}`}>
                            {candidate.matchScore}%
                          </div>
                        </div>
                        <div className="flex gap-1 mt-1">
                          <div className="text-xs text-gray-500">
                            {candidate.matchedSkills?.length || 0}/{(job.requiredSkills || []).length} skills
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(candidate.matchedSkills || []).slice(0, 3).map((skill, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded">
                              {skill}
                            </span>
                          ))}
                          {(candidate.matchedSkills || []).length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              +{candidate.matchedSkills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm text-gray-900">{candidate.experienceYears || 0}y</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${decision.color}`}>
                          {decision.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => navigate(`/candidates/${candidate._id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredCandidates.length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>

      {/* HR-tunable assessment configuration for this job */}
      <div className="mt-6">
        <AssessmentConfigPanel jobId={id} />
      </div>
    </div>
  );
};

export default JobDetailPage;