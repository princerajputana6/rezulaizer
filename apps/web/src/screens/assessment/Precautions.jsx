'use client';
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from '@/lib/router-compat';
import { candidateApiClient } from '../../services/candidateApiClient';

const Precautions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeParams = useParams();
  const params = new URLSearchParams(location.search);
  const queryTestId = params.get('testId');
  const assessmentToken = params.get('token') || routeParams.token || sessionStorage.getItem('assessment_token');

  const [status, setStatus] = useState({ camera: false, microphone: false, location: false, fullscreen: false });
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [envInfo, setEnvInfo] = useState({ secureContext: true, inIframe: false, hints: [] });

  useEffect(() => {
    // Add listeners to discourage tab switch
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        console.warn('Tab hidden during precautions');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    // Environment diagnostics
    const hints = [];
    const secureContext = window.isSecureContext || location.hostname === 'localhost';
    const inIframe = (() => {
      try { return window.self !== window.top; } catch { return true; }
    })();

    if (!secureContext) {
      hints.push('Site is not in a secure context. Geolocation requires HTTPS (localhost is allowed).');
    }
    if (inIframe) {
      hints.push('Page appears embedded in an iframe. Ensure Permissions-Policy allows camera, microphone, geolocation, fullscreen.');
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      hints.push('MediaDevices API not available in this browser/context.');
    }
    if (!('geolocation' in navigator)) {
      hints.push('Geolocation API not available in this browser/context.');
    }

    setEnvInfo({ secureContext, inIframe, hints });
  }, [location]);

  const queryPermission = async (name) => {
    try {
      if (!navigator.permissions || !navigator.permissions.query) return null;
      const res = await navigator.permissions.query({ name });
      return res.state; // 'granted' | 'denied' | 'prompt'
    } catch {
      return null;
    }
  };

  const requestPermissions = async () => {
    setError('');
    setWorking(true);
    try {
      // Preflight check permissions when available
      const camPerm = await queryPermission('camera');
      const micPerm = await queryPermission('microphone');
      const geoPerm = await queryPermission('geolocation');

      // Request video first to isolate which permission fails
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setStatus((s) => ({ ...s, camera: true }));
      } catch (e) {
        console.error('Camera permission error', e);
        const msg = camPerm === 'denied'
          ? 'Camera permission is blocked. Please allow camera access in your browser site settings and reload.'
          : `Unable to access camera (${e.name}). Please allow access and try again.`;
        setError(msg);
        setWorking(false);
        return;
      }

      // Then request microphone
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setStatus((s) => ({ ...s, microphone: true }));
      } catch (e) {
        console.error('Microphone permission error', e);
        const msg = micPerm === 'denied'
          ? 'Microphone permission is blocked. Please allow microphone access in your browser site settings and reload.'
          : `Unable to access microphone (${e.name}). Please allow access and try again.`;
        setError(msg);
        setWorking(false);
        return;
      }

      // Request location
      await new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
        navigator.geolocation.getCurrentPosition(
          () => { setStatus((s) => ({ ...s, location: true })); resolve(); },
          (err) => { console.error('Location permission error', err); reject(err); },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      }).catch((geoErr) => {
        let msg = 'Please allow location permission to continue.';
        if (!envInfo.secureContext) {
          msg = 'Location requires HTTPS. Please use https (or localhost) and try again.';
        } else if (geoPerm === 'denied') {
          msg = 'Location permission is blocked. Please allow location access in your browser site settings and reload.';
        } else if (geoErr && geoErr.code === 1) {
          msg = 'Location permission denied by user. Please allow and try again.';
        }
        throw new Error(msg);
      });

      // Fullscreen
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setStatus((s) => ({ ...s, fullscreen: true }));
        }
      } catch (fsErr) {
        console.warn('Fullscreen request failed', fsErr);
        // Do not block flow on fullscreen failure
      }

      // Determine testId: use query or get from assessment token validation
      let testId = queryTestId;
      
      if (!testId && assessmentToken) {
        try {
          console.log('Fetching pending tests using assessment token:', assessmentToken.substring(0, 16) + '...');
          // Validate token and get pending tests
          const res = await candidateApiClient.get(`/candidates/assessment/validate/${assessmentToken}`);
          console.log('Token validation response:', res.data);
          
          if (res.data.success && Array.isArray(res.data.data?.pendingTests) && res.data.data.pendingTests.length > 0) {
            const firstTest = res.data.data.pendingTests[0];
            const t = firstTest?.testId;
            const derivedId = t && typeof t === 'object' ? (t._id || t.id) : t;
            if (derivedId) {
              testId = derivedId;
              console.log('Found pending test:', testId);
            } else {
              console.warn('Pending test has no valid testId shape:', firstTest);
              setError('Assigned test reference is invalid. Please contact your administrator.');
              setWorking(false);
              return;
            }
          } else {
            console.log('No pending tests found in validation response:', res.data);
            setError('No pending assessments were found for this invitation. Please contact your administrator.');
            setWorking(false);
            return;
          }
        } catch (e) {
          console.error('Token validation request failed:', e);
          console.error('Error response:', e.response?.data);
          
          // If token validation fails, show specific error message
          if (e.response?.status === 404) {
            setError(e.response.data.message || 'Invalid or expired assessment token');
          } else {
            setError('Failed to validate assessment token. Please try again.');
          }
          setWorking(false);
          return;
        }
      } else if (!assessmentToken) {
        console.error('No assessment token available');
        setError('Assessment token is missing. Please use the link from your email.');
        setWorking(false);
        return;
      }
      
      if (!testId) {
        setError('No assigned test found. Please contact your administrator.');
        setWorking(false);
        return;
      }

      // Check if this test is already completed for this candidate
      try {
        const resultsRes = await candidateApiClient.get(`/tests/${testId}/results`);
        if (resultsRes.data?.success && resultsRes.data?.data?.attempt) {
          const attempt = resultsRes.data.data.attempt;
          // Already has a completed attempt; go to dashboard
          navigate(`/assessment/dashboard?testId=${testId}&attemptId=${attempt._id || attempt.id}`);
          return;
        }
      } catch (e) {
        // If 404 (no completed attempt), proceed to take test
      }

      navigate(`/assessment/take/${testId}`);
    } catch (err) {
      console.error('Permissions check failed:', err);
      setError(err.message || 'Failed to acquire permissions.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Before You Begin</h1>
        <p className="text-gray-600 mb-4">To ensure test integrity, we need the following permissions:</p>
        <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-700">
          <li>Camera and Microphone access for proctoring</li>
          <li>Location access for compliance</li>
          <li>Fullscreen mode to minimize distractions</li>
        </ul>
        {(envInfo.hints.length > 0) && (
          <div className="mb-4 p-3 rounded bg-yellow-50 text-yellow-800 text-sm">
            <div className="font-medium mb-1">Environment checks</div>
            <ul className="list-disc pl-5 space-y-1">
              {envInfo.hints.map((h, i) => (<li key={i}>{h}</li>))}
            </ul>
          </div>
        )}
        {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-sm">
          <div className={`p-3 rounded border ${status.camera ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>Camera: {status.camera ? 'Allowed' : 'Pending'}</div>
          <div className={`p-3 rounded border ${status.microphone ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>Mic: {status.microphone ? 'Allowed' : 'Pending'}</div>
          <div className={`p-3 rounded border ${status.location ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>Location: {status.location ? 'Allowed' : 'Pending'}</div>
          <div className={`p-3 rounded border ${status.fullscreen ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>Fullscreen: {status.fullscreen ? 'On' : 'Pending'}</div>
        </div>
        <button
          onClick={requestPermissions}
          disabled={working}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded px-4 py-2"
        >
          {working ? 'Preparing...' : 'Allow & Continue'}
        </button>
      </div>
    </div>
  );
};

export default Precautions;