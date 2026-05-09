'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@/lib/router-compat';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { showToast } from '../../redux/slices/toastSlice';
import { apiClient } from '../../services/apiClient';

const EditCandidatePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/candidates/${id}`);
        if (response.data.success) {
          setCandidate(response.data.data);
        } else {
          throw new Error('Failed to fetch candidate data');
        }
      } catch (error) {
        console.error('Error fetching candidate:', error);
        dispatch(showToast({ message: 'Failed to load candidate data.', type: 'error' }));
        navigate('/candidates');
      } finally {
        setLoading(false);
      }
    };
    fetchCandidate();
  }, [id, dispatch, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCandidate({ ...candidate, [name]: value });
  };

  const handleNestedChange = (section, index, e) => {
    const { name, value } = e.target;
    const updatedSection = [...candidate[section]];
    updatedSection[index] = { ...updatedSection[index], [name]: value };
    setCandidate({ ...candidate, [section]: updatedSection });
  };

  const addNestedItem = (section) => {
    const newItem = section === 'experience' ? { title: '', company: '', location: '', startDate: '', description: '' } : { institution: '', degree: '', startDate: '' };
    setCandidate({ ...candidate, [section]: [...candidate[section], newItem] });
  };

  const removeNestedItem = (section, index) => {
    const updatedSection = candidate[section].filter((_, i) => i !== index);
    setCandidate({ ...candidate, [section]: updatedSection });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/candidates/${id}`, candidate);
      dispatch(showToast({ message: 'Candidate updated successfully!', type: 'success' }));
      navigate(`/candidates/${id}`);
    } catch (error) {
      console.error('Error updating candidate:', error);
      dispatch(showToast({ message: 'Failed to update candidate.', type: 'error' }));
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(`/candidates/${id}`)} className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Candidate</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" name="name" value={candidate.name} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" name="email" value={candidate.email} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input type="text" name="phone" value={candidate.phone} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input type="text" name="location" value={candidate.location} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
          </div>
        </div>

        {/* Experience */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Work Experience</h2>
          {candidate.experience.map((exp, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 border-b pb-4">
              <input type="text" name="title" placeholder="Title" value={exp.title} onChange={(e) => handleNestedChange('experience', index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              <input type="text" name="company" placeholder="Company" value={exp.company} onChange={(e) => handleNestedChange('experience', index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              <input type="text" name="location" placeholder="Location" value={exp.location} onChange={(e) => handleNestedChange('experience', index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              <input type="date" name="startDate" placeholder="Start Date" value={exp.startDate ? new Date(exp.startDate).toISOString().split('T')[0] : ''} onChange={(e) => handleNestedChange('experience', index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              <textarea name="description" placeholder="Description" value={exp.description} onChange={(e) => handleNestedChange('experience', index, e)} className="md:col-span-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm"></textarea>
              <button type="button" onClick={() => removeNestedItem('experience', index)} className="text-red-500"><Trash2 /></button>
            </div>
          ))}
          <button type="button" onClick={() => addNestedItem('experience')} className="text-blue-500"><Plus /> Add Experience</button>
        </div>

        {/* Education */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Education</h2>
          {candidate.education.map((edu, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 border-b pb-4">
              <input type="text" name="institution" placeholder="Institution" value={edu.institution} onChange={(e) => handleNestedChange('education', index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              <input type="text" name="degree" placeholder="Degree" value={edu.degree} onChange={(e) => handleNestedChange('education', index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              <input type="date" name="startDate" placeholder="Start Date" value={edu.startDate ? new Date(edu.startDate).toISOString().split('T')[0] : ''} onChange={(e) => handleNestedChange('education', index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              <button type="button" onClick={() => removeNestedItem('education', index)} className="text-red-500"><Trash2 /></button>
            </div>
          ))}
          <button type="button" onClick={() => addNestedItem('education')} className="text-blue-500"><Plus /> Add Education</button>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCandidatePage;