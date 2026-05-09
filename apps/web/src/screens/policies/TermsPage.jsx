'use client';
import React from 'react';
import { FileText, Scale, AlertCircle, CheckCircle, XCircle, Mail } from 'lucide-react';
import logo from '../../assets/images/rezulaizer.png';

const TermsAndConditions = () => {
  const lastUpdated = "April 29, 2026";

  const sections = [
    {
      icon: CheckCircle,
      title: "Acceptance of Terms",
      content: "By accessing and using Rezulyzer ('the Platform'), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services. These terms apply to all users, including companies, HR professionals, and candidates."
    },
    {
      icon: FileText,
      title: "Service Description",
      content: "Rezulyzer is an AI-powered recruitment platform that provides resume parsing, candidate matching, automated assessments, AI video interviews, and analytics services. We reserve the right to modify, suspend, or discontinue any part of our services at any time with reasonable notice."
    },
    {
      icon: Scale,
      title: "User Accounts and Responsibilities",
      subsections: [
        {
          subtitle: "Account Registration",
          text: "You must provide accurate, complete, and current information during registration. You are responsible for maintaining the confidentiality of your account credentials."
        },
        {
          subtitle: "Acceptable Use",
          text: "You agree not to: (a) violate any laws or regulations, (b) infringe on intellectual property rights, (c) transmit malicious code, (d) attempt unauthorized access, (e) use the platform for illegal recruitment practices."
        },
        {
          subtitle: "Account Termination",
          text: "We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or pose security risks."
        }
      ]
    },
    {
      icon: AlertCircle,
      title: "Data and Privacy",
      subsections: [
        {
          subtitle: "Data Ownership",
          text: "You retain ownership of all candidate data and content you upload. By using our services, you grant us a license to process this data to provide our services."
        },
        {
          subtitle: "Data Protection",
          text: "We implement industry-standard security measures to protect your data. However, no system is completely secure, and you use the platform at your own risk."
        },
        {
          subtitle: "Privacy Policy",
          text: "Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these terms by reference."
        }
      ]
    },
    {
      icon: FileText,
      title: "Intellectual Property",
      subsections: [
        {
          subtitle: "Platform Ownership",
          text: "All rights, title, and interest in the Platform, including software, algorithms, design, and content, are owned by Rezulyzer Technologies Pvt. Ltd."
        },
        {
          subtitle: "License Grant",
          text: "We grant you a limited, non-exclusive, non-transferable license to use the Platform for your internal recruitment purposes."
        },
        {
          subtitle: "Restrictions",
          text: "You may not: reverse engineer, copy, modify, distribute, or create derivative works from our Platform without explicit written permission."
        }
      ]
    },
    {
      icon: XCircle,
      title: "Limitation of Liability",
      content: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, REZULYZER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU IN THE 12 MONTHS PRECEDING THE CLAIM."
    },
    {
      icon: Scale,
      title: "Indemnification",
      content: "You agree to indemnify and hold harmless Rezulyzer, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Platform, violation of these terms, or infringement of third-party rights."
    }
  ];

  const additionalTerms = [
    {
      title: "Payment and Billing",
      points: [
        "Subscription fees are billed in advance on a monthly or annual basis",
        "All fees are non-refundable except as required by law",
        "We reserve the right to change pricing with 30 days notice",
        "Failure to pay may result in service suspension"
      ]
    },
    {
      title: "AI Services Disclaimer",
      points: [
        "AI-generated results are provided 'as is' and may contain errors",
        "You are responsible for verifying all AI-generated content",
        "We do not guarantee specific accuracy rates or outcomes",
        "AI models are continuously improved but not perfect"
      ]
    },
    {
      title: "Third-Party Services",
      points: [
        "We integrate with third-party services (OpenAI, Anthropic, Cloudinary)",
        "Third-party services are subject to their own terms and conditions",
        "We are not responsible for third-party service failures",
        "You may need separate agreements with third-party providers"
      ]
    },
    {
      title: "Termination",
      points: [
        "You may cancel your subscription at any time",
        "We may terminate services for violation of terms",
        "Upon termination, you will lose access to the Platform",
        "Data export must be requested before termination"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-4">
            <img src={logo} alt="Rezulyzer" className="h-12 w-auto" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Terms and Conditions</h1>
          <p className="text-gray-300 text-lg">Last Updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Introduction */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
          <p className="text-gray-200 text-lg leading-relaxed mb-4">
            Welcome to <span className="font-semibold text-blue-400">Rezulyzer</span>. These Terms and Conditions ("Terms") govern your access to and use of our AI-powered recruitment platform. Please read them carefully.
          </p>
          <p className="text-gray-300">
            By creating an account or using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.
          </p>
        </div>

        {/* Main Sections */}
        <div className="space-y-8 mb-8">
          {sections.map((section, idx) => (
            <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">{section.title}</h2>
              </div>
              
              {section.content && (
                <p className="text-gray-300 leading-relaxed">{section.content}</p>
              )}
              
              {section.subsections && (
                <div className="space-y-6">
                  {section.subsections.map((sub, subIdx) => (
                    <div key={subIdx}>
                      <h3 className="text-lg font-semibold text-blue-300 mb-2">{sub.subtitle}</h3>
                      <p className="text-gray-300 leading-relaxed">{sub.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Additional Terms */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {additionalTerms.map((term, idx) => (
            <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">{term.title}</h3>
              <ul className="space-y-3">
                {term.points.map((point, pointIdx) => (
                  <li key={pointIdx} className="flex items-start gap-2 text-gray-300">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Governing Law */}
        <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Governing Law and Jurisdiction</h2>
          <p className="text-gray-200 mb-4">
            These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
          </p>
          <p className="text-gray-300">
            Any disputes arising from these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts in [Your City], India.
          </p>
        </div>

        {/* Changes to Terms */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Changes to These Terms</h2>
          <p className="text-gray-300 mb-4">
            We reserve the right to modify these Terms at any time. We will notify you of significant changes by:
          </p>
          <ul className="space-y-2 text-gray-300 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Posting a notice on our Platform</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Sending an email to your registered address</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Updating the "Last Updated" date at the top of this page</span>
            </li>
          </ul>
          <p className="text-gray-300">
            Your continued use of the Platform after changes constitutes acceptance of the modified Terms.
          </p>
        </div>

        {/* Contact */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-4 mb-4">
            <Mail className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Contact Information</h2>
          </div>
          <p className="text-gray-300 mb-4">
            If you have any questions about these Terms and Conditions, please contact us:
          </p>
          <div className="space-y-2 text-gray-200">
            <p><strong>Email:</strong> <a href="mailto:legal@rezulyzer.com" className="text-blue-400 hover:text-blue-300">legal@rezulyzer.com</a></p>
            <p><strong>Support:</strong> <a href="mailto:support@rezulyzer.com" className="text-blue-400 hover:text-blue-300">support@rezulyzer.com</a></p>
            <p><strong>Company:</strong> Rezulyzer Technologies Pvt. Ltd.</p>
            <p><strong>Address:</strong> India</p>
          </div>
        </div>

        {/* Acknowledgment */}
        <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6 mt-8">
          <p className="text-gray-200 text-center">
            By using Rezulyzer, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;