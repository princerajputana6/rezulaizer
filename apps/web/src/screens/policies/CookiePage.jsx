'use client';
import React from 'react';
import { Cookie, Settings, BarChart, Shield, Eye, Mail } from 'lucide-react';
import logo from '../../assets/images/rezulaizer.png';

const CookiePolicy = () => {
  const lastUpdated = "April 29, 2026";

  const cookieTypes = [
    {
      icon: Shield,
      title: "Essential Cookies",
      description: "Required for the website to function properly",
      examples: [
        "Authentication tokens",
        "Session management",
        "Security features",
        "Load balancing"
      ],
      duration: "Session or up to 1 year",
      canDisable: false
    },
    {
      icon: Settings,
      title: "Functional Cookies",
      description: "Remember your preferences and settings",
      examples: [
        "Language preferences",
        "Theme selection",
        "Dashboard layout",
        "Notification settings"
      ],
      duration: "Up to 1 year",
      canDisable: true
    },
    {
      icon: BarChart,
      title: "Analytics Cookies",
      description: "Help us understand how you use our platform",
      examples: [
        "Page views and navigation",
        "Feature usage statistics",
        "Performance metrics",
        "Error tracking"
      ],
      duration: "Up to 2 years",
      canDisable: true
    },
    {
      icon: Eye,
      title: "Marketing Cookies",
      description: "Track your activity for advertising purposes",
      examples: [
        "Ad campaign tracking",
        "Conversion tracking",
        "Remarketing",
        "Social media integration"
      ],
      duration: "Up to 2 years",
      canDisable: true
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
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Cookie Policy</h1>
          <p className="text-gray-300 text-lg">Last Updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Introduction */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Cookie className="w-8 h-8 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">What Are Cookies?</h2>
          </div>
          <p className="text-gray-200 text-lg leading-relaxed mb-4">
            Cookies are small text files that are placed on your device when you visit our website. They help us provide you with a better experience by remembering your preferences, keeping you logged in, and understanding how you use our platform.
          </p>
          <p className="text-gray-300">
            This Cookie Policy explains what cookies are, how we use them, and how you can control them.
          </p>
        </div>

        {/* Cookie Types */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {cookieTypes.map((type, idx) => (
            <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                  <type.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">{type.title}</h3>
              </div>
              <p className="text-gray-300 mb-4">{type.description}</p>
              <div className="space-y-2 mb-4">
                <p className="text-sm font-semibold text-blue-300">Examples:</p>
                <ul className="space-y-1">
                  {type.examples.map((example, i) => (
                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-between text-sm pt-4 border-t border-white/10">
                <span className="text-gray-400">Duration: {type.duration}</span>
                <span className={`px-2 py-1 rounded ${type.canDisable ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                  {type.canDisable ? 'Optional' : 'Required'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* How to Control Cookies */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">How to Control Cookies</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-2">Browser Settings</h3>
              <p className="text-gray-300 mb-3">
                Most browsers allow you to control cookies through their settings. You can:
              </p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Block all cookies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Accept only first-party cookies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Delete cookies when you close your browser</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Manage cookies on a site-by-site basis</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-2">Platform Settings</h3>
              <p className="text-gray-300">
                You can manage your cookie preferences directly in your Rezulyzer account settings. Go to <span className="text-blue-400 font-semibold">Settings → Privacy → Cookie Preferences</span> to customize your choices.
              </p>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-200 text-sm">
                <strong>Note:</strong> Blocking essential cookies may prevent you from using certain features of our platform, including logging in and accessing your account.
              </p>
            </div>
          </div>
        </div>

        {/* Third-Party Cookies */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Third-Party Cookies</h2>
          <p className="text-gray-300 mb-4">
            We use services from trusted third-party providers that may set cookies on your device:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Analytics</h4>
              <p className="text-sm text-gray-400">Google Analytics, Mixpanel</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Authentication</h4>
              <p className="text-sm text-gray-400">OAuth providers (Google, LinkedIn)</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Cloud Services</h4>
              <p className="text-sm text-gray-400">AWS, Cloudinary</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">AI Services</h4>
              <p className="text-sm text-gray-400">OpenAI, Anthropic</p>
            </div>
          </div>
        </div>

        {/* Updates */}
        <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Updates to This Policy</h2>
          <p className="text-gray-200">
            We may update this Cookie Policy from time to time to reflect changes in our practices or for legal reasons. We will notify you of any significant changes by posting a notice on our website or sending you an email.
          </p>
        </div>

        {/* Contact */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-4 mb-4">
            <Mail className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Questions?</h2>
          </div>
          <p className="text-gray-300 mb-4">
            If you have any questions about our use of cookies, please contact us:
          </p>
          <div className="space-y-2 text-gray-200">
            <p><strong>Email:</strong> <a href="mailto:privacy@rezulyzer.com" className="text-blue-400 hover:text-blue-300">privacy@rezulyzer.com</a></p>
            <p><strong>Support:</strong> <a href="mailto:support@rezulyzer.com" className="text-blue-400 hover:text-blue-300">support@rezulyzer.com</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;