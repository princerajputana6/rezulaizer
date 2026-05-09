'use client';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from '@/lib/router-compat';
import { useDispatch } from 'react-redux';
import { 
  Save, 
  Plus, 
  Trash2, 
  Brain, 
  Upload, 
  Eye,
  Settings,
  Clock,
  FileText
} from 'lucide-react';
import { showToast } from '../../redux/slices/uiSlice';
import testService from '../../services/testService';

const CreateTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isEditing = Boolean(id);

  const [testData, setTestData] = useState({
    title: '',
    description: '',
    type: 'technical',
    duration: 60,
    passingScore: 70,
    instructions: '',
    settings: {
      shuffleQuestions: false,
      shuffleOptions: false,
      showResults: true,
      allowReview: true,
      preventCheating: false,
      timeLimit: true,
      autoSubmit: true,
    },
    questions: []
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const location = useLocation();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiForm, setAiForm] = useState({
    experienceLevel: 'mid',
    technologies: '',
    jobDescription: '',
    duration: 45,
    questionCount: 10,
    difficulty: 'mixed',
    includeMcq: true,
    includeOutput: true,
    includePractical: true
  });
  const [aiErrors, setAiErrors] = useState({});
  const [collapse, setCollapse] = useState({ mcq: false, essay: false, coding: false });

  const handleAiFormChange = (e) => {
    const { name, value } = e.target;
    setAiForm(prev => ({ ...prev, [name]: value }));
  };

  // If navigated from JD view, prefill AI builder with JD data
  useEffect(() => {
    const jd = location?.state?.jd;
    if (!jd) return;
    try {
      const techs = Array.isArray(jd.requiredSkills)
        ? jd.requiredSkills.map(s => s.skillName).filter(Boolean).join(', ')
        : '';
      const yearsAvg = (() => {
        const min = Number(jd.minExperience || 0);
        const max = Number(jd.maxExperience || min);
        return (min + max) / 2;
      })();
      const level = yearsAvg <= 1 ? 'entry' : yearsAvg <= 4 ? 'mid' : 'senior';
      setAiForm(prev => ({
        ...prev,
        technologies: techs || prev.technologies,
        experienceLevel: level,
        difficulty: prev.difficulty || 'mixed'
      }));
      setShowAIGenerator(true);
    } catch {}
  }, [location]);

  // Enhanced preview renderer for different question types
  const renderQuestionPreview = (question, index) => {
    const type = (question.type || 'multiple_choice');
    const points = Number.isFinite(question.points) ? question.points : 1;

    const TypeBadge = ({ t }) => (
      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${
        t === 'multiple_choice' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
        t === 'essay' ? 'bg-amber-50 text-amber-700 border-amber-200' :
        t === 'coding' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
        'bg-gray-50 text-gray-600 border-gray-200'
      }`}>
        {t === 'multiple_choice' ? 'MCQ' : t === 'essay' ? 'Output-based' : t === 'coding' ? 'Practical' : t}
      </span>
    );

    return (
      <div key={question.id || index} className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <h5 className="font-medium text-gray-900 pr-3">
            {index + 1}. {question.question}
          </h5>
          <div className="flex items-center gap-2">
            <TypeBadge t={type} />
            <span className="text-xs text-gray-500">{points} pts</span>
          </div>
        </div>

        {type === 'multiple_choice' && (
          <div className="space-y-2">
            {question.options.map((option, optionIndex) => {
              const label = String.fromCharCode(65 + optionIndex);
              const isCorrect = (question.correctAnswer || 'A').toString().toUpperCase() === label;
              return (
                <div key={optionIndex} className={`flex items-center space-x-2 ${isCorrect ? 'bg-green-50 border border-green-100 rounded-md px-2 py-1' : ''}`}>
                  <div className={`w-4 h-4 border ${isCorrect ? 'border-green-400 bg-green-200' : 'border-gray-300'} rounded-full`}></div>
                  <span className="text-sm text-gray-700">
                    {label}. {option}
                  </span>
                  {isCorrect && <span className="text-[11px] text-green-700 ml-2">Correct</span>}
                </div>
              );
            })}
            {question.explanation && (
              <p className="text-xs text-gray-600 mt-2"><span className="font-medium">Explanation:</span> {question.explanation}</p>
            )}
          </div>
        )}

        {type === 'essay' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-700">Provide the output for the given problem/scenario.</p>
            {question.explanation && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <div className="text-xs font-medium text-amber-900 mb-1">Expected Output / Key Points</div>
                <div className="text-xs text-amber-900 whitespace-pre-line">{question.explanation}</div>
              </div>
            )}
          </div>
        )}

        {type === 'coding' && (
          <div className="space-y-3">
            {question.starterCode && (
              <div>
                <div className="text-xs font-medium text-gray-700 mb-1">Starter Code</div>
                <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs overflow-auto"><code>{question.starterCode}</code></pre>
              </div>
            )}
            {Array.isArray(question.testCases) && question.testCases.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-700 mb-1">Sample Test Cases</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border border-gray-200 rounded-md">
                    <thead>
                      <tr className="bg-gray-50 text-gray-700">
                        <th className="px-2 py-1 text-left border-b">Input</th>
                        <th className="px-2 py-1 text-left border-b">Expected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {question.testCases.map((tc, i) => (
                        <tr key={i} className="odd:bg-white even:bg-gray-50">
                          <td className="px-2 py-1 align-top border-t">{typeof tc.input === 'object' ? JSON.stringify(tc.input) : String(tc.input)}</td>
                          <td className="px-2 py-1 align-top border-t">{typeof tc.expected === 'object' ? JSON.stringify(tc.expected) : String(tc.expected)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {question.explanation && (
              <p className="text-xs text-gray-600"><span className="font-medium">Notes:</span> {question.explanation}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const validateAiForm = () => {
    const errs = {};
    const techs = aiForm.technologies.trim();
    const jd = aiForm.jobDescription.trim();
    if (!techs && !jd) {
      errs.prompt = 'Provide either Technologies or Job Description to guide AI.';
    }
    const q = Number(aiForm.questionCount);
    if (!Number.isFinite(q) || q < 5 || q > 30) {
      errs.questionCount = 'Question count must be between 5 and 30.';
    }
    const d = Number(aiForm.duration);
    if (!Number.isFinite(d) || d < 5 || d > 180) {
      errs.duration = 'Duration must be between 5 and 180 minutes.';
    }
    setAiErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const mapAiQuestionsToLocal = (items = [], forceType) => {
    return items.map((q, idx) => ({
      id: Date.now() + idx,
      type: (forceType || q.type || 'multiple_choice'),
      question: q.question || q.prompt || '',
      options: Array.isArray(q.options) && q.options.length > 0 ? q.options.slice(0, 4).map((o) => (typeof o === 'string' ? o : (o?.text || ''))) : ['', '', '', ''],
      correctAnswer: (q.correctAnswer || q.correct_letter || 'A').toString().toUpperCase(),
      points: Number.isFinite(q.points) ? q.points : 1,
      explanation: q.explanation || '',
      starterCode: q.starterCode || '',
      testCases: Array.isArray(q.tests) ? q.tests : []
    }));
  };

  // Server requires prompt between 10 and 500 chars; safely compose and truncate
  const makePrompt = (baseText, suffix) => {
    const MAX = 500;
    const base = (baseText || '').trim();
    const suf = (suffix || '').trim();
    // Ensure at least a minimal meaningful base if user left JD empty
    const minimalBase = base.length >= 10 ? base : 'Generate technical interview questions.';
    // Reserve space for suffix plus a space
    const reserve = suf ? suf.length + 1 : 0;
    const allowedBaseLen = Math.max(10, Math.min(MAX - reserve, minimalBase.length));
    const truncatedBase = minimalBase.slice(0, allowedBaseLen);
    let out = truncatedBase;
    if (suf) {
      out = `${truncatedBase} ${suf}`.trim();
      // Safety clamp if just exceeded by 1-2 chars due to trim
      if (out.length > MAX) {
        out = out.slice(0, MAX);
      }
    }
    // Final guard to be within [10, 500]
    if (out.length < 10) {
      out = 'Generate interview questions.'; // 27 chars
    }
    return out;
  };

  const handleGenerateFullTest = async () => {
    try {
      if (!validateAiForm()) return;
      setAiLoading(true);
      const total = Math.max(5, Math.min(30, Number(aiForm.questionCount) || 10));
      const selected = [
        aiForm.includeMcq && 'multiple_choice',
        aiForm.includeOutput && 'essay',
        aiForm.includePractical && 'coding'
      ].filter(Boolean);
      const perType = Math.max(1, Math.floor(total / (selected.length || 1)));
      const counts = {};
      selected.forEach((t, i) => {
        const raw = (i === selected.length - 1) ? (total - perType * (selected.length - 1)) : perType;
        counts[t] = Math.max(1, Math.min(20, raw));
      });

      const basePrompt = aiForm.jobDescription?.trim() || `Create ${total} questions for ${aiForm.technologies}`;
      const baseSubject = (aiForm.technologies || '').split(',').map(s => s.trim())[0] || 'General';
      const difficulty = aiForm.difficulty === 'mixed' ? 'medium' : aiForm.difficulty;

      const requests = selected.map(async (type) => {
        const shortType = type === 'multiple_choice' ? 'MCQ' : (type === 'coding' ? 'coding' : 'output');
        const prompt = makePrompt(
          basePrompt,
          `Include ${counts[type]} ${shortType} suitable for ${aiForm.experienceLevel} level`
        );
        const resp = await testService.generateQuestionsWithAI({
          prompt,
          count: counts[type],
          difficulty,
          type,
          subject: baseSubject
        });
        const data = resp?.data || resp;
        return mapAiQuestionsToLocal(data?.questions || data?.items || [], type);
      });

      const chunks = await Promise.all(requests);
      const flat = chunks.flat();
      const title = 'AI Generated Comprehensive Test';
      const description = 'Includes MCQ, output-based, and practical questions';
      const duration = Number(aiForm.duration) || 45;

      setTestData(prev => ({
        ...prev,
        title,
        description,
        duration,
        type: 'technical',
        settings: { ...prev.settings, shuffleQuestions: true, shuffleOptions: true },
        questions: flat
      }));
      setCurrentStep(2);
      dispatch(showToast({ message: 'AI test generated', type: 'success' }));
    } catch (e) {
      dispatch(showToast({ message: e?.response?.data?.message || 'Failed to generate test with AI', type: 'error' }));
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (isEditing) {
      loadTest();
    }
  }, [id, isEditing]);

  const loadTest = async () => {
    try {
      setIsLoading(true);
      const response = await testService.getTestById(id);
      setTestData(response.data);
    } catch (error) {
      dispatch(showToast({
        message: 'Failed to load test',
        type: 'error'
      }));
      navigate('/tests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setTestData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setTestData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      if (isEditing) {
        await testService.updateTest(id, testData);
        dispatch(showToast({
          message: 'Test updated successfully',
          type: 'success'
        }));
      } else {
        const response = await testService.createTest(testData);
        dispatch(showToast({
          message: 'Test created successfully',
          type: 'success'
        }));
        navigate(`/tests/${response.data.id}/edit`);
      }
    } catch (error) {
      dispatch(showToast({
        message: error.response?.data?.message || 'Failed to save test',
        type: 'error'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setIsLoading(true);
      await testService.publishTest(id);
      dispatch(showToast({
        message: 'Test published successfully',
        type: 'success'
      }));
      navigate('/tests');
    } catch (error) {
      dispatch(showToast({
        message: 'Failed to publish test',
        type: 'error'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1,
      explanation: ''
    };
    
    setTestData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const updateQuestion = (questionId, field, value) => {
    setTestData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, [field]: value } : q
      )
    }));
  };

  const deleteQuestion = (questionId) => {
    setTestData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  const steps = [
    { id: 1, name: 'Basic Info', icon: FileText },
    { id: 2, name: 'Questions', icon: Plus },
    { id: 3, name: 'Settings', icon: Settings },
    { id: 4, name: 'Preview', icon: Eye }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={testData.title}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="Enter test title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Type *
                </label>
                <select
                  name="type"
                  value={testData.type}
                  onChange={handleInputChange}
                  className="input w-full"
                  required
                >
                  <option value="technical">Technical</option>
                  <option value="aptitude">Aptitude</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  name="duration"
                  value={testData.duration}
                  onChange={handleInputChange}
                  className="input w-full"
                  min="5"
                  max="300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  name="passingScore"
                  value={testData.passingScore}
                  onChange={handleInputChange}
                  className="input w-full"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={testData.description}
                onChange={handleInputChange}
                className="input w-full h-24"
                placeholder="Brief description of the test"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions
              </label>
              <textarea
                name="instructions"
                value={testData.instructions}
                onChange={handleInputChange}
                className="input w-full h-32"
                placeholder="Instructions for test takers"
              />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="inline-flex items-center space-x-2 p-3 bg-gray-50 border rounded-lg">
                <input type="checkbox" name="includeMcq" checked={aiForm.includeMcq} onChange={(e)=> setAiForm(p=>({...p, includeMcq: e.target.checked}))} className="rounded" />
                <span className="text-sm text-gray-700">Include MCQ</span>
              </label>
              <label className="inline-flex items-center space-x-2 p-3 bg-gray-50 border rounded-lg">
                <input type="checkbox" name="includeOutput" checked={aiForm.includeOutput} onChange={(e)=> setAiForm(p=>({...p, includeOutput: e.target.checked}))} className="rounded" />
                <span className="text-sm text-gray-700">Include Output-based</span>
              </label>
              <label className="inline-flex items-center space-x-2 p-3 bg-gray-50 border rounded-lg">
                <input type="checkbox" name="includePractical" checked={aiForm.includePractical} onChange={(e)=> setAiForm(p=>({...p, includePractical: e.target.checked}))} className="rounded" />
                <span className="text-sm text-gray-700">Include Practical (Coding)</span>
              </label>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Questions</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowAIGenerator(true)}
                  className="btn btn-secondary btn-sm"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  AI Generate
                </button>
                <button
                  onClick={addQuestion}
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </button>
              </div>
            </div>

            {testData.questions.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h3>
                <p className="text-gray-600 mb-4">Add questions manually or use AI to generate them</p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={addQuestion}
                    className="btn btn-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </button>
                  <button
                    onClick={() => setShowAIGenerator(true)}
                    className="btn btn-secondary"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Generate with AI
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {testData.questions.map((question, index) => (
                  <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-lg font-medium text-gray-900">
                        Question {index + 1}
                      </h4>
                      <button
                        onClick={() => deleteQuestion(question.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Text *
                        </label>
                        <textarea
                          value={question.question}
                          onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                          className="input w-full h-20"
                          placeholder="Enter your question"
                          required
                        />
                      </div>

                      {question.type === 'multiple_choice' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Options
                          </label>
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name={`correct-${question.id}`}
                                  checked={question.correctAnswer === String.fromCharCode(65 + optionIndex)}
                                  onChange={() => updateQuestion(question.id, 'correctAnswer', String.fromCharCode(65 + optionIndex))}
                                  className="text-primary-600"
                                />
                                <span className="text-sm font-medium text-gray-700 w-6">
                                  {String.fromCharCode(65 + optionIndex)}.
                                </span>
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...question.options];
                                    newOptions[optionIndex] = e.target.value;
                                    updateQuestion(question.id, 'options', newOptions);
                                  }}
                                  className="input flex-1"
                                  placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Points
                          </label>
                          <input
                            type="number"
                            value={question.points}
                            onChange={(e) => updateQuestion(question.id, 'points', parseInt(e.target.value))}
                            className="input w-full"
                            min="1"
                            max="100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Difficulty
                          </label>
                          <select
                            value={question.difficulty || 'medium'}
                            onChange={(e) => updateQuestion(question.id, 'difficulty', e.target.value)}
                            className="input w-full"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Explanation (Optional)
                        </label>
                        <textarea
                          value={question.explanation}
                          onChange={(e) => updateQuestion(question.id, 'explanation', e.target.value)}
                          className="input w-full h-16"
                          placeholder="Explain why this answer is correct"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Test Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Question Settings</h4>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="settings.shuffleQuestions"
                    checked={testData.settings.shuffleQuestions}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Shuffle questions</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="settings.shuffleOptions"
                    checked={testData.settings.shuffleOptions}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Shuffle answer options</span>
                </label>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Result Settings</h4>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="settings.showResults"
                    checked={testData.settings.showResults}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Show results immediately</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="settings.allowReview"
                    checked={testData.settings.allowReview}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Allow answer review</span>
                </label>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Security Settings</h4>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="settings.preventCheating"
                    checked={testData.settings.preventCheating}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Enable anti-cheating measures</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="settings.timeLimit"
                    checked={testData.settings.timeLimit}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Enforce time limit</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="settings.autoSubmit"
                    checked={testData.settings.autoSubmit}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Auto-submit when time expires</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Test Preview</h3>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{testData.title}</h2>
                <p className="text-gray-600 mb-4">{testData.description}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{testData.questions.length}</div>
                    <div className="text-sm text-gray-600">Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{testData.duration}</div>
                    <div className="text-sm text-gray-600">Minutes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{testData.passingScore}%</div>
                    <div className="text-sm text-gray-600">Pass Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 capitalize">{testData.type}</div>
                    <div className="text-sm text-gray-600">Type</div>
                  </div>
                </div>

                {testData.instructions && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
                    <p className="text-blue-800 text-sm">{testData.instructions}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Sample Questions:</h4>
                {testData.questions.slice(0, 2).map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">
                      {index + 1}. {question.question}
                    </h5>
                    {question.type === 'multiple_choice' && (
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <div className="w-4 h-4 border border-gray-300 rounded-full"></div>
                            <span className="text-sm text-gray-700">
                              {String.fromCharCode(65 + optionIndex)}. {option}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {testData.questions.length > 2 && (
                  <p className="text-sm text-gray-600 text-center">
                    ... and {testData.questions.length - 2} more questions
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? 'Edit Test' : 'Create New Test'}
        </h1>
        <p className="text-gray-600 mt-2">
          {isEditing ? 'Update your test details and questions' : 'Build a comprehensive test with AI assistance'}
        </p>
      </div>

      {/* AI Test Builder */}
      {!isEditing && (
        <div className="mb-8 bg-white rounded-lg shadow-soft border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Brain className="h-5 w-5 text-indigo-600" /> AI Test Builder
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
              <select name="experienceLevel" value={aiForm.experienceLevel} onChange={handleAiFormChange} className="input w-full">
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Used to calibrate difficulty and topic depth.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Technologies (comma separated)</label>
              <input type="text" name="technologies" value={aiForm.technologies} onChange={handleAiFormChange} className={`input w-full ${aiErrors.prompt ? 'border-red-300' : ''}`} placeholder="React, Node.js, SQL" />
              <p className="text-xs text-gray-500 mt-1">Example: React, Node.js, PostgreSQL. Provide this or a Job Description.</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Description / Requirements</label>
              <textarea name="jobDescription" value={aiForm.jobDescription} onChange={handleAiFormChange} className={`input w-full h-28 ${aiErrors.prompt ? 'border-red-300' : ''}`} placeholder="Paste the JD or key requirements" />
              {aiErrors.prompt && <p className="text-xs text-red-600 mt-1">{aiErrors.prompt}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input type="number" name="duration" value={aiForm.duration} onChange={handleAiFormChange} className={`input w-full ${aiErrors.duration ? 'border-red-300' : ''}`} min={5} max={180} />
              {aiErrors.duration && <p className="text-xs text-red-600 mt-1">{aiErrors.duration}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question Count</label>
              <input type="number" name="questionCount" value={aiForm.questionCount} onChange={handleAiFormChange} className={`input w-full ${aiErrors.questionCount ? 'border-red-300' : ''}`} min={5} max={30} />
              {aiErrors.questionCount && <p className="text-xs text-red-600 mt-1">{aiErrors.questionCount}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select name="difficulty" value={aiForm.difficulty} onChange={handleAiFormChange} className="input w-full">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="mixed">Mixed</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Use Mixed to include a balanced set.</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleGenerateFullTest}
              disabled={aiLoading}
              className={`inline-flex items-center px-6 py-2.5 rounded-full text-sm font-semibold transition-transform duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${aiLoading ? 'bg-indigo-300 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] text-white focus:ring-indigo-500'}`}
            >
              <Brain className="h-4 w-4 mr-2" /> {aiLoading ? 'Generating…' : 'Generate Full Test'}
            </button>
          </div>
        </div>
      )}

      {/* Read-only Preview */}
      <div className="bg-white rounded-lg shadow-soft border border-gray-200 p-6 mb-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Test Preview</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateFullTest}
                disabled={aiLoading}
                className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold transition-transform duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${aiLoading ? 'bg-indigo-300 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] text-white focus:ring-indigo-500'}`}
                title="Regenerate with same inputs"
              >
                <Brain className="h-4 w-4 mr-2" /> {aiLoading ? 'Regenerating…' : 'Regenerate'}
              </button>
            </div>
          </div>
          {!testData.questions?.length && (
            <p className="text-sm text-gray-500 mt-2">Generate a test with AI to see the preview here.</p>
          )}
        </div>

        {testData.questions?.length > 0 && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{testData.title || 'AI Generated Test'}</h2>
              {testData.description && <p className="text-gray-600 mb-4">{testData.description}</p>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">{testData.questions.length}</div>
                  <div className="text-sm text-gray-600">Questions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">{testData.duration}</div>
                  <div className="text-sm text-gray-600">Minutes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">{testData.passingScore}%</div>
                  <div className="text-sm text-gray-600">Pass Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600 capitalize">{testData.type}</div>
                  <div className="text-sm text-gray-600">Type</div>
                </div>
              </div>

              {(() => {
                const qs = testData.questions || [];
                const groups = {
                  multiple_choice: qs.filter(q => (q.type || 'multiple_choice') === 'multiple_choice'),
                  essay: qs.filter(q => (q.type || 'multiple_choice') === 'essay'),
                  coding: qs.filter(q => (q.type || 'multiple_choice') === 'coding'),
                };
                const counts = {
                  mcq: groups.multiple_choice.length,
                  essay: groups.essay.length,
                  coding: groups.coding.length,
                };
                return (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">MCQ: {counts.mcq}</span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Output-based: {counts.essay}</span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Practical: {counts.coding}</span>
                    </div>

                    {/* MCQ group */}
                    {counts.mcq > 0 && (
                      <div className="border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                          <h4 className="font-medium text-gray-900">Multiple Choice</h4>
                          <button
                            onClick={() => setCollapse(c => ({ ...c, mcq: !c.mcq }))}
                            className="text-xs text-gray-600 hover:text-gray-900"
                          >
                            {collapse.mcq ? 'Expand' : 'Collapse'}
                          </button>
                        </div>
                        {!collapse.mcq && (
                          <div className="p-4 space-y-4">
                            {groups.multiple_choice.slice(0, 5).map((q, i) => renderQuestionPreview(q, i))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Output-based group */}
                    {counts.essay > 0 && (
                      <div className="border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                          <h4 className="font-medium text-gray-900">Output-based</h4>
                          <button
                            onClick={() => setCollapse(c => ({ ...c, essay: !c.essay }))}
                            className="text-xs text-gray-600 hover:text-gray-900"
                          >
                            {collapse.essay ? 'Expand' : 'Collapse'}
                          </button>
                        </div>
                        {!collapse.essay && (
                          <div className="p-4 space-y-4">
                            {groups.essay.slice(0, 5).map((q, i) => renderQuestionPreview(q, i))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Practical group */}
                    {counts.coding > 0 && (
                      <div className="border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                          <h4 className="font-medium text-gray-900">Practical (Coding)</h4>
                          <button
                            onClick={() => setCollapse(c => ({ ...c, coding: !c.coding }))}
                            className="text-xs text-gray-600 hover:text-gray-900"
                          >
                            {collapse.coding ? 'Expand' : 'Collapse'}
                          </button>
                        </div>
                        {!collapse.coding && (
                          <div className="p-4 space-y-4">
                            {groups.coding.slice(0, 5).map((q, i) => renderQuestionPreview(q, i))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Sample Questions:</h4>
              {testData.questions.slice(0, 5).map((q, i) => renderQuestionPreview(q, i))}
              {testData.questions.length > 5 && (
                <p className="text-sm text-gray-600 text-center">
                  ... and {testData.questions.length - 5} more questions
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Actions (sticky) */}
      <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className={`inline-flex items-center px-6 py-2.5 rounded-full text-sm font-semibold transition-transform duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${isLoading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 hover:scale-[1.02] text-gray-800 focus:ring-gray-300'}`}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Draft
        </button>
        <button
          onClick={handlePublish}
          disabled={isLoading || testData.questions.length === 0}
          className={`inline-flex items-center px-6 py-2.5 rounded-full text-sm font-semibold transition-transform duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${isLoading || testData.questions.length === 0 ? 'bg-emerald-300 text-white cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] text-white focus:ring-emerald-500'}`}
        >
          <Upload className="h-4 w-4 mr-2" />
          Publish Test
        </button>
      </div>
    </div>
  );
};

export default CreateTest;