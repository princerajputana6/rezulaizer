'use client';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from '@/lib/router-compat';
import { Eye, EyeOff, Mail, Lock, ClipboardList, Clock, Shield, CheckCircle } from 'lucide-react';
import { candidateApiClient } from '../../services/candidateApiClient';

const CandidateLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeParams = useParams();
  const params = new URLSearchParams(location.search);
  // Decode token to handle Google click-tracker URL wrapping (double-encoded URLs)
  const rawToken = params.get('token') || routeParams.token;
  const token = rawToken ? decodeURIComponent(rawToken) : null;
  const initialTestId = params.get('testId');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [candidateInfo, setCandidateInfo] = useState(null);
  // Start as true so we show the spinner immediately on mount (prevents blank screen)
  const [validatingToken, setValidatingToken] = useState(true);

  useEffect(() => {
    localStorage.removeItem('candidate_token');
    if (token) {
      validateToken();
    } else {
      setError('No assessment token provided. Please use the link from your email.');
      setValidatingToken(false);
    }
  }, [token]);

  const validateToken = async () => {
    setValidatingToken(true);
    setError('');
    try {
      const response = await candidateApiClient.get(`/candidates/assessment/validate/${token}`);
      if (response.data.success) {
        const candidate = response.data.data;
        setCandidateInfo(candidate);
        setEmail(candidate.email);
      } else {
        setError(response.data.message || 'Invalid assessment token');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired assessment token');
    } finally {
      setValidatingToken(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!token) { setError('Assessment token is missing'); setLoading(false); return; }
    try {
      const res = await candidateApiClient.post('/candidates/assessment/login', { token, email, password });
      if (res.data?.success && res.data?.data?.sessionToken) {
        localStorage.setItem('candidate_token', res.data.data.sessionToken);
        localStorage.setItem('candidate_info', JSON.stringify(res.data.data));
        sessionStorage.setItem('assessment_token', token);

        try {
          let testIdToCheck = initialTestId;
          if (!testIdToCheck && token) {
            const v = await candidateApiClient.get(`/candidates/assessment/validate/${token}`);
            const first = v.data?.data?.pendingTests?.[0];
            const t = first?.testId;
            const derivedId = t && typeof t === 'object' ? (t._id || t.id) : t;
            if (derivedId) testIdToCheck = derivedId;
          }
          if (testIdToCheck) {
            try {
              const resultsRes = await candidateApiClient.get(`/tests/${testIdToCheck}/results`);
              if (resultsRes.data?.success && resultsRes.data?.data?.attempt) {
                const attempt = resultsRes.data.data.attempt;
                try { sessionStorage.setItem('dash_test_id', testIdToCheck); sessionStorage.setItem('dash_attempt_id', attempt._id || attempt.id); } catch {}
                navigate('/assessment/dashboard'); return;
              }
            } catch (e) {}
          }
        } catch (checkErr) {}

        const nextUrl = initialTestId
          ? `/assessment/precautions?testId=${initialTestId}&token=${token}`
          : `/assessment/precautions?token=${token}`;
        navigate(nextUrl);
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen flex">
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 items-center justify-center">
          <div className="text-center">
            <img src="/logo.png" alt="Rezulyzer" className="h-12 w-auto mx-auto mb-8" />
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-blue-300 text-sm">Verifying your invitation...</p>
          </div>
        </div>
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold text-gray-900">Validating Assessment Token</h2>
            <p className="text-sm text-gray-500 mt-2">Please wait while we verify your invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-40 w-72 h-72 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 w-full">
          <img src="/logo.png" alt="Rezulyzer" className="h-12 w-auto mb-12" />

          <h1 className="text-5xl font-bold text-white mb-6">
            Assessment
            <span className="block mt-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              Portal
            </span>
          </h1>

          <p className="text-xl text-gray-300 mb-12 max-w-md">
            You've been invited to take an online assessment. Complete it to move forward in your application.
          </p>

          <div className="space-y-6">
            {[
              { icon: ClipboardList, text: 'AI-Powered Assessment Questions' },
              { icon: Clock, text: 'Timed & Auto-Submitted' },
              { icon: Shield, text: 'Secure & Anti-Cheat Enabled' },
              { icon: CheckCircle, text: 'Instant Results & Feedback' },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-4 text-gray-300">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <feature.icon className="w-5 h-5 text-blue-400" />
                </div>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <img src="/logo.png" alt="Rezulyzer" className="h-10 w-auto" />
          </div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900">Assessment Login</h2>
            <p className="mt-2 text-sm text-gray-600">
              {candidateInfo
                ? `Welcome back, ${candidateInfo.name}! Enter your credentials to begin.`
                : 'Use the credentials from your invitation email to sign in.'}
            </p>
          </div>

          {/* Candidate info banner */}
          {candidateInfo && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {candidateInfo.name?.[0] || '?'}
                </div>
                <div>
                  <p className="font-semibold text-blue-900">{candidateInfo.name}</p>
                  <p className="text-sm text-blue-700">
                    {candidateInfo.pendingTests?.length || 0} pending assessment(s)
                  </p>
                </div>
              </div>
              {candidateInfo.tokenExpiry && (
                <p className="text-xs text-blue-500 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Invitation valid until: {new Date(candidateInfo.tokenExpiry).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                </p>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          {candidateInfo && (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Pre-filled from your invitation</p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Password from your email"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword
                      ? <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      : <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Use the password provided in your assessment email</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-500/30"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Start Assessment →'
                )}
              </button>
            </form>
          )}

          {/* No token / error state */}
          {!candidateInfo && !validatingToken && (
            <div className="text-center py-6">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {error
                  ? 'There was a problem verifying your invitation link. Please try copying and pasting the full URL from your email directly into the browser address bar.'
                  : 'No valid invitation found. Please use the link from your assessment email, or contact your recruiter.'}
              </p>
              {token && (
                <button
                  onClick={validateToken}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          <p className="text-center text-xs text-gray-400">
            Powered by <span className="font-semibold text-gray-600">Rezulyzer</span> · AI-Powered Hiring Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default CandidateLogin;