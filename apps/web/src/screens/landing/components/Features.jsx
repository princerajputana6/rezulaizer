'use client';
import React from 'react';

const Features = ({ features = [] }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:shadow-blue-200',
    purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:shadow-purple-200',
    green: 'bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:shadow-green-200',
    orange: 'bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:shadow-orange-200',
    red: 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:shadow-red-200',
    indigo: 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:shadow-indigo-200',
  };

  return (
    <section id="features" className="py-20 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Powerful Features for
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent block">
              Modern Recruitment
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Everything you need to streamline your hiring process and find the perfect candidates faster than ever before.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="reveal opacity-0 translate-y-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all duration-500 group hover:-translate-y-4 cursor-pointer relative overflow-hidden"
                style={{ transitionDelay: `${feature.delay || 0}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className={`w-16 h-16 rounded-xl ${colorClasses[feature.color]} flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg relative z-10`}>
                  <Icon className="w-8 h-8 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors relative z-10">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors relative z-10">
                  {feature.description}
                </p>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;