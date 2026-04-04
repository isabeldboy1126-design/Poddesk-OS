'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active mode based on simple route match
  const modeVal = pathname.includes('/existing-plan') ? 'existing' : 'scratch';

  const handleModeChange = (val: string) => {
    if (val === 'scratch') router.push('/brain-dump');
    if (val === 'existing') router.push('/existing-plan');
  };

  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
      <div className="max-w-xl">
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">{title}</h1>
        <p className="text-gray-400 text-lg leading-relaxed">{description}</p>
      </div>
      
      <div className="shrink-0 flex items-center bg-[#0F172A] p-1 rounded-lg border border-[#1E293B]">
         {/* Using a custom styled segmented control specifically for the header nav */}
          <button 
            onClick={() => handleModeChange('scratch')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${modeVal === 'scratch' ? 'bg-[#1E293B] text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Start from Scratch
          </button>
          <button 
            onClick={() => handleModeChange('existing')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${modeVal === 'existing' ? 'bg-[#1E293B] text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Existing Plan
          </button>
      </div>
    </div>
  );
}
