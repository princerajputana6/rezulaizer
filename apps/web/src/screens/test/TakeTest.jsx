'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from '@/lib/router-compat';
import { useDispatch } from 'react-redux';
import { Clock, AlertTriangle, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { showToast } from '../../redux/slices/uiSlice';
import testService from '../../services/testService';

const TakeTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const intervalRef = useRef(null);

  const [test, setTest] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  // Per-question timers in seconds (1 minute each)
  const [questionTimers, setQuestionTimers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    loadTest();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [id]);

  useEffect(() => {
    // Tick only the current question's timer once per second
    if (hasStarted && questionTimers.length > 0) {
      intervalRef.current = setInterval(() => {
        setQuestionTimers(prev => {
          if (!Array.isArray(prev) || prev.length === 0) return prev;
          const next = [...prev];
          const current = next[currentQuestionIndex] ?? 60;
          if (current <= 1) {
            // Auto-advance or submit when current hits 0
            if (currentQuestionIndex < (test?.questions?.length || 0) - 1) {
              // Move to next question
              setCurrentQuestionIndex(idx => idx + 1);
            } else {
              // Last question: auto submit
              handleAutoSubmit();
            }
            next[currentQuestionIndex] = 0;
          } else {
            next[currentQuestionIndex] = current - 1;
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [hasStarted, currentQuestionIndex, questionTimers.length]);

  const loadTest = async () => {
    try {
      setIsLoading(true);
      const response = await testService.getTestById(id);
      setTest(response.data);
      // Initialize 60s per question timers
      const qCount = response?.data?.questions?.length || 0;
      if (qCount > 0) {
        setQuestionTimers(Array(qCount).fill(60));
      }

      // Check if there's an existing attempt
      try {
        const attemptResponse = await testService.getTestAttempt(id);
        setAttempt(attemptResponse.data);
        setAnswers(attemptResponse.data.answers.reduce((acc, answer) => {
          acc[answer.questionId] = answer.answer;
          return acc;
        }, {}));
        // Start per-question timers only when user starts the test
        setHasStarted(attemptResponse.data.status === 'in_progress');
      } catch (error) {
        // No existing attempt
      }
    } catch (error) {
      dispatch(showToast({
        message: 'Failed to load test',
        type: 'error'
      }));
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const startTest = async () => {
    try {
      setIsLoading(true);
      const response = await testService.startTestAttempt(id);
      setAttempt(response.data);
      // If timers are not initialized (edge), set now
      if (!questionTimers || questionTimers.length === 0) {
        const qCount = test?.questions?.length || 0;
        setQuestionTimers(Array(qCount).fill(60));
      }
      setHasStarted(true);
      
      dispatch(showToast({
        message: 'Test started! Good luck!',
        type: 'success'
      }));
    } catch (error) {
      dispatch(showToast({
        message: 'Failed to start test',
        type: 'error'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = async (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));

    // Auto-save answer
    try {
      await testService.submitAnswer(id, questionId, answer);
    } catch (error) {
      console.error('Failed to save answer:', error);
    }
  };

  const handleAutoSubmit = async () => {
    if (isSubmitting) return;
    
    dispatch(showToast({
      message: 'Time is up! Submitting your test...',
      type: 'warning'
    }));
    
    await submitTest();
  };

  const submitTest = async () => {
    try {
      setIsSubmitting(true);
      
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer
      }));

      const response = await testService.submitTestAttempt(id, formattedAnswers);
      
      dispatch(showToast({
        message: 'Test submitted successfully!',
        type: 'success'
      }));
      
      navigate(`/tests/${id}/report?attemptId=${response.data.id}`);
    } catch (error) {
      dispatch(showToast({
        message: 'Failed to submit test',
        type: 'error'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const currentSeconds = questionTimers[currentQuestionIndex] ?? 60;
  const getTimeColor = () => {
    if (currentSeconds <= 10) return 'text-red-600';
    if (currentSeconds <= 20) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Test not found</h2>
      </div>
    );
  }

  // Pre-test screen
  if (!hasStarted) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-soft border border-gray-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{test.title}</h1>
            <p className="text-gray-600 text-lg">{test.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-600">{test.questions?.length || 0}</div>
              <div className="text-sm text-gray-600">Questions</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-600">{test.duration}</div>
              <div className="text-sm text-gray-600">Minutes</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-600">{test.passingScore}%</div>
              <div className="text-sm text-gray-600">Pass Score</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-600 capitalize">{test.type}</div>
              <div className="text-sm text-gray-600">Type</div>
            </div>
          </div>

          {test.instructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-blue-900 mb-3">Instructions:</h3>
              <div className="text-blue-800 whitespace-pre-line">{test.instructions}</div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">Important Notes:</h3>
                <ul className="text-yellow-800 text-sm space-y-1">
                  <li>• Once started, you cannot pause the test</li>
                  <li>• Your answers are automatically saved</li>
                  <li>• The test will auto-submit when time expires</li>
                  <li>• Do not refresh or close the browser tab</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={startTest}
              disabled={isLoading}
              className="btn btn-primary btn-lg px-8"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="spinner mr-2"></div>
                  Starting...
                </div>
              ) : (
                'Start Test'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = test.questions[currentQuestionIndex];
  const qId = currentQuestion?._id || currentQuestion?.id;
  const qType = (currentQuestion?.type || '').replace('-', '_'); // normalize 'multiple-choice' -> 'multiple_choice'
  const progress = ((currentQuestionIndex + 1) / test.questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-soft border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{test.title}</h1>
            <p className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {test.questions.length}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${getTimeColor()}`}>
              <Clock className="h-5 w-5 mr-2" />
              <span className="font-mono text-lg font-semibold">
                {formatTime(currentSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg shadow-soft border border-gray-200 p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {currentQuestion.question}
          </h2>

          {qType === 'multiple_choice' && (
            <div className="space-y-3">
              {(currentQuestion.options || []).map((option, index) => {
                const optionLabel = String.fromCharCode(65 + index);
                const text = typeof option === 'string' ? option : (option?.text || '');
                const isSelected = answers[qId] === optionLabel;
                
                return (
                  <label
                    key={index}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${qId}`}
                      value={optionLabel}
                      checked={isSelected}
                      onChange={(e) => handleAnswerChange(qId, e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                      isSelected ? 'border-primary-500' : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-primary-500" />
                      )}
                    </div>
                    <span className="text-gray-900">
                      <strong>{optionLabel}.</strong> {text}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {qType === 'short_answer' && (
            <textarea
              value={answers[qId] || ''}
              onChange={(e) => handleAnswerChange(qId, e.target.value)}
              className="input w-full h-32"
              placeholder="Enter your answer here..."
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-end">
        <div className="flex space-x-3">
          {currentQuestionIndex < test.questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
              className="btn btn-primary"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={submitTest}
              disabled={isSubmitting}
              className="btn btn-success"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="spinner mr-2"></div>
                  Submitting...
                </div>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Test
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Submit confirmation */}
      {currentQuestionIndex === test.questions.length - 1 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="font-medium text-yellow-900">Ready to submit?</h3>
              <p className="text-yellow-800 text-sm mt-1">
                You've answered {Object.keys(answers).length} out of {test.questions.length} questions.
                Once submitted, you cannot make changes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeTest;