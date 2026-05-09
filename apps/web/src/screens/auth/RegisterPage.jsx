'use client';
import React, { useState } from 'react';
import { useNavigate, Link } from '@/lib/router-compat';
import { useDispatch } from 'react-redux';
import { 
  Eye, EyeOff, Mail, Lock, Building2, User, Phone, MapPin, 
  Globe, Users, Briefcase, ArrowRight, ArrowLeft, CheckCircle,
  Sparkles, Zap, TrendingUp
} from 'lucide-react';
import { showToast } from '../../redux/slices/toastSlice';
import { apiClient } from '../../services/apiClient';
import logo from '../../assets/images/rezulaizer.png';

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    domain: '',
    industry: '',
    size: '',
    contactPersonName: '',
    contactPersonEmail: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    password: '',
    confirmPassword: '',
    subscriptionPlan: 'basic',
    agreeToTerms: false
  });

  const [errors, setErrors] = useState({});

  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Education', 'Retail',
    'Manufacturing', 'Consulting', 'Other'
  ];

  const companySizes = [
    '1-10 employees', '11-50 employees', '51-200 employees',
    '201-500 employees', '501-1000 employees', '1000+ employees'
  ];

  const subscriptionPlans = [
    { value: 'basic', label: 'Basic', price: '$49/mo', features: ['100 tests/month', 'Basic support', '5 users'] },
    { value: 'standard', label: 'Standard', price: '$99/mo', features: ['500 tests/month', 'Priority support', '20 users'], popular: true },
    { value: 'premium', label: 'Premium', price: '$199/mo', features: ['1000 tests/month', '24/7 support', 'Unlimited users'] }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validateStep = (step) => {
    const newErrors = {};
    if (step === 1) {
      if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
      if (!formData.domain.trim()) newErrors.domain = 'Domain is required';
      else if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(formData.domain))
        newErrors.domain = 'Please enter a valid domain (e.g., company.com)';
      if (!formData.industry) newErrors.industry = 'Please select an industry';
      if (!formData.size) newErrors.size = 'Please select company size';
    }
    if (step === 2) {
      if (!formData.contactPersonName.trim()) newErrors.contactPersonName = 'Contact person name is required';
      if (!formData.contactPersonEmail.trim()) newErrors.contactPersonEmail = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.contactPersonEmail)) newErrors.contactPersonEmail = 'Please enter a valid email';
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    }
    if (step === 3) {
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.country.trim()) newErrors.country = 'Country is required';
    }
    if (step === 4) {
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
      if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => { if (validateStep(currentStep)) setCurrentStep(currentStep + 1); };
  const handleBack = () => { setCurrentStep(currentStep - 1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(4)) return;
    setIsLoading(true);
    try {
      const payload = {
        name: formData.companyName,
        domain: formData.domain,
        industry: formData.industry,
        size: formData.size,
        contactPerson: { name: formData.contactPersonName, email: formData.contactPersonEmail },
        phone: formData.phone,
        address: { street: formData.street, city: formData.city, state: formData.state, country: formData.country, zipCode: formData.zipCode },
        password: formData.password,
        subscriptionPlan: formData.subscriptionPlan,
        credits: 100,
        isActive: true
      };
      const response = await apiClient.post('/api/companies/register', payload);
      if (response.data.success) {
        dispatch(showToast({ message: 'Registration successful! Please check your email to verify your account.', type: 'success' }));
        navigate('/login');
      }
    } catch (error) {
      dispatch(showToast({ message: error.response?.data?.message || 'Registration failed. Please try again.', type: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Company Info', icon: Building2 },
    { number: 2, title: 'Contact Details', icon: User },
    { number: 3, title: 'Address', icon: MapPin },
    { number: 4, title: 'Account Setup', icon: Lock }
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-40 w-72 h-72 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        <div className="relative z-10 flex flex-col justify-center px-12 w-full">
          <Link to="/" className="mb-12"><img src={logo} alt="Rezulyzer" className="h-12 w-auto" /></Link>
          <h1 className="text-5xl font-bold text-white mb-6">
            Start Your<span className="block mt-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">Hiring Journey</span>
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-md">Join thousands of companies using AI to revolutionize their recruitment process.</p>
          <div className="space-y-6">
            {[
              { icon: Sparkles, text: 'AI-Powered Resume Analysis' },
              { icon: Zap, text: 'Smart Candidate Matching' },
              { icon: Users, text: 'Automated Screening' },
              { icon: TrendingUp, text: 'Real-time Analytics' }
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-4 text-gray-300">
                <div className="p-2 bg-blue-600/20 rounded-lg"><feature.icon className="w-5 h-5 text-blue-400" /></div>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="max-w-md w-full">
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/"><img src={logo} alt="Rezulyzer" className="h-10 w-auto" /></Link>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Already have an account? <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Sign in</Link>
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, idx) => (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      currentStep >= step.number ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      {currentStep > step.number ? <CheckCircle className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                    </div>
                    <span className="text-xs mt-2 text-gray-600 hidden sm:block">{step.title}</span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded ${currentStep > step.number ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gray-200'}`}></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Company Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" name="companyName" value={formData.companyName} onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.companyName ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Acme Corporation" />
                  </div>
                  {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Domain *</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" name="domain" value={formData.domain} onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.domain ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="acme.com" />
                  </div>
                  {errors.domain && <p className="text-red-500 text-sm mt-1">{errors.domain}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry *</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select name="industry" value={formData.industry} onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.industry ? 'border-red-500' : 'border-gray-300'}`}>
                      <option value="">Select industry</option>
                      {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                    </select>
                  </div>
                  {errors.industry && <p className="text-red-500 text-sm mt-1">{errors.industry}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Size *</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select name="size" value={formData.size} onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.size ? 'border-red-500' : 'border-gray-300'}`}>
                      <option value="">Select size</option>
                      {companySizes.map(size => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </div>
                  {errors.size && <p className="text-red-500 text-sm mt-1">{errors.size}</p>}
                </div>
              </div>
            )}

            {/* Step 2: Contact Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" name="contactPersonName" value={formData.contactPersonName} onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.contactPersonName ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="John Doe" />
                  </div>
                  {errors.contactPersonName && <p className="text-red-500 text-sm mt-1">{errors.contactPersonName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="email" name="contactPersonEmail" value={formData.contactPersonEmail} onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.contactPersonEmail ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="john@acme.com" />
                  </div>
                  {errors.contactPersonEmail && <p className="text-red-500 text-sm mt-1">{errors.contactPersonEmail}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="+1 (555) 123-4567" />
                  </div>
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>
              </div>
            )}

            {/* Step 3: Address */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                  <input type="text" name="street" value={formData.street} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="123 Main Street" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.city ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="San Francisco" />
                    {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                    <input type="text" name="state" value={formData.state} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="California" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                    <input type="text" name="country" value={formData.country} onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.country ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="United States" />
                    {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ZIP/Postal Code</label>
                    <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="94102" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Account Setup */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Choose Your Plan</label>
                  <div className="space-y-3">
                    {subscriptionPlans.map(plan => (
                      <label key={plan.value} className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.subscriptionPlan === plan.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input type="radio" name="subscriptionPlan" value={plan.value} checked={formData.subscriptionPlan === plan.value} onChange={handleChange} className="mt-1" />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-900">{plan.label}</span>
                            <span className="text-blue-600 font-bold">{plan.price}</span>
                          </div>
                          <ul className="mt-2 text-sm text-gray-600 space-y-1">
                            {plan.features.map((feature, idx) => <li key={idx}>• {feature}</li>)}
                          </ul>
                        </div>
                        {plan.popular && <span className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs px-2 py-1 rounded-full">Popular</span>}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                      className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Create a strong password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                      className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Confirm your password" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showConfirmPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>
                <div>
                  <label className="flex items-start">
                    <input type="checkbox" name="agreeToTerms" checked={formData.agreeToTerms} onChange={handleChange}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <span className="ml-2 text-sm text-gray-600">
                      I agree to the <Link to="/terms-and-conditions" className="text-blue-600 hover:text-blue-500">Terms and Conditions</Link> and{' '}
                      <Link to="/privacy-policy" className="text-blue-600 hover:text-blue-500">Privacy Policy</Link>
                    </span>
                  </label>
                  {errors.agreeToTerms && <p className="text-red-500 text-sm mt-1">{errors.agreeToTerms}</p>}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-4">
              {currentStep > 1 && (
                <button type="button" onClick={handleBack}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all">
                  <ArrowLeft className="w-5 h-5" /> Back
                </button>
              )}
              {currentStep < 4 ? (
                <button type="button" onClick={handleNext}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30">
                  Next <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button type="submit" disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/30">
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating Account...
                    </div>
                  ) : 'Create Account'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;