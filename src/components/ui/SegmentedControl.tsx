'use client';

import React from 'react';

interface Option {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  className?: string;
  fullWidth?: boolean;
}

export function SegmentedControl({ options, value, onChange, className = '', fullWidth = false }: SegmentedControlProps) {
  return (
    <div className={`inline-flex rounded-lg p-1 bg-[#121A2F] border border-[#1E293B] ${fullWidth ? 'w-full flex' : ''} ${className}`}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`
              px-4 py-1.5 text-sm font-medium rounded-md transition-all
              ${fullWidth ? 'flex-1 text-center' : ''}
              ${isActive 
                ? 'bg-[#3B82F6] text-white shadow-sm' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#1E293B]/50'
              }
            `}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
