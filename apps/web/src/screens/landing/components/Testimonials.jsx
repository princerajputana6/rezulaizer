'use client';
import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

const Testimonials = ({ testimonials = [] }) => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % testimonials.length), 5000);
    return () => clearInterval(t);
  }, [testimonials.length]);

  if (!testimonials.length) return null;

  const current = testimonials[active];

  return (
    <section id="testimonials" className="py-20 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">What Our Customers Say</h2>
          <p className="text-xl text-gray-400">Join thousands of HR professionals who trust Rezulyzer for their recruitment needs.</p>
        </div>

        <div className="relative">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white transition-all duration-500 shadow-2xl shadow-blue-500/50">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex justify-center mb-6">
                {[...Array(current.rating)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-current text-yellow-400" />
                ))}
              </div>
              <blockquote className="text-xl md:text-2xl font-medium mb-8 leading-relaxed">"{current.content}"</blockquote>
              <div className="flex items-center justify-center gap-4">
                <img src={current.image} alt={current.name} className="w-16 h-16 rounded-full bg-white/20" />
                <div className="text-left">
                  <div className="font-bold text-lg">{current.name}</div>
                  <div className="text-blue-100">{current.role}</div>
                  <div className="text-blue-200 text-sm">{current.company}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActive(idx)}
                className={`h-3 rounded-full transition-all duration-300 ${idx === active ? 'bg-blue-400 w-8 shadow-lg' : 'bg-gray-600 w-3 hover:bg-gray-500'}`}
                aria-label={`Show testimonial ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;