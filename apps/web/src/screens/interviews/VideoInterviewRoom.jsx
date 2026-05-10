'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from '@/lib/router-compat';
import axios from 'axios';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  Settings,
  MessageCircle,
  User,
  Clock,
  Circle,
  Square,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const publicApi = axios.create({
  baseURL: (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || 'http://localhost:8000/api',
  timeout: 15000,
});

const VideoInterviewRoom = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  // Interview state
  const [interview, setInterview] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Media controls
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // AI Interviewer state
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  // Chat/Transcript
  const [transcript, setTranscript] = useState([]);
  const [showTranscript, setShowTranscript] = useState(false);
  
  // Media refs
  const localVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  
  // AI Questions based on resume/JD
  const [aiQuestions] = useState([
    "Hello! Welcome to your interview. Please introduce yourself and tell me about your background.",
    "Can you walk me through your most recent project and the technologies you used?",
    "Describe a challenging problem you faced in your previous role and how you solved it.",
    "What interests you most about this position and our company?",
    "How do you stay updated with the latest technologies in your field?",
    "Tell me about a time when you had to work with a difficult team member.",
    "Where do you see yourself in the next 3-5 years?",
    "Do you have any questions for me about the role or the company?"
  ]);

  useEffect(() => {
    validateTokenAndLoadInterview();
    initializeMedia();
    
    // Cleanup on unmount
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [token]);

  useEffect(() => {
    let interval;
    if (interviewStarted && !interviewEnded) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [interviewStarted, interviewEnded]);

  const validateTokenAndLoadInterview = async () => {
    try {
      setLoading(true);
      const response = await publicApi.get(`/candidates/video-interview/validate/${token}`);
      
      if (response.data.success) {
        const data = response.data.data;
        setCandidate(data.candidate);
        setInterview({ company: data.company });
      } else {
        setError('Invalid or expired interview link');
      }
    } catch (error) {
      console.error('Error validating token:', error);
      if (error.response?.status === 404) {
        setError('Invalid or expired interview link. This link may have already been used.');
      } else {
        setError('Failed to load interview. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      mediaStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setError('Please allow camera and microphone access to join the interview');
    }
  };

  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const startRecording = () => {
    if (mediaStreamRef.current) {
      recordedChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        uploadRecording(blob);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadRecording = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('recording', blob, `interview-${interview?.id}-${Date.now()}.webm`);
      formData.append('interviewId', interview?.id);
      formData.append('candidateId', candidate?.id);
      
      await apiClient.post('/interview-recordings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (error) {
      console.error('Error uploading recording:', error);
    }
  };

  const startInterview = () => {
    setInterviewStarted(true);
    startRecording();
    askNextQuestion();
    
    // Add welcome message to transcript
    addToTranscript('AI Interviewer', 'Welcome to your interview! I\'ll be asking you a series of questions. Please take your time to answer each one.');
  };

  const askNextQuestion = () => {
    if (questionIndex < aiQuestions.length) {
      const question = aiQuestions[questionIndex];
      setCurrentQuestion(question);
      setAiSpeaking(true);
      
      // Add question to transcript
      addToTranscript('AI Interviewer', question);
      
      // Simulate AI speaking (in real implementation, use text-to-speech)
      setTimeout(() => {
        setAiSpeaking(false);
      }, 2000);
      
      setQuestionIndex(prev => prev + 1);
    } else {
      endInterview();
    }
  };

  const addToTranscript = (speaker, message) => {
    setTranscript(prev => [...prev, {
      id: Date.now(),
      speaker,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const endInterview = async () => {
    setInterviewEnded(true);
    stopRecording();
    
    try {
      // Mark interview as completed
      await apiClient.post(`/video-interview-invitations/${token}/complete`, {
        duration: timeElapsed,
        transcript: transcript
      });
      
      addToTranscript('AI Interviewer', 'Thank you for your time! The interview has been completed. You can now close this window.');
    } catch (error) {
      console.error('Error completing interview:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Interview Error</h1>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Video className="w-6 h-6 text-primary-500" />
            <h1 className="text-white font-semibold">AI Interview</h1>
          </div>
          {interview && (
            <div className="text-gray-300 text-sm">
              {interview.title} - {interview.jobTitle}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {interviewStarted && (
            <div className="flex items-center space-x-2 text-white">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(timeElapsed)}</span>
            </div>
          )}
          
          {isRecording && (
            <div className="flex items-center space-x-2 text-red-500">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Recording</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 relative">
          {/* AI Avatar/Video */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center">
            <div className="text-center">
              <div className={`w-32 h-32 bg-primary-600 rounded-full flex items-center justify-center mb-4 mx-auto ${aiSpeaking ? 'animate-pulse' : ''}`}>
                <User className="w-16 h-16 text-white" />
              </div>
              <h3 className="text-white text-xl font-semibold mb-2">AI Interviewer</h3>
              {aiSpeaking && (
                <div className="flex items-center justify-center space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </div>
          </div>

          {/* Current Question Overlay */}
          {currentQuestion && interviewStarted && !interviewEnded && (
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg">
              <p className="text-lg">{currentQuestion}</p>
              <div className="mt-2 flex justify-between items-center">
                <span className="text-sm text-gray-300">Question {questionIndex} of {aiQuestions.length}</span>
                {questionIndex < aiQuestions.length && (
                  <button
                    onClick={askNextQuestion}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded text-sm"
                  >
                    Next Question
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Interview End Message */}
          {interviewEnded && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
              <div className="text-center text-white">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Interview Completed!</h2>
                <p className="text-gray-300 mb-4">Thank you for your time. Your responses have been recorded.</p>
                <button
                  onClick={() => window.close()}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Candidate Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!isVideoOn && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
            {candidate?.first_name} {candidate?.last_name}
          </div>
        </div>

        {/* Transcript Panel */}
        {showTranscript && (
          <div className="w-80 bg-gray-800 border-l border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold">Interview Transcript</h3>
            </div>
            <div className="p-4 h-full overflow-y-auto">
              <div className="space-y-3">
                {transcript.map(entry => (
                  <div key={entry.id} className="text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-medium ${entry.speaker === 'AI Interviewer' ? 'text-primary-400' : 'text-green-400'}`}>
                        {entry.speaker}
                      </span>
                      <span className="text-gray-500 text-xs">{entry.timestamp}</span>
                    </div>
                    <p className="text-gray-300">{entry.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-center space-x-4">
          {!interviewStarted ? (
            <button
              onClick={startInterview}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg flex items-center space-x-2 text-lg font-semibold"
            >
              <Video className="w-5 h-5" />
              <span>Start Interview</span>
            </button>
          ) : !interviewEnded ? (
            <>
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${isVideoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
                title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoOn ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />}
              </button>
              
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full ${isAudioOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
                title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isAudioOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
              </button>
              
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className={`p-3 rounded-full ${showTranscript ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                title="Toggle transcript"
              >
                <MessageCircle className="w-5 h-5 text-white" />
              </button>
              
              <button
                onClick={toggleFullscreen}
                className="p-3 rounded-full bg-gray-700 hover:bg-gray-600"
                title="Toggle fullscreen"
              >
                {isFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
              </button>
              
              <button
                onClick={endInterview}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2"
              >
                <Phone className="w-5 h-5" />
                <span>End Interview</span>
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default VideoInterviewRoom;