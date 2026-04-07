"use client";

import { CountUp } from "@/components/ui/CountUp";
import { LandingNav } from "@/components/layout/LandingNav";
import Link from 'next/link';
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';

// Route: /(public)/page.tsx

const HERO_LINE_ONE = 'Stop Planning.';
const HERO_LINE_TWO = 'Start finishing.';
const HERO_FULL_TEXT = `${HERO_LINE_ONE}${HERO_LINE_TWO}`;

function SpaceBackgroundCanvas() {
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const starsRef = useRef<Array<{ x: number; y: number; z: number; opacity: number; driftX: number; driftY: number; phase: number }>>([]);
   const rafRef = useRef<number | null>(null);
   const isMobileRef = useRef(false);

   useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const resize = () => {
         canvas.width = window.innerWidth;
         canvas.height = window.innerHeight;
         isMobileRef.current = window.innerWidth <= 768;
      };

      resize();
      window.addEventListener('resize', resize);

      starsRef.current = [];
      for (let i = 0; i < 160; i += 1) {
         starsRef.current.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            z: Math.random() * 1000,
            opacity: Math.random() * 0.5 + 0.3,
            driftX: (Math.random() - 0.5) * 0.06,
            driftY: (Math.random() - 0.5) * 0.04,
            phase: Math.random() * Math.PI * 2,
         });
      }

      const animate = () => {
         const now = Date.now();
         ctx.fillStyle = 'rgba(15, 23, 42, 1)';
         ctx.fillRect(0, 0, canvas.width, canvas.height);

         starsRef.current.forEach((star) => {
            const floatX = Math.sin(now * 0.00018 + star.phase) * 0.018;
            const floatY = Math.cos(now * 0.00016 + star.phase) * 0.014;
            star.x += star.driftX + floatX;
            star.y += star.driftY + floatY;

            star.opacity = 0.34 + Math.sin(now * 0.0009 + star.phase) * 0.16;
            star.opacity = Math.max(0.2, Math.min(0.75, star.opacity));

            if (star.x > canvas.width + 20) star.x = -20;
            if (star.x < -20) star.x = canvas.width + 20;
            if (star.y > canvas.height + 20) star.y = -20;
            if (star.y < -20) star.y = canvas.height + 20;

            const inMobileHeroZone =
               isMobileRef.current &&
               star.y < canvas.height * 0.38 &&
               star.x > canvas.width * 0.14 &&
               star.x < canvas.width * 0.86;

            // Thin only a small portion of stars around the mobile hero copy for readability.
            if (inMobileHeroZone && star.phase > 5.2) {
               return;
            }

            const radius = (star.z / 1000) * 2;

            const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, radius * 3);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(star.x - radius * 3, star.y - radius * 3, radius * 6, radius * 6);

            ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
            ctx.fill();
         });

         rafRef.current = window.requestAnimationFrame(animate);
      };

      animate();

      return () => {
         window.removeEventListener('resize', resize);
         if (rafRef.current) {
            window.cancelAnimationFrame(rafRef.current);
         }
      };
   }, []);

   return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full" style={{ zIndex: 0 }} />;
}

