'use client';
import React from 'react';
import { 
  Target, Users, Brain, Zap, CheckCircle, Star, ArrowRight, Play, Menu, X, Clock, Shield, TrendingUp, Award,
  ChevronDown, Phone, Mail, MapPin, Twitter, Linkedin, Github, Calendar, BarChart3, Bot, Search
} from 'lucide-react';

import Header from './components/Header';
import AnimatedHero from './components/AnimatedHero';
import Stats from './components/Stats';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import Pricing from './components/Pricing';
import CTA from './components/CTA';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import Footer from './components/Footer';

const RezulyzerLandingPage = () => {
  useScrollReveal('.reveal');

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Resume Parsing',
      description: 'Automatically extract skills, experience, and education from resumes with 95% accuracy using advanced AI.',
      color: 'blue',
      delay: 0
    },
    {
      icon: Users,
      title: 'Smart Candidate Matching',
      description: 'Match candidates to job descriptions with intelligent algorithms that consider skills, experience, and cultural fit.',
      color: 'purple',
      delay: 100
    },
    {
      icon: Bot,
      title: 'AI Video Interviews',
      description: 'Conduct personalized AI interviews with real-time analysis of responses, confidence, and technical accuracy.',
      color: 'green',
      delay: 200
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Get deep insights into your recruitment process with comprehensive reports and performance metrics.',
      color: 'orange',
      delay: 300
    },
    {
      icon: Zap,
      title: 'Automated Assessments',
      description: 'Create dynamic tests with difficulty-based questions that adapt to job requirements automatically.',
      color: 'red',
      delay: 400
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-grade security with GDPR compliance, data encryption, and role-based access controls.',
      color: 'indigo',
      delay: 500
    }
  ];

  const stats = [
    { number: '10000', label: 'Candidates Processed', icon: Users, suffix: '+' },
    { number: '500', label: 'Companies Trust Us', icon: Target, suffix: '+' },
    { number: '80', label: 'Time Reduction', icon: Clock, suffix: '%' },
    { number: '95', label: 'Accuracy Rate', icon: Award, suffix: '%' }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Head of HR',
      company: 'TechCorp India',
      image: '/api/placeholder/64/64',
      content: 'Rezulyzer transformed our hiring process. We reduced time-to-hire by 70% and improved candidate quality significantly. The AI interviews are incredibly insightful.',
      rating: 5
    },
    {
      name: 'Rajesh Kumar',
      role: 'Recruitment Manager',
      company: 'StartupXYZ',
      image: '/api/placeholder/64/64',
      content: 'The AI-powered matching is game-changing. We now focus only on the best candidates instead of screening hundreds of resumes manually. ROI is fantastic!',
      rating: 5
    },
    {
      name: 'Priya Sharma',
      role: 'VP People Operations',
      company: 'FinanceFlow Ltd',
      image: '/api/placeholder/64/64',
      content: 'Cost-effective, scalable, and incredibly accurate. Rezulyzer helped us build our entire tech team in just 2 months. Highly recommended!',
      rating: 5
    }
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '₹15,000',
      period: '/month',
      description: 'Perfect for small companies',
      features: [
        'Up to 50 candidates',
        'Basic assessments',
        'Email support',
        'Standard reports',
        '5 AI interviews/month'
      ],
      color: 'gray',
      popular: false
    },
    {
      name: 'Professional',
      price: '₹35,000',
      period: '/month',
      description: 'Most popular for growing teams',
      features: [
        'Up to 200 candidates',
        'Unlimited AI interviews',
        'Advanced analytics',
        'Priority support',
        'Custom branding',
        'API access'
      ],
      color: 'blue',
      popular: true
    },
    {
      name: 'Enterprise',
      price: '₹75,000',
      period: '/month',
      description: 'For large organizations',
      features: [
        'Unlimited candidates',
        'Custom integrations',
        'Dedicated success manager',
        'SLA guarantees',
        'White-label solution',
        'Advanced security'
      ],
      color: 'purple',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <Header />
      <AnimatedHero />
      <Stats stats={stats} />
      <Features features={features} />
      <Testimonials testimonials={testimonials} />
      <Pricing plans={pricingPlans} />
      <CTA />
      <Footer />
    </div>
  );
};

export default RezulyzerLandingPage;