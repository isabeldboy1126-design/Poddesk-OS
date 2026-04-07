import React from "react";
import Link from "next/link";
import { Sidebar } from "./Sidebar";

interface HubContainerProps {
  children: React.ReactNode;
}

export function HubContainer({ children }: HubContainerProps) {
  // Hub pages consist of the main navigation sidebar alongside scrollable content
  return (
    <div className="flex h-screen w-full bg-[#0A0E17] overflow-hidden text-gray-100">
      <Sidebar />
      <main className="flex-1 w-full flex-col overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full p-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#1E293B] bg-[#0A0E17]/95 backdrop-blur-xl">
        <ul className="grid grid-cols-5">
          <li>
            <Link href="/dashboard" className="block py-3 text-center text-[11px] font-semibold tracking-wide text-gray-300 hover:text-white transition-colors">
              Dashboard
            </Link>
          </li>
          <li>
            <Link href="/brain-dump" className="block py-3 text-center text-[11px] font-semibold tracking-wide text-gray-300 hover:text-white transition-colors">
              New Flow
            </Link>
          </li>
          <li>
            <Link href="/analytics" className="block py-3 text-center text-[11px] font-semibold tracking-wide text-gray-300 hover:text-white transition-colors">
              Analytics
            </Link>
          </li>
          <li>
            <Link href="/history" className="block py-3 text-center text-[11px] font-semibold tracking-wide text-gray-300 hover:text-white transition-colors">
              History
            </Link>
          </li>
          <li>
            <Link href="/settings" className="block py-3 text-center text-[11px] font-semibold tracking-wide text-gray-300 hover:text-white transition-colors">
              Settings
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
