'use client';
import React, { useState, useRef } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { 
  Upload, 
  X, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  ArrowLeft,
  Plus,
  Trash2
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { showToast } from '../../redux/slices/toastSlice';
import { apiClient } from '../../services/apiClient';

const AddCandidatePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Remove manual candidate info - will be extracted from resume

  const allowedFileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  const maxFileSize = 5 * 1024 * 1024; // 5MB

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
      e.target.value = null;
    }
  };

  const handleFiles = (files) => {
    const validFiles = [];
    const errors = [];

    files.forEach(file => {
      // Check file type
      if (!allowedFileTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Please upload PDF, DOC, DOCX, or TXT files.`);
        return;
      }

      // Check file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: File too large. Maximum size is 5MB.`);
        return;
      }

      // Check for duplicates
      if (uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
        errors.push(`${file.name}: File already uploaded.`);
        return;
      }

      validFiles.push({
        file,
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending',
        progress: 0
      });
    });

    if (errors.length > 0) {
      errors.forEach(error => {
        dispatch(showToast({
          message: error,
          type: 'error'
        }));
      });
    }

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      uploadFiles(validFiles);
    }
  };

  const uploadFiles = async (filesToUpload) => {
    setUploading(true);

    for (const fileObj of filesToUpload) {
      try {
        // Update file status to uploading
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileObj.id 
              ? { ...f, status: 'uploading', progress: 0 }
              : f
          )
        );

        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === fileObj.id 
                ? { ...f, progress }
                : f
            )
          );
        }

        // Upload resume for automatic parsing and candidate creation
        const formData = new FormData();
        formData.append('resume', fileObj.file);
        
        const response = await apiClient.post('/api/candidates/parse-resume', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        // Update file status to completed
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileObj.id 
              ? { ...f, status: 'completed', progress: 100, candidateId: response?.data?.data?._id }
              : f
          )
        );

        const candidateData = response?.data?.data;
        const candidateName = candidateData?.candidate ? 
          `${candidateData.candidate.firstName} ${candidateData.candidate.lastName}` : 
          'Candidate';
        
        dispatch(showToast({
          message: `${fileObj.name} processed successfully - ${candidateName} ${candidateData?.isNewCandidate ? 'created' : 'updated'}`,
          type: 'success'
        }));

      } catch (error) {
        // If candidate already exists for this email, mark as duplicate and offer navigation
        if (error?.response?.status === 409 || error?.response?.data?.error === 'DUPLICATE_EMAIL') {
          const candidateId = error?.response?.data?.data?.candidateId;
          const duplicateEmail = error?.response?.data?.duplicateValue || 'this email';
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === fileObj.id 
                ? { ...f, status: 'duplicate', progress: 100, candidateId }
                : f
            )
          );
          dispatch(showToast({
            message: error?.response?.data?.message || `Candidate with email ${duplicateEmail} already exists`,
            type: 'warning'
          }));
        } else {
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === fileObj.id 
                ? { ...f, status: 'error', progress: 0 }
                : f
            )
          );
          const errorMessage = error?.response?.data?.message || `Failed to upload ${fileObj.name}`;
          const errorDetails = error?.response?.data?.details;
          const errorString = errorDetails ? `${errorMessage} ${errorDetails}` : errorMessage;
          dispatch(showToast({
            message: errorString,
            type: 'error'
          }));
        }
      }
    }

    setUploading(false);
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('text')) return '📋';
    return '📄';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'duplicate':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'uploading':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const handleSubmit = () => {

    const completedFiles = uploadedFiles.filter(f => f.status === 'completed');
    
    if (completedFiles.length === 0) {
      dispatch(showToast({
        message: 'Please upload at least one resume',
        type: 'error'
      }));
      return;
    }

    dispatch(showToast({
      message: `${completedFiles.length} candidate(s) added successfully`,
      type: 'success'
    }));
    
    // Navigate to candidates page to view the newly added candidates
    navigate('/candidates');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/candidates')}
          className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add Candidates</h1>
          <p className="text-gray-600 mt-2">Upload resumes to automatically create candidate profiles. Information will be extracted from resumes and files organized in Supabase Storage.</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-start">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-1">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">How it works</h3>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>• Upload one or multiple resume files (PDF, DOC, DOCX, TXT)</li>
              <li>• Our AI will automatically extract candidate information from resumes</li>
              <li>• Candidate profiles will be created with parsed data (name, email, phone, etc.)</li>
              <li>• Files will be organized in separate folders by candidate email in Supabase Storage</li>
              <li>• You can review and edit candidate profiles after creation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Drop your resume files here
              </h3>
              <p className="text-gray-600 mb-4">
                or click to browse your files
              </p>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Choose Files
              </button>
            </div>
            
            <div className="text-sm text-gray-500">
              <p>Supported formats: PDF, DOC, DOCX, TXT</p>
              <p>Maximum file size: 5MB per file</p>
            </div>
          </div>
        </div>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Uploaded Files ({uploadedFiles.length})
          </h3>
          
          <div className="space-y-3">
            {uploadedFiles.map((fileObj) => (
              <div key={fileObj.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getFileIcon(fileObj.type)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{fileObj.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(fileObj.size)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {fileObj.status === 'uploading' && (
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fileObj.progress}%` }}
                      ></div>
                    </div>
                  )}
                  
                  {getStatusIcon(fileObj.status)}

                  {fileObj.status === 'duplicate' && fileObj.candidateId && (
                    <button
                      onClick={() => navigate(`/candidates/${fileObj.candidateId}`)}
                      className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                    >
                      View Candidate
                    </button>
                  )}

                  <button
                    onClick={() => removeFile(fileObj.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    disabled={fileObj.status === 'uploading'}
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">How it works</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• Upload one or multiple resume files</p>
          <p>• Our AI will automatically extract candidate information</p>
          <p>• Candidate profiles will be created with parsed data</p>
          <p>• You can review and edit profiles after creation</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/candidates')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setUploadedFiles([])}
            className="px-4 py-2 text-red-600 hover:text-red-800 transition-colors"
            disabled={uploading || uploadedFiles.length === 0}
          >
            Clear All
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={uploading || uploadedFiles.filter(f => f.status === 'completed').length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Processing...' : 'Create Candidates'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCandidatePage;