import Link from 'next/link';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#0A0E17] text-white flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-[#1E293B] flex items-center justify-center text-blue-400 mb-6">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      </div>
      <h1 className="text-3xl font-bold mb-4 tracking-tight">Video is coming soon</h1>
      <p className="text-gray-400 mb-8 max-w-sm">
        We are currently recording the official Poddesk overview. Check back shortly.
      </p>
      
      <Link href="/" className="px-6 py-2 bg-[#1E293B] hover:bg-[#334155] rounded-lg transition-colors text-sm font-semibold">
        Return Home
      </Link>
    </div>
  );
}
