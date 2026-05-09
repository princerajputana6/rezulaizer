'use client';
import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from '@/lib/router-compat';
import logo from '../../../assets/images/rezulaizer.png';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`fixed w-full z-50 transition-all duration-500 ${scrolled ? 'bg-slate-950/95 backdrop-blur-lg border-b border-white/10' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left Navigation */}
          <nav className="hidden md:flex items-center space-x-6 flex-1">
            <a href="#features" className="text-gray-300 hover:text-blue-400 transition-all duration-300 relative group pb-1">
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#pricing" className="text-gray-300 hover:text-blue-400 transition-all duration-300 relative group pb-1">
              Pricing
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#testimonials" className="text-gray-300 hover:text-blue-400 transition-all duration-300 relative group pb-1">
              Testimonials
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 group-hover:w-full transition-all duration-300"></span>
            </a>
          </nav>

          {/* Center Logo */}
          <div className="flex items-center justify-center">
            <Link to="/" className="group">
              <img 
                src={logo} 
                alt="Rezulyzer" 
                className="h-12 md:h-16 w-auto object-contain transform group-hover:scale-105 transition-transform duration-300"
              />
            </Link>
          </div>

          {/* Right Navigation */}
          <nav className="hidden md:flex items-center space-x-4 flex-1 justify-end">
            <Link to="/login" className="text-gray-300 hover:text-blue-400 transition-all duration-300 transform hover:scale-105">
              Sign In
            </Link>
            <Link to="/register" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50">
              Get Started
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className={`md:hidden overflow-hidden transition-all duration-500 ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="bg-slate-900/95 backdrop-blur-lg border-t border-white/10 py-4 space-y-4">
            <a href="#features" className="block text-gray-300 hover:text-blue-400 transform hover:translate-x-2 transition-all duration-300 px-4">
              Features
            </a>
            <a href="#pricing" className="block text-gray-300 hover:text-blue-400 transform hover:translate-x-2 transition-all duration-300 px-4">
              Pricing
            </a>
            <a href="#testimonials" className="block text-gray-300 hover:text-blue-400 transform hover:translate-x-2 transition-all duration-300 px-4">
              Testimonials
            </a>
            <div className="flex flex-col space-y-2 pt-4 border-t border-white/10 px-4">
              <Link to="/login" className="text-left text-gray-300 hover:text-blue-400 transition-colors">Sign In</Link>
              <Link to="/register" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg w-full hover:shadow-lg transition-all text-center">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;