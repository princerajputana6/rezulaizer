'use client';
import React from 'react';
import { Shield, FileText, Cookie, Mail, Twitter, Linkedin, Github } from 'lucide-react';
import { Link } from '@/lib/router-compat';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <img src="/logo.png" alt="Rezulyzer" className="h-10 w-auto mb-4" />
            <p className="text-sm text-gray-400 leading-relaxed">
              AI-powered recruitment platform for parsing resumes, matching candidates, and conducting intelligent interviews.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3 mt-4">
              <a href="#" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                <Twitter className="w-4 h-4 text-gray-400 hover:text-blue-400" />
              </a>
              <a href="#" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                <Linkedin className="w-4 h-4 text-gray-400 hover:text-blue-400" />
              </a>
              <a href="#" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                <Github className="w-4 h-4 text-gray-400 hover:text-blue-400" />
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#features" className="text-gray-400 hover:text-blue-400 transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-gray-400 hover:text-blue-400 transition-colors">Pricing</a></li>
              <li><a href="#testimonials" className="text-gray-400 hover:text-blue-400 transition-colors">Testimonials</a></li>
              <li><Link to="/login" className="text-gray-400 hover:text-blue-400 transition-colors">Sign In</Link></li>
              <li><Link to="/register" className="text-gray-400 hover:text-blue-400 transition-colors">Get Started</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/privacy-policy" className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors">
                  <Shield className="w-4 h-4" />
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors">
                  <FileText className="w-4 h-4" />
                  <span>Terms & Conditions</span>
                </Link>
              </li>
              <li>
                <Link to="/cookie-policy" className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors">
                  <Cookie className="w-4 h-4" />
                  <span>Cookie Policy</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="mailto:support@rezulyzer.com" className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors">
                  <Mail className="w-4 h-4" />
                  <span>support@rezulyzer.com</span>
                </a>
              </li>
              <li>
                <a href="mailto:sales@rezulyzer.com" className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors">
                  <Mail className="w-4 h-4" />
                  <span>sales@rezulyzer.com</span>
                </a>
              </li>
            </ul>
            <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
              <p className="text-xs text-gray-400 mb-2">Subscribe to our newsletter</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Your email" 
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded hover:from-blue-700 hover:to-indigo-700 transition-all">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-gray-400">
            <p>© {year} Rezulyzer Technologies Pvt. Ltd. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Made with <span className="text-red-500">♥</span> for smarter hiring
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;