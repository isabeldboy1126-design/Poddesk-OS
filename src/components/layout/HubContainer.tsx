import React from "react";
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
        <div className="max-w-6xl mx-auto w-full p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
