"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sidebar } from "./Sidebar";

interface HubContainerProps {
  children: React.ReactNode;
}

export function HubContainer({ children }: HubContainerProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Hub pages consist of the main navigation sidebar alongside scrollable content
  return (
    <div className="flex h-screen w-full bg-[#0A0E17] overflow-hidden text-gray-100">
      <Sidebar />

      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={() => setMenuOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1E293B] bg-[#0A0E17]/90 text-gray-200 backdrop-blur"
      >
        <span className="sr-only">Open menu</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <main className="flex-1 w-full flex-col overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full p-8">
          {children}
        </div>
      </main>

      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/45 transition-opacity duration-200 ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMenuOpen(false)}
      />

      <nav className={`md:hidden fixed left-0 top-0 z-50 h-full w-64 border-r border-[#1E293B] bg-[#0A0E17] shadow-2xl transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B]">
          <span className="text-sm font-bold tracking-wide text-white">Menu</span>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-300 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <ul className="px-3 py-4 space-y-1">
          <li>
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-[#1E293B] hover:text-white transition-colors">
              Dashboard
            </Link>
          </li>
          <li>
            <Link href="/brain-dump" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-[#1E293B] hover:text-white transition-colors">
              New Flow
            </Link>
          </li>
          <li>
            <Link href="/analytics" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-[#1E293B] hover:text-white transition-colors">
              Analytics
            </Link>
          </li>
          <li>
            <Link href="/history" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-[#1E293B] hover:text-white transition-colors">
              History
            </Link>
          </li>
          <li>
            <Link href="/profile" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-[#1E293B] hover:text-white transition-colors">
              Profile
            </Link>
          </li>
          <li>
            <Link href="/settings" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-[#1E293B] hover:text-white transition-colors">
              Settings
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
