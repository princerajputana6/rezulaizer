'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from '@/lib/router-compat';
import { candidateApiClient } from '../../services/candidateApiClient';

const TakeAssessment = () => {
  const { testId, token } = useParams();
  const resolvedTestId = testId || token;
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState(0);
  const [warnMessage, setWarnMessage] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionTimers, setQuestionTimers] = useState([]); // 60s per question
  const tickRef = useRef(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  const ensureFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) return;
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn('Failed to enter fullscreen:', e);
    }
  }, []);

  // Keep screen awake if supported
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLock.addEventListener?.('release', () => {
            console.log('Wake Lock was released');
          });
        }
      } catch (e) {
        console.warn('Wake Lock not available:', e);
      }
    };
    requestWakeLock();
    return () => {
      try {
        wakeLock && wakeLock.release && wakeLock.release();
      } catch (releaseErr) {
        console.warn('Wake lock release failed:', releaseErr);
      }
    };
  }, []);

  const sendFlag = useCallback(async (type) => {
    try {
      if (!attempt) return;
      const res = await candidateApiClient.post(`/tests/${resolvedTestId}/flag`, {
        attemptId: attempt._id,
        type,
        occurredAt: new Date().toISOString()
      });
      if (res.data?.data?.auto_submitted) {
        // Exit fullscreen and navigate out
        if (document.exitFullscreen) {
          try {
            await document.exitFullscreen();
          } catch (fullscreenErr) {
            console.warn('Failed to exit fullscreen after auto-submit:', fullscreenErr);
          }
        }
        // Redirect candidate to their dashboard after auto-submission
        try {
          sessionStorage.setItem('dash_test_id', resolvedTestId);
          if (attempt?._id) sessionStorage.setItem('dash_attempt_id', attempt._id);
        } catch (sessionErr) {
          console.warn('Failed to persist dashboard session data:', sessionErr);
        }
        navigate('/assessment/dashboard');
      }
    } catch (e) {
      // Non-blocking
      console.warn('Proctor flag failed', e);
    }
  }, [attempt, resolvedTestId, navigate]);

  useEffect(() => {
    // Try to enter fullscreen ASAP (still relies on prior user gesture from Precautions page)
    ensureFullscreen();

    const onChange = () => {
      if (!document.fullscreenElement) {
        // Immediately try to re-enter fullscreen
        ensureFullscreen();
        setWarnings((w) => w + 1);
        setWarnMessage('Fullscreen was exited. Please remain in fullscreen during the assessment.');
        sendFlag('fullscreen_exit');
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setWarnings((w) => w + 1);
        setWarnMessage('Tab/window switch detected. Please stay on the test page.');
        sendFlag('tab_switch');
      }
    };
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const onCopy = () => {
      setWarnings((w) => w + 1);
      setWarnMessage('Copy action detected. Copy/paste is not allowed during the assessment.');
      sendFlag('copy_paste');
    };
    const onPaste = () => {
      setWarnings((w) => w + 1);
      setWarnMessage('Paste action detected. Copy/paste is not allowed during the assessment.');
      sendFlag('copy_paste');
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('copy', onCopy);
    window.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('copy', onCopy);
      window.removeEventListener('paste', onPaste);
    };
  }, [ensureFullscreen, sendFlag]);

  // Compute the per-question time allotment based on type/tags. Honors
  // test.settings.timing as an override (set per-job by HR).
  const allottedSecondsFor = (q) => {
    const timing = test?.settings?.timing || {};
    const mcqS = Number(timing.mcqSeconds) || 60;
    const outputS = Number(timing.outputSeconds) || 120;
    const practicalS = Number(timing.practicalSeconds) || 600;
    const t = (q?.type || '').toLowerCase();
    const tags = (q?.tags || []).map((x) => String(x).toLowerCase());
    if (t === 'multiple-choice' || t === 'mcq' || t === 'true-false') return mcqS;
    if (t === 'coding' || tags.includes('practical')) return practicalS;
    if (tags.includes('output-based') || tags.includes('output')) return outputS;
    if (Array.isArray(q?.options) && q.options.length > 0) return mcqS;
    return outputS;
  };

  useEffect(() => {
    const fetchTestOnly = async () => {
      setLoading(true);
      setError('');
      try {
        // Ensure fullscreen before network calls to minimize flicker
        await ensureFullscreen();
        const testRes = await candidateApiClient.get(`/tests/${resolvedTestId}`);
        if (!testRes.data?.data?.test) throw new Error('Unable to fetch test');
        const t = testRes.data.data.test;
        setTest(t);
        const qs = (t?.questionsPopulated || t?.questions || []);
        if (qs.length > 0) setQuestionTimers(qs.map(allottedSecondsFor));
        setHasStarted(false);
      } catch (e) {
        console.error(e);
        setError(e?.response?.data?.message || e.message || 'Failed to start assessment');
      } finally {
        setLoading(false);
      }
    };

    fetchTestOnly();
  }, [resolvedTestId, ensureFullscreen]);

  // Start attempt explicitly when user clicks Start
  const handleStart = async () => {
    if (!test) return;
    try {
      setSubmitting(true);
      const startRes = await candidateApiClient.post(`/tests/${resolvedTestId}/start`);
      if (!startRes.data?.data) throw new Error('Unable to start test');
      setAttempt(startRes.data.data.attempt || startRes.data.data);
      const qs = (test?.questionsPopulated || test?.questions || []);
      if (!questionTimers || questionTimers.length === 0) {
        setQuestionTimers(qs.map(allottedSecondsFor));
      }
      setHasStarted(true);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to start assessment');
    } finally {
      setSubmitting(false);
    }
  };

  // Per-question ticking — pure decrement, no side effects in updater.
  // (StrictMode runs state-updater functions twice to detect impurity, so
  // calling setCurrentIndex/handleSubmit inside setQuestionTimers used to
  // advance the index by 2 and skip a question.)
  useEffect(() => {
    if (!attempt || !hasStarted) return;
    if (!Array.isArray(questionTimers) || questionTimers.length === 0) return;
    tickRef.current = setInterval(() => {
      setQuestionTimers(prev => {
        if (!prev || prev.length === 0) return prev;
        const next = [...prev];
        const current = next[currentIndex] ?? 60;
        next[currentIndex] = Math.max(0, current - 1);
        return next;
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [attempt, hasStarted, currentIndex, questionTimers.length]);

  // Auto-advance / auto-submit when the current question's timer reaches 0.
  // Lives in its own effect so the advance side effect runs exactly once.
  const submittedRef = useRef(false);
  const advancingRef = useRef(false);
  useEffect(() => {
    if (!hasStarted || !attempt) return;
    const total = (test?.questionsPopulated || test?.questions || []).length || 0;
    if (total === 0) return;
    const t = questionTimers[currentIndex];
    if (t !== 0) return;
    if (advancingRef.current) return;
    advancingRef.current = true;
    if (currentIndex < total - 1) {
      setCurrentIndex(i => i + 1);
      // Reset guard on next tick once the new index is settled
      setTimeout(() => { advancingRef.current = false; }, 50);
    } else if (!submittedRef.current) {
      submittedRef.current = true;
      handleSubmit();
    }
  }, [questionTimers, currentIndex, hasStarted, attempt, test]);

  // Debounced per-question save timers (so typing in a textarea doesn't
  // fire one POST per keystroke). MCQs save immediately; text answers wait
  // 1.2s of inactivity.
  const saveTimersRef = useRef({});

  const flushAnswer = useCallback(async (questionId, value) => {
    if (!attempt?._id) return;
    try {
      await candidateApiClient.post(`/tests/${resolvedTestId}/answer`, {
        attemptId: attempt._id,
        questionId,
        answer: value,
      });
    } catch (e) {
      console.warn('Save answer failed', e?.response?.data?.message || e?.message);
    }
  }, [attempt, resolvedTestId]);

  const handleAnswer = (questionId, optionIdOrLetter) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdOrLetter }));

    const isLong = typeof optionIdOrLetter === 'string' && optionIdOrLetter.length > 20;

    // Cancel any pending save for this question
    const pending = saveTimersRef.current[questionId];
    if (pending) clearTimeout(pending);

    if (!isLong) {
      // MCQ click / short answer → save right away
      flushAnswer(questionId, optionIdOrLetter);
    } else {
      // Long-form (textarea) → debounce 1.2s of inactivity
      saveTimersRef.current[questionId] = setTimeout(() => {
        flushAnswer(questionId, optionIdOrLetter);
        delete saveTimersRef.current[questionId];
      }, 1200);
    }
  };

  // On unmount, flush any pending debounced saves
  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  const handleSubmit = async () => {
    if (!attempt) return;
    if (submittedRef.current) return; // guard against double-submit (manual + auto)
    submittedRef.current = true;
    setSubmitting(true);
    setError('');

    const finishUp = async (returnedAttemptId) => {
      if (document.exitFullscreen) {
        try { await document.exitFullscreen(); } catch (_) {}
      }
      setShowThanks(true);
      setTimeout(() => {
        try {
          sessionStorage.setItem('dash_test_id', resolvedTestId);
          sessionStorage.setItem('dash_attempt_id', returnedAttemptId || attempt._id);
        } catch (_) {}
        navigate('/assessment/dashboard');
      }, 1500);
    };

    try {
      // Cancel any pending debounced saves and flush the latest value of each
      // answer ourselves before final submit. Failures are non-fatal.
      Object.values(saveTimersRef.current).forEach((t) => clearTimeout(t));
      saveTimersRef.current = {};
      const flushPromises = Object.keys(answers).map((questionId) =>
        candidateApiClient
          .post(`/tests/${resolvedTestId}/answer`, {
            attemptId: attempt._id,
            questionId,
            answer: answers[questionId],
          })
          .catch(() => {})
      );
      await Promise.all(flushPromises);

      // Final submit
      const submitRes = await candidateApiClient.post(`/tests/${resolvedTestId}/submit`, {
        attemptId: attempt._id,
      });
      if (submitRes.data?.success) {
        await finishUp(submitRes.data?.data?.attempt?.id);
      } else {
        throw new Error(submitRes.data?.message || 'Submission failed');
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || '';
      const status = e?.response?.status;
      // If the server says the attempt is already not in_progress, treat that
      // as "already submitted" and proceed to the dashboard so candidates
      // never see a hard error after auto-submit fired.
      if (status === 400 && /not active|already/i.test(msg)) {
        await finishUp(attempt._id);
        return;
      }
      // Detailed log for debugging
      // eslint-disable-next-line no-console
      console.error('Submit error', {
        status,
        msg,
        responseData: e?.response?.data,
        url: e?.config?.url,
      });
      submittedRef.current = false; // allow retry
      const detail = status ? ` (HTTP ${status})` : '';
      setError(`${msg || 'Failed to submit assessment'}${detail}. Please try again — your answers are saved.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-gray-600">Preparing your assessment...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white p-6 rounded shadow">
          <div className="text-red-600 mb-4">{error}</div>
          <button onClick={() => navigate('/assessment/login')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded px-4 py-2">Back</button>
        </div>
      </div>
    );
  }

  // Normalize questions array
  const questions = (test?.questionsPopulated || test?.questions || []).map(q => q.question ? q : q);
  const total = questions.length;
  const current = questions[currentIndex] || {};
  const qId = current._id || current.id;
  const options = current.options || [];

  // Determine the canonical question kind so we can pick the right input UI
  // and the right per-question time budget.
  //   - mcq         → 60s   (1 min)
  //   - output      → 120s  (2 min)  — essay tagged 'output-based'
  //   - practical   → 600s  (10 min) — coding type or essay tagged 'practical'
  const rawType = (current.type || '').toLowerCase();
  const tags = (current.tags || []).map((t) => String(t).toLowerCase());
  let qKind = 'text';
  if (rawType === 'multiple-choice' || rawType === 'mcq' || rawType === 'true-false') {
    qKind = 'mcq';
  } else if (rawType === 'coding' || tags.includes('practical')) {
    qKind = 'practical';
  } else if (tags.includes('output-based') || tags.includes('output')) {
    qKind = 'output';
  } else if (options.length > 0) {
    qKind = 'mcq';
  } else {
    qKind = 'output'; // default essay = treat as output
  }
  const defaultSecondsByKind = { mcq: 60, output: 120, practical: 600, text: 60 };
  const allotted = defaultSecondsByKind[qKind] || 60;
  const currentSeconds = questionTimers[currentIndex] ?? allotted;
  const progress = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  // Pre-start instruction screen
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-3xl mx-auto bg-white rounded shadow p-6">
          <h1 className="text-2xl font-bold mb-2">{test?.title || 'Assessment'}</h1>
          <p className="text-gray-600 mb-6">Please review the instructions below before starting your assessment.</p>
          {(() => {
            const qs = questions;
            const totalSeconds = qs.reduce((s, q) => s + allottedSecondsFor(q), 0);
            const totalMinutes = Math.ceil(totalSeconds / 60);
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded border">
                  <div className="text-sm text-gray-500">Total Questions</div>
                  <div className="text-2xl font-semibold">{total}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded border">
                  <div className="text-sm text-gray-500">Time Per Question</div>
                  <div className="text-base font-semibold">MCQ 1m • Output 2m • Coding 10m</div>
                </div>
                <div className="p-4 bg-gray-50 rounded border">
                  <div className="text-sm text-gray-500">Total Estimated Time</div>
                  <div className="text-2xl font-semibold">{totalMinutes} min</div>
                </div>
              </div>
            );
          })()}
          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">Instructions</h2>
            <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
              <li>Stay in fullscreen during the assessment.</li>
              <li>Time per question depends on the type — MCQ 1 minute, output-based 2 minutes, coding 10 minutes.</li>
              <li>Unanswered questions are skipped automatically when their time runs out.</li>
              <li>You cannot go back to previous questions.</li>
              <li>Your answers are saved automatically when selected.</li>
              <li>The test will submit automatically when the last question&apos;s time ends.</li>
            </ul>
          </div>
          <div className="flex justify-end">
            <button onClick={handleStart} disabled={submitting || total === 0} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded">
              {submitting ? 'Starting…' : (total === 0 ? 'No Questions Available' : 'Start Assessment')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded shadow p-6">
        {showThanks && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md text-center">
              <h2 className="text-xl font-semibold mb-2">Thank you!</h2>
              <p className="text-gray-700 mb-4">Thanks for taking the assessment. Our team will review your responses and get back to you soon.</p>
              <p className="text-sm text-gray-500">You will be redirected shortly...</p>
            </div>
          </div>
        )}
        {warnings > 0 && (
          <div className="mb-4 p-3 rounded border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm">
            Warning: {warnMessage} (Total warnings: {warnings})
          </div>
        )}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{test?.title || 'Assessment'}</h1>
              <p className="text-gray-600">Question {Math.min(currentIndex + 1, total)} of {total}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Time for this question</div>
              <div className={`text-xl font-mono ${currentSeconds <= 10 ? 'text-red-600' : currentSeconds <= 20 ? 'text-yellow-600' : 'text-green-600'}`}>{Math.floor(currentSeconds / 60)}:{String(currentSeconds % 60).padStart(2, '0')}</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 w-full bg-gray-200 rounded">
              <div className="h-2 bg-blue-600 rounded" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Single-question view */}
        <div className="space-y-6">
          <div key={qId} className="border rounded p-4">
            <div className="font-medium mb-3">{currentIndex + 1}. {current.question || 'Question'}</div>
            <div className="mb-2 text-xs text-gray-500">
              {qKind === 'mcq' && `Multiple choice • ${Math.round(allotted / 60)} min`}
              {qKind === 'output' && `Output-based • ${Math.round(allotted / 60)} min`}
              {qKind === 'practical' && `Coding / practical • ${Math.round(allotted / 60)} min`}
            </div>
            {qKind === 'mcq' && options.length > 0 ? (
              <div className="space-y-2">
                {options.map((opt, idx) => {
                  const key = opt._id || `${qId}-${idx}`;
                  const label = String.fromCharCode(65 + idx);
                  const value = opt._id || opt.text || label;
                  const selected = answers[qId] === value;
                  const text = opt.text || '';
                  return (
                    <label key={key} className={`flex items-center gap-3 p-2 rounded border ${selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                      <input
                        type="radio"
                        name={`q-${qId}`}
                        checked={selected}
                        onChange={() => handleAnswer(qId, value)}
                      />
                      <span><strong>{label}.</strong> {text}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {(current.code || current.codingDetails?.starterCode) && (
                  <pre className="bg-gray-900 text-gray-100 text-sm rounded p-3 overflow-x-auto">
                    {current.code || current.codingDetails?.starterCode}
                  </pre>
                )}
                <textarea
                  value={answers[qId] || ''}
                  onChange={(e) => handleAnswer(qId, e.target.value)}
                  placeholder={qKind === 'practical' ? 'Write your full solution here…' : qKind === 'output' ? 'What is the output? Explain briefly…' : 'Type your answer here…'}
                  rows={qKind === 'practical' ? 12 : qKind === 'output' ? 5 : 4}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          {currentIndex < (total - 1) ? (
            <button
              onClick={() => setCurrentIndex(i => i + 1)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded"
            >
              {submitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TakeAssessment;