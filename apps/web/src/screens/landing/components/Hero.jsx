'use client';
import React from 'react';
import { Zap, Bot, ChevronDown, Target } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
      {/* Background accents using Tailwind only */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-200/40 rounded-full mix-blend-multiply blur-2xl animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-200/40 rounded-full mix-blend-multiply blur-2xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-pink-200/40 rounded-full mix-blend-multiply blur-2xl animate-pulse" />
        <div className="absolute top-20 right-20 w-4 h-4 bg-blue-500/20 rotate-45 animate-bounce" />
        <div className="absolute bottom-32 left-16 w-6 h-6 bg-purple-500/20 rounded-full animate-pulse" />
        <div className="absolute top-1/2 left-8 w-3 h-3 bg-pink-500/20 rotate-45 animate-spin" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200/50 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium hover:scale-105 transition-transform cursor-pointer">
                <Zap className="w-4 h-4 mr-2 text-blue-600 animate-pulse" />
                <span className="text-blue-800">AI-Powered Recruitment Platform</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
                Hire the Best
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block relative">
                  Talent Faster
                  <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full" />
                </span>
              </h1>

              <p className="text-xl text-gray-600 max-w-2xl leading-relaxed mx-auto lg:mx-0">
                Transform your recruitment process with AI-powered resume parsing, smart candidate matching, and automated video interviews. <span className="text-blue-600 font-semibold">Reduce hiring time by 80%</span> while improving candidate quality.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 hover:shadow-2xl relative overflow-hidden">
                <span className="relative z-10 flex items-center justify-center">
                  Start Free Trial
                </span>
              </button>
              <button className="group border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-blue-600 hover:text-blue-600 hover:shadow-lg transition-all flex items-center justify-center relative overflow-hidden">
                <Bot className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform relative z-10" />
                <span className="relative z-10">Watch Demo</span>
              </button>
            </div>

            {/* Trust logos */}
            <div className="pt-8">
              <p className="text-sm text-gray-500 mb-4">Trusted by leading companies in India</p>
              <div className="flex items-center justify-center lg:justify-start gap-8">
                {['TechCorp', 'StartupXYZ', 'FinanceFlow', 'InnovateLabs'].map((c) => (
                  <div key={c} className="text-2xl font-bold opacity-60 hover:opacity-100 transition-opacity cursor-pointer transform hover:scale-105">
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dashboard mock */}
          <div className="relative">
            <div className="relative z-10">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden transform hover:rotate-0 transition-all duration-500 hover:shadow-3xl group rotate-2">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-white/30 rounded-full animate-pulse" />
                    <div className="w-3 h-3 bg-white/30 rounded-full animate-pulse" />
                    <div className="w-3 h-3 bg-white/30 rounded-full animate-pulse" />
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg group-hover:text-blue-600 transition-colors">AI Interview Dashboard</h3>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Target className="w-4 h-4 text-green-600 animate-pulse" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer transform hover:scale-105">
                      <div className="text-2xl font-bold text-blue-600">24</div>
                      <div className="text-sm text-gray-600">Active Candidates</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer transform hover:scale-105">
                      <div className="text-2xl font-bold text-purple-600">89%</div>
                      <div className="text-sm text-gray-600">Match Accuracy</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: 'Sarah Johnson - Frontend Dev', score: '95%', color: 'text-green-600' },
                      { name: 'Mike Wilson - Backend Dev', score: '87%', color: 'text-blue-600' },
                      { name: 'Emily Davis - Full Stack', score: '92%', color: 'text-purple-600' }
                    ].map((candidate) => (
                      <div key={candidate.name} className="flex items-center justify-between text-sm p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer transform hover:translate-x-1">
                        <span>{candidate.name}</span>
                        <span className={`${candidate.color} font-medium`}>{candidate.score} Match</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -left-4 w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20 animate-bounce" />
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse" />
            <div className="absolute top-1/2 -right-4 w-12 h-12 bg-gradient-to-r from-green-400 to-blue-400 rounded-lg opacity-30 animate-spin" />
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer">
        <div className="flex flex-col items-center gap-2 text-gray-400 hover:text-blue-600 transition-colors">
          <span className="text-sm">Scroll to explore</span>
          <ChevronDown className="w-6 h-6" />
        </div>
      </div>
    </section>
  );
};

export default Hero;