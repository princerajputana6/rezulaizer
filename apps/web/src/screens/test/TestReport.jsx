'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from '@/lib/router-compat';
import { useDispatch } from 'react-redux';
import { 
  Trophy, 
  Clock, 
  CheckCircle, 
  XCircle, 
  BarChart3, 
  Download,
  Share2,
  ArrowLeft,
  Target,
  TrendingUp
} from 'lucide-react';
import { showToast } from '../../redux/slices/uiSlice';
import testService from '../../services/testService';

const TestReport = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const attemptId = searchParams.get('attemptId');

  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [id, attemptId]);

  const loadResults = async () => {
    try {
      setIsLoading(true);
      const response = await testService.getTestResults(id, attemptId);
      setResults(response.data);
    } catch (error) {
      dispatch(showToast({
        message: 'Failed to load test results',
        type: 'error'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-100 border-green-200';
    if (percentage >= 70) return 'bg-blue-100 border-blue-200';
    if (percentage >= 50) return 'bg-yellow-100 border-yellow-200';
    return 'bg-red-100 border-red-200';
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Results not found</h2>
      </div>
    );
  }

  const { test, attempt, analysis } = results;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/dashboard"
              className="flex items-center text-primary-600 hover:text-primary-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{test.title}</h1>
            <p className="text-gray-600 mt-2">Test Results</p>
          </div>
          
          <div className="flex space-x-3">
            <button className="btn btn-outline btn-sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </button>
            <button className="btn btn-primary btn-sm">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Score */}
        <div className={`col-span-1 lg:col-span-2 rounded-lg border p-8 text-center ${getScoreBgColor(attempt.percentage)}`}>
          <div className="mb-4">
            <Trophy className={`h-16 w-16 mx-auto ${getScoreColor(attempt.percentage)}`} />
          </div>
          <div className={`text-6xl font-bold mb-2 ${getScoreColor(attempt.percentage)}`}>
            {attempt.percentage}%
          </div>
          <div className="text-lg text-gray-700 mb-4">
            {attempt.score} out of {attempt.totalScore} points
          </div>
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
            attempt.isPassed 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {attempt.isPassed ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Passed
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Failed
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Time Taken</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDuration(attempt.timeSpent)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-primary-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Correct Answers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analysis.correctAnswers} / {analysis.totalQuestions}
                </p>
              </div>
              <Target className="h-8 w-8 text-success-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round((analysis.correctAnswers / analysis.totalQuestions) * 100)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Proctoring Flags */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Proctoring Flags</h3>
          {attempt?.id && (
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const url = `/api/tests/${id}/proctoring/export?attemptId=${attempt.id}&format=csv`;
                    const res = await fetch(url, {
                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    const blob = await res.blob();
                    const dlUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = dlUrl;
                    a.download = `proctoring-events-${attempt.id}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(dlUrl);
                  } catch (e) {
                    dispatch(showToast({ message: 'CSV export failed', type: 'error' }));
                  }
                }}
                className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
              >
                Export CSV
              </button>
              <button
                onClick={async () => {
                  try {
                    const url = `/api/tests/${id}/proctoring/export?attemptId=${attempt.id}&format=pdf`;
                    const res = await fetch(url, {
                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    const blob = await res.blob();
                    const dlUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = dlUrl;
                    a.download = `proctoring-events-${attempt.id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(dlUrl);
                  } catch (e) {
                    dispatch(showToast({ message: 'PDF export failed', type: 'error' }));
                  }
                }}
                className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
              >
                Export PDF
              </button>
            </div>
          )}
        </div>
        {attempt?.flags ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded border bg-gray-50">
              <p className="text-sm text-gray-600">Tab Switches</p>
              <p className="text-2xl font-bold text-gray-900">{attempt.flags.tabSwitches || 0}</p>
            </div>
            <div className="p-4 rounded border bg-gray-50">
              <p className="text-sm text-gray-600">Fullscreen Exits</p>
              <p className="text-2xl font-bold text-gray-900">{attempt.flags.fullscreenExits || 0}</p>
            </div>
            <div className="p-4 rounded border bg-gray-50">
              <p className="text-sm text-gray-600">Copy/Paste Attempts</p>
              <p className="text-2xl font-bold text-gray-900">{attempt.flags.copyPasteAttempts || 0}</p>
            </div>
            <div className={`p-4 rounded border ${attempt.flags.suspicious ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className="text-sm text-gray-600">Overall Status</p>
              <p className={`text-lg font-semibold ${attempt.flags.suspicious ? 'text-red-700' : 'text-green-700'}`}>
                {attempt.flags.suspicious ? 'Suspicious Activity Detected' : 'No Issues Detected'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">No proctoring information available.</p>
        )}

        {attempt?.flags?.events && attempt.flags.events.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-3">Event Timeline</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {attempt.flags.events
                .slice()
                .sort((a,b) => new Date(a.occurredAt) - new Date(b.occurredAt))
                .map((ev, idx) => (
                  <div key={`${ev.type}-${idx}-${ev.occurredAt}`} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                    <div className="text-sm text-gray-800 capitalize">{ev.type.replace('_',' ')}</div>
                    <div className="text-xs text-gray-500">{new Date(ev.occurredAt).toLocaleString()}</div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Question Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Analysis</h3>
          <div className="space-y-4">
            {attempt.answers.map((answer, index) => {
              const question = test.questions.find(q => q.id === answer.questionId);
              return (
                <div key={answer.questionId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      answer.isCorrect 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {question?.question || 'Question'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {question?.points || 1} point{(question?.points || 1) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {formatDuration(answer.timeSpent || 0)}
                    </span>
                    {answer.isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
          
          {attempt.feedback && (
            <div className="space-y-4">
              {attempt.feedback.overall && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Overall Performance</h4>
                  <p className="text-gray-700 text-sm">{attempt.feedback.overall}</p>
                </div>
              )}

              {attempt.feedback.strengths && attempt.feedback.strengths.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Strengths</h4>
                  <ul className="space-y-1">
                    {attempt.feedback.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {attempt.feedback.improvements && attempt.feedback.improvements.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Areas for Improvement</h4>
                  <ul className="space-y-1">
                    {attempt.feedback.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start">
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {attempt.feedback.recommendations && attempt.feedback.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {attempt.feedback.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start">
                        <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!attempt.feedback && (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Detailed analysis will be available soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Review */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Detailed Review</h3>
        
        <div className="space-y-6">
          {test.questions.map((question, index) => {
            const userAnswer = attempt.answers.find(a => a.questionId === question.id);
            const isCorrect = userAnswer?.isCorrect || false;
            
            return (
              <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">
                    Question {index + 1}
                  </h4>
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                    isCorrect 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {isCorrect ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </div>
                </div>

                <p className="text-gray-900 mb-4">{question.question}</p>

                {question.type === 'multiple_choice' && (
                  <div className="space-y-2 mb-4">
                    {question.options.map((option, optionIndex) => {
                      const optionLabel = String.fromCharCode(65 + optionIndex);
                      const isUserAnswer = userAnswer?.answer === optionLabel;
                      const isCorrectAnswer = question.correctAnswer === optionLabel;
                      
                      return (
                        <div
                          key={optionIndex}
                          className={`p-3 rounded-lg border ${
                            isCorrectAnswer
                              ? 'border-green-500 bg-green-50'
                              : isUserAnswer && !isCorrectAnswer
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isCorrectAnswer
                                ? 'border-green-500 bg-green-500'
                                : isUserAnswer
                                ? 'border-red-500 bg-red-500'
                                : 'border-gray-300'
                            }`}>
                              {(isCorrectAnswer || isUserAnswer) && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                            <span className="text-gray-900">
                              <strong>{optionLabel}.</strong> {option}
                            </span>
                            {isUserAnswer && (
                              <span className="text-sm text-gray-600">(Your answer)</span>
                            )}
                            {isCorrectAnswer && (
                              <span className="text-sm text-green-600">(Correct answer)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {question.explanation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">Explanation:</h5>
                    <p className="text-blue-800 text-sm">{question.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-center space-x-4">
        <Link to="/dashboard" className="btn btn-outline">
          Back to Dashboard
        </Link>
        <Link to={`/tests/${id}/take`} className="btn btn-primary">
          Retake Test
        </Link>
      </div>
    </div>
  );
};

export default TestReport;