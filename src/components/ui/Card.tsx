import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-[#121A2F] border border-[#1E293B] rounded-xl p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
