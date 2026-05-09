'use client';
import React, { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useSelector } from 'react-redux';
import { apiClient } from '../../services/apiClient';
import {
  Briefcase,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Save,
  Users,
  MapPin,
  DollarSign,
  Clock,
  Loader,
  CheckCircle,
  AlertCircle,
  X,
  Plus
} from 'lucide-react';

const CreateJobDescription = () => {
  const navigate = useNavigate();
  const currentUser = useSelector(state => state.auth.user);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [errors, setErrors] = useState({});
  const [newLocation, setNewLocation] = useState('');

  const departments = [
    'Engineering',
    'Product',
    'Design',
    'Marketing',
    'Sales',
    'Human Resources',
    'Finance',
    'Operations',
    'Customer Support',
    'Data Science',
    'Quality Assurance',
    'DevOps'
  ];

  const [basicInfo, setBasicInfo] = useState({
    title: '',
    department: '',
    locations: [],
    employmentType: 'Full-time',
    experienceLevel: 'Mid Level (3-5 years)',
    salaryRange: ''
  });

  const [aiGeneratedJD, setAiGeneratedJD] = useState({
    description: '',
    responsibilities: [],
    requirements: [],
    skills: [],
    benefits: []
  });

  const [finalJD, setFinalJD] = useState({
    description: '',
    responsibilities: '',
    requirements: '',
    skills: '',
    benefits: ''
  });

  const handleBasicInfoChange = (field, value) => {
    setBasicInfo(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddLocation = () => {
    if (newLocation.trim() && !basicInfo.locations.includes(newLocation.trim())) {
      setBasicInfo(prev => ({
        ...prev,
        locations: [...prev.locations, newLocation.trim()]
      }));
      setNewLocation('');
      if (errors.locations) {
        setErrors(prev => ({ ...prev, locations: '' }));
      }
    }
  };

  const handleRemoveLocation = (locationToRemove) => {
    setBasicInfo(prev => ({
      ...prev,
      locations: prev.locations.filter(loc => loc !== locationToRemove)
    }));
  };

  const validateBasicInfo = () => {
    const newErrors = {};
    if (!basicInfo.title.trim()) newErrors.title = 'Job title is required';
    if (!basicInfo.department.trim()) newErrors.department = 'Department is required';
    if (basicInfo.locations.length === 0) newErrors.locations = 'At least one location is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateJDWithAI = async () => {
    if (!validateBasicInfo()) return;

    setAiGenerating(true);
    try {
      // Simulate AI generation - replace with actual AI API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockAIResponse = {
        description: `We are seeking a talented ${basicInfo.title} to join our ${basicInfo.department} team. This role offers an exciting opportunity to work with cutting-edge technologies and contribute to innovative projects that make a real impact. The ideal candidate will bring fresh perspectives and drive excellence in everything they do.`,
        responsibilities: [
          `Lead and execute ${basicInfo.title.toLowerCase()} projects from conception to completion`,
          'Collaborate with cross-functional teams to deliver high-quality solutions',
          'Mentor junior team members and contribute to team growth',
          'Stay updated with industry trends and best practices',
          'Participate in code reviews and maintain high coding standards',
          'Contribute to architectural decisions and technical strategy'
        ],
        requirements: [
          `${basicInfo.experienceLevel === 'entry-level' ? '1-2' : basicInfo.experienceLevel === 'mid-level' ? '3-5' : '5+'} years of relevant experience`,
          'Strong problem-solving and analytical skills',
          'Excellent communication and collaboration abilities',
          'Bachelor\'s degree in relevant field or equivalent experience',
          'Proven track record of delivering successful projects',
          'Ability to work in a fast-paced, dynamic environment'
        ],
        skills: [
          'JavaScript/TypeScript',
          'React.js',
          'Node.js',
          'Database design',
          'API development',
          'Version control (Git)',
          'Agile methodologies',
          'Problem solving',
          'Team collaboration',
          'Technical documentation'
        ],
        benefits: [
          'Competitive salary and equity package',
          'Comprehensive health, dental, and vision insurance',
          'Flexible working hours and remote work options',
          'Professional development budget',
          'Modern office with state-of-the-art equipment',
          'Team building activities and company events',
          'Unlimited PTO policy',
          'Career growth opportunities'
        ]
      };

      setAiGeneratedJD(mockAIResponse);
      setFinalJD({
        description: mockAIResponse.description,
        responsibilities: mockAIResponse.responsibilities.join('\n• '),
        requirements: mockAIResponse.requirements.join('\n• '),
        skills: mockAIResponse.skills.join(', '),
        benefits: mockAIResponse.benefits.join('\n• ')
      });
      setStep(2);
    } catch (error) {
      console.error('Error generating JD:', error);
      setErrors({ general: 'Failed to generate job description. Please try again.' });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleFinalJDChange = (field, value) => {
    setFinalJD(prev => ({ ...prev, [field]: value }));
  };

  const saveJobDescription = async () => {
    setLoading(true);
    try {
      // Handle skills - can be string (from textarea) or array (from AI)
      let skillsArray = [];
      const skillsData = finalJD.skills || aiGeneratedJD.skills;
      
      if (typeof skillsData === 'string') {
        // If string, split by comma and trim
        skillsArray = skillsData
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);
      } else if (Array.isArray(skillsData)) {
        // If already array, use as is
        skillsArray = skillsData;
      }

      const jobDescriptionData = {
        title: basicInfo.title,
        department: basicInfo.department,
        location: basicInfo.locations.join(', '), // Join locations into single string
        workType: basicInfo.employmentType,
        description: finalJD.description || aiGeneratedJD.description,
        requiredSkills: skillsArray.map(skill => ({
          name: typeof skill === 'string' ? skill : skill.name || skill,
          level: 'Intermediate',
          mandatory: false
        })),
        status: 'Draft', // Use correct enum value
        postedBy: currentUser._id, // Add required postedBy field
        company: currentUser._id // Add required company field
      };

      const response = await apiClient.post('/job-descriptions', jobDescriptionData);
      
      if (response.data.success) {
        const jobId = response.data.data._id || response.data.data.id;
        // Navigate to job detail page to see matching candidates
        navigate(`/jobs/${jobId}`);
      } else {
        setErrors({ general: response.data.message || 'Failed to save job description' });
      }
    } catch (error) {
      console.error('Error saving JD:', error);
      setErrors({ general: 'Failed to save job description. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => step === 1 ? navigate('/job-descriptions') : setStep(1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </button>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-primary-100 p-2 rounded-lg">
              <Briefcase className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Job Description</h1>
              <p className="text-gray-600">AI-powered job description creation</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="text-sm font-medium">Basic Info</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="text-sm font-medium">AI Generation</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="text-sm font-medium">Candidate Matching</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errors.general && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{errors.general}</span>
          </div>
        )}

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Basic Job Information</h2>
              <p className="text-gray-600">Provide basic details about the position</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={basicInfo.title}
                  onChange={(e) => handleBasicInfoChange('title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Senior React Developer"
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <select
                  value={basicInfo.department}
                  onChange={(e) => handleBasicInfoChange('department', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                    errors.department ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location(s) *
                </label>
                <div className="space-y-2">
                  {/* Add location input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLocation())}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                          errors.locations ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="e.g., San Francisco, CA or Remote"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddLocation}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                  
                  {/* Selected locations */}
                  {basicInfo.locations.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {basicInfo.locations.map((location, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          <MapPin className="w-3 h-3" />
                          {location}
                          <button
                            type="button"
                            onClick={() => handleRemoveLocation(location)}
                            className="ml-1 hover:text-blue-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {errors.locations && <p className="mt-1 text-sm text-red-600">{errors.locations}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employment Type
                </label>
                <select
                  value={basicInfo.employmentType}
                  onChange={(e) => handleBasicInfoChange('employmentType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experience Level
                </label>
                <select
                  value={basicInfo.experienceLevel}
                  onChange={(e) => handleBasicInfoChange('experienceLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="entry-level">Entry Level (0-2 years)</option>
                  <option value="mid-level">Mid Level (3-5 years)</option>
                  <option value="senior-level">Senior Level (5+ years)</option>
                  <option value="executive">Executive Level</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salary Range (Optional)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={basicInfo.salaryRange}
                    onChange={(e) => handleBasicInfoChange('salaryRange', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., $80,000 - $120,000"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={generateJDWithAI}
                disabled={aiGenerating}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
              >
                {aiGenerating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Generating with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: AI Generated Content */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">AI Generated Job Description</h2>
              </div>
              <p className="text-gray-600">Review and edit the AI-generated content</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Description
                </label>
                <textarea
                  value={finalJD.description}
                  onChange={(e) => handleFinalJDChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Job description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Responsibilities
                </label>
                <textarea
                  value={finalJD.responsibilities}
                  onChange={(e) => handleFinalJDChange('responsibilities', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="• Responsibility 1&#10;• Responsibility 2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requirements
                </label>
                <textarea
                  value={finalJD.requirements}
                  onChange={(e) => handleFinalJDChange('requirements', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="• Requirement 1&#10;• Requirement 2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Skills
                </label>
                <textarea
                  value={finalJD.skills}
                  onChange={(e) => handleFinalJDChange('skills', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Skill 1, Skill 2, Skill 3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Benefits
                </label>
                <textarea
                  value={finalJD.benefits}
                  onChange={(e) => handleFinalJDChange('benefits', e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="• Benefit 1&#10;• Benefit 2"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={saveJobDescription}
                disabled={loading}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save & Find Candidates</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateJobDescription;