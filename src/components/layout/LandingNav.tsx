"use client";

import React, { useState } from 'react';
import Link from 'next/link';

export function LandingNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#06080D]/70 backdrop-blur-xl border-b border-[#1E293B]/50 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="font-black text-white text-2xl tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Poddesk</Link>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-12 text-[11px] font-bold tracking-widest text-[#94A3B8] uppercase">
          <Link href="#how-it-works" className="hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">HOW IT WORKS</Link>
          <Link href="#philosophy" className="hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">PHILOSOPHY</Link>
          <Link href="#solutions" className="hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">SOLUTIONS</Link>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link href="/login" className="text-[11px] font-bold tracking-widest text-[#94A3B8] uppercase hover:text-white transition-all">SIGN IN</Link>
          <Link href="/brain-dump" className="px-6 py-3 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white text-[11px] font-bold tracking-widest uppercase rounded shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all transform hover:-translate-y-[1px] hover:shadow-[0_0_35px_rgba(59,130,246,0.5)]">
            START YOUR FIRST FLOW
          </Link>
        </div>

        {/* Mobile Hamburger toggle */}
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 z-50 relative"
          aria-label="Toggle menu"
        >
          <span className={`block w-6 h-[2px] bg-white transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-[8px]' : ''}`}></span>
          <span className={`block w-6 h-[2px] bg-white transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}></span>
          <span className={`block w-6 h-[2px] bg-white transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-[8px]' : ''}`}></span>
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      <div 
        className={`md:hidden fixed inset-0 bg-[#06080D]/95 backdrop-blur-3xl z-40 transition-all duration-500 ease-in-out flex flex-col items-center justify-center space-y-8 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1E3A8A]/10 via-transparent to-transparent -z-10"></div>
        <Link href="/login" onClick={() => setIsOpen(false)} className="text-lg font-bold tracking-widest text-[#94A3B8] uppercase hover:text-white transition-colors">SIGN IN</Link>
        <Link href="/brain-dump" onClick={() => setIsOpen(false)} className="px-10 py-5 mt-4 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white text-sm font-black tracking-widest uppercase rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] border border-[#60A5FA]/30">
          START FLOW
        </Link>
      </div>
    </nav>
  );
}
