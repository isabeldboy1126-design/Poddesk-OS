import Link from 'next/link';

export function Sidebar() {
  return (
    <aside className="w-64 h-screen border-r border-[#1E293B] bg-[#0A0E17] hidden md:flex flex-col flex-shrink-0 relative">
      <div className="p-6">
        <h2 className="text-xl font-bold tracking-tight text-white mb-2">Poddesk</h2>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {/* Approved Sidebar Items Only */}
        <Link href="/dashboard" className="block px-4 py-2 rounded-md text-gray-300 hover:text-white hover:bg-[#1E293B] transition-colors">
          Dashboard
        </Link>
        <Link href="/analytics" className="block px-4 py-2 rounded-md text-gray-300 hover:text-white hover:bg-[#1E293B] transition-colors">
          Analytics
        </Link>
        <Link href="/history" className="block px-4 py-2 rounded-md text-gray-300 hover:text-white hover:bg-[#1E293B] transition-colors">
          History
        </Link>
      </nav>
      <div className="p-6 space-y-2">
        <Link href="/profile" className="block px-4 py-2 rounded-md text-gray-400 hover:text-white hover:bg-[#1E293B] transition-colors">
          Profile
        </Link>
        <Link href="/settings" className="block px-4 py-2 rounded-md text-gray-400 hover:text-white hover:bg-[#1E293B] transition-colors">
          Settings
        </Link>
      </div>
    </aside>
  );
}
