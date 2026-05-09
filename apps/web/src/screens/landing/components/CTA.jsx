'use client';
import React from 'react';
import { Calendar } from 'lucide-react';

const CTA = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full animate-bounce" />
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-white/10 rounded-full animate-pulse" />
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-white/10 rotate-45 animate-spin" style={{animationDuration: '3s'}} />
      </div>
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
        <h2 className="text-4xl font-bold text-white mb-6">Ready to Transform Your Hiring Process?</h2>
        <p className="text-xl text-blue-100 mb-8">
          Join thousands of HR professionals who have revolutionized their recruitment with Rezulyzer's AI-powered platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="group bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg shadow-blue-900/50 relative overflow-hidden">
            <span className="relative z-10">Start Free 14-Day Trial</span>
            <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button className="group border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all transform hover:scale-105">
            <span className="flex items-center justify-center">
              <Calendar className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              Schedule Demo
            </span>
          </button>
        </div>
        <p className="text-blue-100 text-sm mt-4">No credit card required • Setup in 5 minutes • Cancel anytime</p>
      </div>
    </section>
  );
};

export default CTA;