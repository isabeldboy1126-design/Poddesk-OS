import React from "react";

// (app)/layout.tsx 
// Architectural Invariant: This layout must NOT render the Sidebar globally,
// to ensure Flow pages stay strictly minimal. Instead, it provides Auth Context.

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // STUB: Auth Boundary and Context Providers will go here
  return (
    <div className="app-authenticated-boundary h-full w-full relative">
      {children}
    </div>
  );
}
