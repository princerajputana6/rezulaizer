'use client';
import React, { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useSelector } from 'react-redux';
import { selectToken, selectIsAuthenticated, selectCurrentUser } from '../redux/slices/authSlice';
import { apiClient } from '../services/apiClient';
import CompanyCreatedModal from '../components/CompanyCreatedModal';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  Lock, 
  CreditCard,
  Save,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';

const AddCompany = () => {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdCompanyData, setCreatedCompanyData] = useState(null);
  
  // Get auth state from Redux
  const token = useSelector(selectToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  
  // Debug auth state
  console.log('Auth Debug:', {
    hasToken: !!token,
    isAuthenticated,
    userRole: currentUser?.role,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'No token'
  });

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      console.warn('Not authenticated, redirecting to login');
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  const [formData, setFormData] = useState({
    companyName: '',
    domain: '',
    industry: '',
    size: '',
    contactPerson: {
      name: '',
      email: ''
    },
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    },
    subscriptionPlan: 'basic',
    credits: 100,
    isActive: true
  });

  const subscriptionPlans = [
    { value: 'basic', label: 'Basic Plan', description: '100 tests/month' },
    { value: 'standard', label: 'Standard Plan', description: '500 tests/month' },
    { value: 'premium', label: 'Premium Plan', description: '1000 tests/month' },
    { value: 'enterprise', label: 'Enterprise Plan', description: 'Unlimited tests' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.domain.trim()) {
      newErrors.domain = 'Company domain is required';
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(formData.domain)) {
      newErrors.domain = 'Please enter a valid domain (e.g., company.com)';
    }

    if (!formData.contactPerson.name.trim()) {
      newErrors['contactPerson.name'] = 'Contact person name is required';
    }

    if (!formData.contactPerson.email.trim()) {
      newErrors['contactPerson.email'] = 'Contact person email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.contactPerson.email)) {
      newErrors['contactPerson.email'] = 'Contact person email must be valid';
    }

    if (!formData.industry) {
      newErrors.industry = 'Please select an industry';
    }

    if (!formData.size) {
      newErrors.size = 'Please select company size';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.address.city.trim()) {
      newErrors['address.city'] = 'City is required';
    }

    if (!formData.address.country.trim()) {
      newErrors['address.country'] = 'Country is required';
    }

    if (formData.credits < 0) {
      newErrors.credits = 'Credits cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Transform form data to match server expectations
      const serverData = {
        name: formData.companyName,
        domain: formData.domain,
        description: `${formData.industry} company`,
        industry: formData.industry,
        website: `https://${formData.domain}`,
        address: formData.address,
        contact: {
          email: formData.contactPerson.email,
          phone: formData.phone
        }
      };

      console.log('Sending data to server:', serverData);
      const response = await apiClient.post('/companies', serverData);

      if (response.data.success) {
        // Show success modal with generated credentials
        // Transform backend response to match modal expectations
        const modalData = {
          company: {
            companyName: formData.companyName,
            email: response.data.data.adminEmail || formData.contactPerson.email,
            contactPerson: formData.contactPerson,
            industry: formData.industry,
            ...response.data.data
          },
          temporaryPassword: response.data.data.temporaryPassword
        };
        setCreatedCompanyData(modalData);
        setShowSuccessModal(true);
      } else {
        setErrors({ general: response.data.message || 'Failed to create company' });
      }
    } catch (error) {
      console.error('Error creating company:', error);
      
      if (error.response?.data?.errors) {
        // Handle validation errors from express-validator
        const validationErrors = {};
        error.response.data.errors.forEach(err => {
          validationErrors[err.field || err.param] = err.message || err.msg;
        });
        setErrors(validationErrors);
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: 'Network error. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => navigate('/companies')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Companies
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Company</h1>
            <p className="text-gray-600">Create a new company account with admin access</p>
          </div>
        </div>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{errors.general}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Company Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Company Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.companyName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter company name"
              />
              {errors.companyName && (
                <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person Name *
              </label>
              <input
                type="text"
                name="contactPerson.name"
                value={formData.contactPerson.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors['contactPerson.name'] ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter contact person name"
              />
              {errors['contactPerson.name'] && (
                <p className="mt-1 text-sm text-red-600">{errors['contactPerson.name']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  name="contactPerson.email"
                  value={formData.contactPerson.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors['contactPerson.email'] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter contact person email"
                />
              </div>
              {errors['contactPerson.email'] && (
                <p className="mt-1 text-sm text-red-600">{errors['contactPerson.email']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry *
              </label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.industry ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select Industry</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Education">Education</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Retail">Retail</option>
                <option value="Consulting">Consulting</option>
                <option value="Government">Government</option>
                <option value="Non-profit">Non-profit</option>
                <option value="Other">Other</option>
              </select>
              {errors.industry && (
                <p className="mt-1 text-sm text-red-600">{errors.industry}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Size *
              </label>
              <select
                name="size"
                value={formData.size}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.size ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select Company Size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501-1000">501-1000 employees</option>
                <option value="1000+">1000+ employees</option>
              </select>
              {errors.size && (
                <p className="mt-1 text-sm text-red-600">{errors.size}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Domain *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  name="domain"
                  value={formData.domain}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.domain ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., company.com"
                />
              </div>
              {errors.domain && (
                <p className="mt-1 text-sm text-red-600">{errors.domain}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter phone number"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Address Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter street address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                name="address.city"
                value={formData.address.city}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors['address.city'] ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter city"
              />
              {errors['address.city'] && (
                <p className="mt-1 text-sm text-red-600">{errors['address.city']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State/Province
              </label>
              <input
                type="text"
                name="address.state"
                value={formData.address.state}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter state/province"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country *
              </label>
              <input
                type="text"
                name="address.country"
                value={formData.address.country}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors['address.country'] ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter country"
              />
              {errors['address.country'] && (
                <p className="mt-1 text-sm text-red-600">{errors['address.country']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP/Postal Code
              </label>
              <input
                type="text"
                name="address.zipCode"
                value={formData.address.zipCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter ZIP/postal code"
              />
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Account Settings
          </h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Lock className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">System Generated Password</h4>
                <p className="text-sm text-blue-600">A secure password will be automatically generated and sent to the company email upon creation.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription & Credits */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Subscription & Credits
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subscription Plan
              </label>
              <select
                name="subscriptionPlan"
                value={formData.subscriptionPlan}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {subscriptionPlans.map(plan => (
                  <option key={plan.value} value={plan.value}>
                    {plan.label} - {plan.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Credits
              </label>
              <input
                type="number"
                name="credits"
                value={formData.credits}
                onChange={handleInputChange}
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.credits ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter initial credits"
              />
              {errors.credits && (
                <p className="mt-1 text-sm text-red-600">{errors.credits}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Activate company account immediately
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate('/companies')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Create Company</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Success Modal */}
      <CompanyCreatedModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate('/companies');
        }}
        companyData={createdCompanyData}
      />
    </div>
  );
};

export default AddCompany;