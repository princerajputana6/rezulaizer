'use client';
import React from 'react';
import { Shield, Lock, Eye, Database, UserCheck, Mail } from 'lucide-react';
import logo from '../../assets/images/rezulaizer.png';

const PrivacyPolicy = () => {
  const lastUpdated = "April 29, 2026";

  const sections = [
    {
      icon: Database,
      title: "Information We Collect",
      content: [
        {
          subtitle: "Personal Information",
          text: "We collect information you provide directly, including name, email address, phone number, company details, and professional information when you register or use our services."
        },
        {
          subtitle: "Candidate Data",
          text: "When you upload resumes or create candidate profiles, we collect and process candidate information including skills, experience, education, and assessment results."
        },
        {
          subtitle: "Usage Information",
          text: "We automatically collect information about how you interact with our platform, including IP addresses, browser type, device information, and usage patterns."
        },
        {
          subtitle: "Cookies and Tracking",
          text: "We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content. See our Cookie Policy for details."
        }
      ]
    },
    {
      icon: UserCheck,
      title: "How We Use Your Information",
      content: [
        {
          subtitle: "Service Delivery",
          text: "To provide, maintain, and improve our AI-powered recruitment platform, including resume parsing, candidate matching, and assessment generation."
        },
        {
          subtitle: "Communication",
          text: "To send you service-related notifications, updates, security alerts, and respond to your inquiries."
        },
        {
          subtitle: "Analytics and Improvement",
          text: "To analyze platform usage, identify trends, and improve our AI algorithms and user experience."
        },
        {
          subtitle: "Legal Compliance",
          text: "To comply with applicable laws, regulations, legal processes, and enforceable governmental requests."
        }
      ]
    },
    {
      icon: Lock,
      title: "Data Security",
      content: [
        {
          subtitle: "Encryption",
          text: "All data is encrypted in transit using TLS/SSL and at rest using industry-standard encryption protocols."
        },
        {
          subtitle: "Access Controls",
          text: "We implement role-based access controls (RBAC) to ensure only authorized personnel can access sensitive data."
        },
        {
          subtitle: "Regular Audits",
          text: "We conduct regular security audits and vulnerability assessments to maintain the highest security standards."
        },
        {
          subtitle: "Data Backup",
          text: "Your data is regularly backed up to secure, geographically distributed servers to prevent data loss."
        }
      ]
    },
    {
      icon: Eye,
      title: "Data Sharing and Disclosure",
      content: [
        {
          subtitle: "We Do Not Sell Your Data",
          text: "We never sell your personal information or candidate data to third parties."
        },
        {
          subtitle: "Service Providers",
          text: "We may share data with trusted service providers (cloud hosting, AI services) who are contractually obligated to protect your information."
        },
        {
          subtitle: "Legal Requirements",
          text: "We may disclose information when required by law, court order, or to protect our rights and safety."
        },
        {
          subtitle: "Business Transfers",
          text: "In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity."
        }
      ]
    },
    {
      icon: Shield,
      title: "Your Rights",
      content: [
        {
          subtitle: "Access and Portability",
          text: "You have the right to access your personal data and request a copy in a portable format."
        },
        {
          subtitle: "Correction and Deletion",
          text: "You can update or request deletion of your personal information at any time through your account settings."
        },
        {
          subtitle: "Opt-Out",
          text: "You can opt out of marketing communications while still receiving essential service notifications."
        },
        {
          subtitle: "Data Retention",
          text: "We retain your data for as long as your account is active or as needed to provide services. Deleted data is permanently removed within 30 days."
        }
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
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-gray-300 text-lg">Last Updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Introduction */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
          <p className="text-gray-200 text-lg leading-relaxed">
            At <span className="font-semibold text-blue-400">Rezulyzer</span>, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, store, and protect your data when you use our AI-powered recruitment platform.
          </p>
          <p className="text-gray-300 mt-4">
            By using Rezulyzer, you agree to the terms outlined in this policy. If you have any questions or concerns, please contact us at <a href="mailto:privacy@rezulyzer.com" className="text-blue-400 hover:text-blue-300">privacy@rezulyzer.com</a>.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section, idx) => (
            <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">{section.title}</h2>
              </div>
              <div className="space-y-6">
                {section.content.map((item, itemIdx) => (
                  <div key={itemIdx}>
                    <h3 className="text-lg font-semibold text-blue-300 mb-2">{item.subtitle}</h3>
                    <p className="text-gray-300 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* GDPR Compliance */}
        <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-8 mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">GDPR Compliance</h2>
          <p className="text-gray-200 leading-relaxed mb-4">
            Rezulyzer is committed to compliance with the General Data Protection Regulation (GDPR) and other applicable data protection laws. We ensure:
          </p>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Lawful, fair, and transparent processing of personal data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Data minimization - we only collect what's necessary</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Accuracy and up-to-date information</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Storage limitation - data is not kept longer than necessary</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Integrity and confidentiality through robust security measures</span>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mt-8">
          <div className="flex items-center gap-4 mb-4">
            <Mail className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Contact Us</h2>
          </div>
          <p className="text-gray-300 mb-4">
            If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
          </p>
          <div className="space-y-2 text-gray-200">
            <p><strong>Email:</strong> <a href="mailto:privacy@rezulyzer.com" className="text-blue-400 hover:text-blue-300">privacy@rezulyzer.com</a></p>
            <p><strong>Data Protection Officer:</strong> <a href="mailto:dpo@rezulyzer.com" className="text-blue-400 hover:text-blue-300">dpo@rezulyzer.com</a></p>
            <p><strong>Address:</strong> Rezulyzer Technologies Pvt. Ltd., India</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;