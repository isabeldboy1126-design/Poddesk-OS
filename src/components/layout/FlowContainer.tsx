'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface FlowContainerProps {
  children: React.ReactNode;
  /** Optional back href. Shows back arrow when provided. */
  backHref?: string;
  /** Optional callback before navigating back (e.g., for exit warning) */
  onBackClick?: () => void;
  /** Show top nav bar with PODDESK branding */
  showTopBar?: boolean;
}

export function FlowContainer({
  children,
  backHref,
  onBackClick,
  showTopBar = true,
}: FlowContainerProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0A0E17] text-gray-100 overflow-hidden">
      {/* Minimal top bar — back arrow + brand + optional right icons */}
      {showTopBar && (
        <header className="h-[64px] w-full flex items-center px-6 border-b border-[#1E293B] bg-[#0A0E17] flex-shrink-0">
          <div className="flex-1 flex items-center gap-4">
            {/* Back arrow */}
            <button
              onClick={handleBack}
              className="text-gray-400 hover:text-white transition-colors p-1 -ml-1"
              aria-label="Go back"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12,19 5,12 12,5" />
              </svg>
            </button>
            <span className="font-bold text-sm text-white tracking-wide">
              PODDESK
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification icon stub */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            {/* Lightning icon stub */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
              </svg>
            </div>
            {/* Avatar placeholder */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-[#1E293B]" />
          </div>
        </header>
      )}
      <main className="flex-1 overflow-y-auto flex justify-center items-start pt-[2rem]">
        <div className="w-full max-w-4xl px-4">
          {children}
        </div>
      </main>
    </div>
  );
}
