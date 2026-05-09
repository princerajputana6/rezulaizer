'use client';
import React from 'react';
import { CheckCircle } from 'lucide-react';

const Pricing = ({ plans = [] }) => {
  return (
    <section id="pricing" className="py-20 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-indigo-900/20" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-gray-400">Choose the plan that's right for your organization. All plans include core AI features.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 relative transition-all duration-500 hover:bg-white/10 hover:-translate-y-2 group cursor-pointer ${
                plan.popular ? 'ring-2 ring-blue-500 scale-[1.02] shadow-2xl shadow-blue-500/50' : 'hover:ring-2 hover:ring-blue-500/50'
              }`}
              style={{ animationDelay: `${index * 200}ms` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg">Most Popular</span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{plan.name}</h3>
                <p className="text-gray-400 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-white group-hover:text-blue-400 transition-colors">{plan.price}</span>
                  <span className="text-gray-400 ml-2">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 relative overflow-hidden ${
                  plan.popular
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 shadow-lg shadow-blue-500/50'
                    : 'border-2 border-white/20 text-gray-300 hover:border-blue-500 hover:text-white hover:bg-blue-600/20'
                }`}
              >
                <span className="relative z-10">{plan.popular ? 'Start Free Trial' : 'Get Started'}</span>
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-400 mb-4">Need a custom solution for your enterprise?</p>
          <button className="text-blue-400 hover:text-blue-300 font-semibold hover:underline transition-all">Contact Sales →</button>
        </div>
      </div>
    </section>
  );
};

export default Pricing;