export default function LandingPage() {
   const shellRef = useRef<HTMLDivElement>(null);
   const [heroReady, setHeroReady] = useState(false);
   const [typedCount, setTypedCount] = useState(0);

   useEffect(() => {
      const shell = shellRef.current;
      if (!shell) return;

      let rafId = 0;
      const updateScrollVar = () => {
         rafId = 0;
         const bounded = Math.min(window.scrollY || 0, 1800);
         shell.style.setProperty('--landing-scroll', `${bounded}px`);
      };

      const onScroll = () => {
         if (rafId) return;
         rafId = window.requestAnimationFrame(updateScrollVar);
      };

      updateScrollVar();
      window.addEventListener('scroll', onScroll, { passive: true });

      return () => {
         window.removeEventListener('scroll', onScroll);
         if (rafId) window.cancelAnimationFrame(rafId);
      };
   }, []);

   useEffect(() => {
      const revealItems = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
      if (revealItems.length === 0) return;

      if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
         revealItems.forEach((el) => el.classList.add('landing-reveal--visible'));
         return;
      }

      const observer = new IntersectionObserver(
         (entries) => {
            entries.forEach((entry) => {
               if (!entry.isIntersecting) return;
               entry.target.classList.add('landing-reveal--visible');
               observer.unobserve(entry.target);
            });
         },
         { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
      );

      revealItems.forEach((el) => observer.observe(el));
      return () => observer.disconnect();
   }, []);

   useEffect(() => {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
         setHeroReady(true);
         setTypedCount(HERO_FULL_TEXT.length);
         return;
      }

      const timer = window.setTimeout(() => {
         setHeroReady(true);
      }, 1450);

      return () => window.clearTimeout(timer);
   }, []);

   useEffect(() => {
      if (!heroReady) return;
      if (typedCount >= HERO_FULL_TEXT.length) return;

      const interval = window.setInterval(() => {
         setTypedCount((prev) => {
            if (prev >= HERO_FULL_TEXT.length) {
               window.clearInterval(interval);
               return prev;
            }
            return prev + 1;
         });
      }, 42);

      return () => window.clearInterval(interval);
   }, [heroReady, typedCount]);

   const typedLineOne = HERO_FULL_TEXT.slice(0, Math.min(typedCount, HERO_LINE_ONE.length));
   const typedLineTwo = HERO_FULL_TEXT.slice(HERO_LINE_ONE.length, typedCount);

  return (
      <div ref={shellRef} className="landing-shell min-h-screen bg-[#020408] text-white selection:bg-blue-500/30 font-sans relative overflow-x-hidden">
      
      {/* --- Spatial Background / Star Layer --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
             <SpaceBackgroundCanvas />
      </div>

      <LandingNav />

      <main className="relative z-10">
        {/* Hero Section */}
            <section data-reveal className="landing-reveal relative pt-44 md:pt-48 pb-24 overflow-hidden flex flex-col items-center justify-center text-center max-w-6xl mx-auto px-4 perspective-1000">
          
               <div className="relative mb-12 min-h-[12.5rem] md:min-h-[15.5rem] flex flex-col items-center justify-center">
                  {!heroReady && (
                     <div className="hero-pod-intro" aria-hidden="true">
                        <div className="hero-pod-pill">pod</div>
                     </div>
                  )}

                  <h1 className={`text-[3.6rem] md:text-8xl font-black tracking-tighter text-white mb-6 leading-[0.96] md:leading-[0.9] drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all duration-700 ${heroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                     <span className="block whitespace-nowrap">{typedLineOne}</span>
                     <span className="block whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#94A3B8]">{typedLineTwo}</span>
                     {heroReady && typedCount < HERO_FULL_TEXT.length && <span className="hero-typing-caret" aria-hidden="true" />}
            </h1>
            <p className={`text-lg md:text-xl text-[#94A3B8] max-w-3xl font-medium mb-12 leading-relaxed mx-auto drop-shadow-md transition-opacity duration-700 delay-200 ${heroReady ? 'opacity-100' : 'opacity-0'}`}>
               When everything feels important the wrong things get done.<br className="hidden md:inline"/> Poddesk takes your plans or ideas and uses system thinking to<br className="hidden md:inline"/> build the right sequence so you can finish what matters.
            </p>
          </div>
          
               <div className="flex flex-col sm:flex-row gap-6 items-center justify-center mb-36 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both w-full max-w-md mx-auto">
                   <Link href="/brain-dump" className="landing-cta w-full sm:w-1/2 py-4 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] transition-all text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_5px_40px_rgba(59,130,246,0.6)] transform hover:-translate-y-1">
               Get Started →
             </Link>
                   <Link href="/demo" className="landing-cta w-full sm:w-1/2 py-4 bg-transparent border border-[#334155] hover:bg-[#0F172A] text-[#CBD5E1] text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="mr-1">
                 <polygon points="5 3 19 12 5 21 5 3"></polygon>
               </svg>
               Watch How It Works
             </Link>
          </div>

                      <div className="landing-surface flex flex-wrap justify-center gap-12 md:gap-32 w-full animate-in fade-in duration-1000 delay-500 fill-mode-both relative rounded-3xl px-4">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#334155] to-transparent"></div>
                            <div className="text-center pt-16 pb-12">
               <div className="text-5xl font-black text-white mb-2">+<CountUp end={200} />%</div>
               <div className="text-[10px] font-bold tracking-widest text-[#94A3B8] uppercase">OUTPUT RESULT</div>
             </div>
                            <div className="text-center pt-16 pb-12">
                      <div className="text-5xl font-black text-white mb-2"><CountUp end={2.5} decimals={1} />hrs</div>
               <div className="text-[10px] font-bold tracking-widest text-[#94A3B8] uppercase">DAILY RECAPTURE</div>
             </div>
                            <div className="text-center pt-16 pb-12">
               <div className="text-5xl font-black text-white mb-2">-<CountUp end={40} />%</div>
               <div className="text-[10px] font-bold tracking-widest text-[#94A3B8] uppercase">COGNITIVE OVERLOAD</div>
             </div>
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-[#1E293B] to-transparent"></div>
          </div>
        </section>

        {/* Problem Section */}
      <section data-reveal className="landing-reveal max-w-6xl mx-auto px-4 py-24 flex flex-col md:flex-row gap-16 items-center">
           <div className="flex-1 space-y-12">
              <div>
                 <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">The hidden cost of<br/><span className="text-[#60A5FA]">Analysis Paralysis.</span></h2>
                 <p className="text-[#94A3B8] leading-relaxed max-w-md text-lg">Standard tools force you to plan every detail before you even begin. This creates a friction loop: planning fatigue leads to hesitation, and hesitation kills momentum.</p>
              </div>
              <div className="space-y-4 max-w-md">
                 <div className="landing-surface landing-float-slow bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 border-l-4 border-l-[#FCA5A5] shadow-lg">
                    <h4 className="font-bold text-white text-base flex items-center gap-3 mb-2">
                       <span className="w-6 h-6 rounded-full bg-[#450a0a] flex items-center justify-center text-[#FCA5A5] text-xs font-black shrink-0">!</span> 
                       Decision Fatigue
                    </h4>
                    <p className="text-sm text-[#94A3B8]">Spending more energy deciding what to do than actually doing it.</p>
                 </div>
                 <div className="landing-surface landing-float-slow [animation-delay:0.35s] bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 border-l-4 border-l-[#FCA5A5] shadow-lg">
                    <h4 className="font-bold text-white text-base flex items-center gap-3 mb-2">
                       <span className="w-6 h-6 rounded-full bg-[#450a0a] flex items-center justify-center text-[#FCA5A5] text-xs font-black shrink-0">!</span> 
                       Context Fragmentation
                    </h4>
                    <p className="text-sm text-[#94A3B8]">Losing the &apos;why&apos; while buried in the &apos;how&apos; across infinite sub-tasks.</p>
                 </div>
              </div>
           </div>
           
           <div className="flex-1 relative w-full">
              <div className="landing-surface landing-float-medium aspect-[4/5] md:aspect-[4/3] bg-gradient-to-tr from-[#0F172A] to-[#1E293B] rounded-3xl overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center border border-[#334155]">
                 <div className="absolute inset-0 bg-black/40 mix-blend-overlay"></div>
                 <Image
                    src="/problem-blocker-scene.png"
                    alt="Focused person at desk with multiple monitor screens"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                 />
                 <div className="absolute inset-0 bg-blue-900/10 backdrop-blur-[1px]"></div>
                 
                 <div className="absolute bottom-4 -left-4 md:-left-8 landing-surface landing-float-slow bg-[#162032] border border-[#334155] p-6 rounded-xl max-w-[320px] shadow-2xl z-10">
                    <p className="text-[13px] md:text-sm text-[#E2E8F0] font-medium italic mb-4 leading-relaxed">&quot;The biggest blocker to progress isn&apos;t lack of time, but the friction of starting.&quot;</p>
                    <p className="text-[9px] uppercase tracking-widest text-[#64748B] font-bold">THE EXECUTION PARADOX</p>
                 </div>
              </div>
           </div>
        </section>

        {/* Mechanism/Solutions Section */}
      <section data-reveal id="solutions" className="landing-reveal max-w-[1000px] mx-auto px-4 py-32 text-center flex flex-col items-center">
           <p className="text-[11px] font-bold tracking-[0.2em] text-[#64748B] uppercase mb-6">THE EXECUTION ENGINE</p>
           <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">A clear path<br/>replaces the <span className="text-[#93C5FD]">mental noise</span></h2>
           <p className="text-lg md:text-xl text-[#94A3B8] max-w-2xl mb-12 leading-relaxed">
             Poddesk removes sequencing stress by turning messy input into a strict workflow you can track, trust, and finish.
           </p>
           
           <div className="landing-surface landing-float-slow bg-[#0F172A] border border-[#1E293B] py-4 px-8 rounded-xl text-[15px] text-[#94A3B8] font-medium italic mb-16 shadow-xl relative mt-2">
             <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-8 bg-[#3B82F6] rounded-r"></div>
             To-do lists collect tasks. <span className="font-bold not-italic text-white">Poddesk creates forward motion.</span>
           </div>
           
           <div className="flex flex-col md:flex-row justify-center w-full gap-8 md:gap-16">
              <div className="landing-float-slow flex flex-col items-center text-center gap-4 max-w-[240px]">
                <div className="w-12 h-12 rounded-full bg-[#0F172A] border border-[#1E293B] flex items-center justify-center text-[#60A5FA]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                </div>
                <p className="font-bold text-[#F1F5F9]">Turn messy input into structure</p>
              </div>
              <div className="landing-float-slow [animation-delay:0.35s] flex flex-col items-center text-center gap-4 max-w-[240px]">
                <div className="w-12 h-12 rounded-full bg-[#0F172A] border border-[#1E293B] flex items-center justify-center text-[#60A5FA]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                </div>
                <p className="font-bold text-[#F1F5F9]">See one exact next step</p>
              </div>
              <div className="landing-float-slow [animation-delay:0.7s] flex flex-col items-center text-center gap-4 max-w-[240px]">
                <div className="w-12 h-12 rounded-full bg-[#0F172A] border border-[#1E293B] flex items-center justify-center text-[#60A5FA]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <p className="font-bold text-[#F1F5F9]">Stop deciding during execution</p>
              </div>
           </div>
        </section>

        {/* How It Works Section */}
      <section data-reveal id="how-it-works" className="landing-reveal max-w-[1200px] mx-auto px-4 py-32 text-center border-t border-[#1E293B]/50">
           <h2 className="text-3xl font-bold text-white mb-16">How it works</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="landing-surface landing-float-slow bg-[#0A0E17] border border-[#1E293B] p-10 rounded-3xl hover:border-[#334155] transition-colors relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors"></div>
                 <div className="w-12 h-12 rounded-xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-center text-[#94A3B8] mb-8 shadow-inner">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                 </div>
                 <h3 className="font-bold text-white mb-4 text-xl tracking-tight">1. Dump Everything</h3>
                 <p className="text-[15px] text-[#94A3B8] leading-relaxed">Start with raw input: plain ideas, messy bullet points, complex spreadsheets, or overwhelming plans. No structure required.</p>
              </div>
              <div className="landing-surface landing-float-slow [animation-delay:0.35s] bg-[#0A0E17] border border-[#1E293B] p-10 rounded-3xl hover:border-[#334155] transition-colors relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors"></div>
                 <div className="w-12 h-12 rounded-xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-center text-[#60A5FA] mb-8 shadow-inner">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                 </div>
                 <h3 className="font-bold text-white mb-4 text-xl tracking-tight">2. Get a Clear Sequence</h3>
                 <p className="text-[15px] text-[#94A3B8] leading-relaxed">Our engine architecturally maps your inputs into a logical, high-impact sequence. We handle the &quot;how&quot;.</p>
              </div>
              <div className="landing-surface landing-float-slow [animation-delay:0.7s] bg-[#0A0E17] border border-[#1E293B] p-10 rounded-3xl hover:border-[#334155] transition-colors relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors"></div>
                 <div className="w-12 h-12 rounded-xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-center text-[#10B981] mb-8 shadow-inner">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                 </div>
                 <h3 className="font-bold text-white mb-4 text-xl tracking-tight">3. Execute One Step</h3>
                 <p className="text-[15px] text-[#94A3B8] leading-relaxed">Focus only on the immediate next action. One step at a time until the monolith is complete.</p>
              </div>
           </div>
        </section>

        {/* Philosophy Section */}
      <section data-reveal id="philosophy" className="landing-reveal max-w-[1200px] mx-auto px-4 py-32 text-center border-t border-[#1E293B]/50">
           <h2 className="text-4xl font-extrabold text-white mb-16">&quot;Clarity creates action&quot;</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="landing-surface landing-float-slow bg-[#0F172A]/40 border border-[#1E293B] p-10 rounded-3xl flex flex-col items-center hover:bg-[#0F172A] transition-colors">
                 <div className="text-[#60A5FA] mb-6 w-12 h-12 flex items-center justify-center">
                   <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                 </div>
                 <h3 className="font-bold text-[#F1F5F9] mb-4 text-lg">Clarity reduces hesitation</h3>
                 <p className="text-[13px] text-[#94A3B8] italic leading-relaxed">&quot;When the path is illuminated, the legs move automatically. We remove the fog.&quot;</p>
              </div>
              <div className="landing-surface landing-float-slow [animation-delay:0.35s] bg-[#0F172A]/40 border border-[#1E293B] p-10 rounded-3xl flex flex-col items-center hover:bg-[#0F172A] transition-colors">
                 <div className="text-[#60A5FA] mb-6 w-12 h-12 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                 </div>
                 <h3 className="font-bold text-[#F1F5F9] mb-4 text-lg">Sequence removes decision fatigue</h3>
                 <p className="text-[13px] text-[#94A3B8] italic leading-relaxed">&quot;The order of operations is as critical as the work itself. We solve the logic of order.&quot;</p>
              </div>
              <div className="landing-surface landing-float-slow [animation-delay:0.7s] bg-[#0F172A]/40 border border-[#1E293B] p-10 rounded-3xl flex flex-col items-center hover:bg-[#0F172A] transition-colors">
                 <div className="text-[#60A5FA] mb-6 w-12 h-12 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                 </div>
                 <h3 className="font-bold text-[#F1F5F9] mb-4 text-lg">Visible progress builds momentum</h3>
                 <p className="text-[13px] text-[#94A3B8] italic leading-relaxed">&quot;Execution is a flywheel. Every small step taken increases the torque for the next.&quot;</p>
              </div>
           </div>
        </section>

        {/* Final CTA Section */}
      <section data-reveal className="landing-reveal border-t border-[#1E293B] relative py-32 flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-[#06080D]">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNHYtbDItMiAydjJoLTR2LjVsMi0ydjJIMzZ2LS41TDMyIDI4djJoLTR2LTJoLTR2LjVsMiAydi0uNUwyMCAzMHYtMmgtNHYtMiAyem0wIDBoNHYySDIweiIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjAyNSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1E3A8A]/10 via-transparent to-transparent"></div>
          </div>
          <div className="relative z-10 text-center px-4">
            <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">Build with clarity.</h2>
            <p className="text-[#94A3B8] mb-12 max-w-md mx-auto text-lg">Join the elite cohort of execution-first builders. No more planning fatigue. Just momentum.</p>
                  <Link href="/brain-dump" className="landing-cta inline-flex px-8 py-4 bg-[#3B82F6] hover:bg-[#2563EB] transition-all text-white font-bold rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transform hover:-translate-y-0.5">
              Initialize Poddesk Flow
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#020408] border-t border-[#1E293B] pt-20 pb-10 px-6 text-sm">
         <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between mb-20 gap-12">
            <div className="max-w-xs">
               <h4 className="font-bold text-white text-xl tracking-tight mb-3">Poddesk</h4>
               <p className="text-[#64748B] text-[13px] leading-relaxed">The Architectural Execution Engine for high-stakes operations.</p>
            </div>
            <div className="flex gap-16 md:gap-24">
               <div>
                  <h5 className="font-bold text-[#64748B] text-[10px] uppercase tracking-[0.15em] mb-6">PLATFORM</h5>
                  <div className="flex flex-col gap-4 text-[13px] text-[#94A3B8]">
                     <Link href="#" className="hover:text-white transition-colors">Changelog</Link>
                     <Link href="#" className="hover:text-white transition-colors">Status</Link>
                  </div>
               </div>
               <div>
                  <h5 className="font-bold text-[#64748B] text-[10px] uppercase tracking-[0.15em] mb-6">LEGAL</h5>
                  <div className="flex flex-col gap-4 text-[13px] text-[#94A3B8]">
                     <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
                     <Link href="#" className="hover:text-white transition-colors">Terms</Link>
                  </div>
               </div>
               <div>
                  <h5 className="font-bold text-[#64748B] text-[10px] uppercase tracking-[0.15em] mb-6">CONNECT</h5>
                  <div className="flex flex-col gap-4 text-[13px] text-[#94A3B8]">
                     <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
                     <Link href="#" className="hover:text-white transition-colors">Support</Link>
                  </div>
               </div>
            </div>
         </div>
         <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center border-t border-[#1E293B]/50 pt-8 gap-4">
            <p className="text-[11px] text-[#64748B]">© 2024 Poddesk. Execution Engine. Built for Architectural Monoliths.</p>
            <div className="flex items-center gap-2 text-[10px] text-[#64748B] font-bold uppercase tracking-[0.2em]">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
               </span>
               SYSTEMS NORMAL
            </div>
         </div>
      </footer>
    </div>
  );
}
