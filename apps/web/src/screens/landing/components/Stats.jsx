'use client';
import React from 'react';
import AnimatedCounter from './AnimatedCounter';

const Stats = ({ stats = [] }) => {
  return (
    <section className="py-20 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-indigo-900/20" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="text-center cursor-pointer group">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 relative overflow-hidden shadow-lg shadow-blue-500/50 group-hover:scale-110">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  <AnimatedCounter end={parseInt(stat.number)} suffix={stat.suffix} />
                </div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Stats;