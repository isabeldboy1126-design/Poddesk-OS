'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HubContainer } from '@/components/layout/HubContainer';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { createBrowserClient } from '@/lib/supabase/client';
import { useSettings } from '@/lib/hooks/useSettings';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const { settings, updateSetting, isLoaded } = useSettings();
  const [profile, setProfile] = useState<{ displayName: string; email: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setProfile({
          displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
        });
      }
    }
    loadUser();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSettingChange = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    updateSetting(key, value);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  if (!isLoaded || !profile) {
    return (
      <HubContainer>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </HubContainer>
    );
  }

  return (
    <HubContainer>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Settings</h1>
            <p className="text-gray-400">Manage preferences and account controls.</p>
          </div>
          <div className={`transition-opacity duration-300 ${saveStatus === 'saved' ? 'opacity-100' : 'opacity-0'}`}>
             <span className="flex items-center gap-1.5 px-3 py-1 bg-[#1E293B]/60 text-gray-300 rounded-full text-xs font-semibold">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M20 6L9 17l-5-5"/>
               </svg>
               CHANGES SAVED
             </span>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-4 pl-1">PREFERENCES</h2>
          
          <div className="space-y-4">
            {/* Sound Toggle */}
            <div className="bg-[#121A2F] border border-[#1E293B] hover:border-[#334155] rounded-xl p-6 flex items-center justify-between transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#1E293B] flex items-center justify-center flex-shrink-0 text-gray-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Completion sound</h3>
                  <p className="text-sm text-gray-400">Play a high-fidelity chime when a task is finished.</p>
                </div>
              </div>
              <Switch 
                checked={settings.completionSound} 
                onChange={(v) => handleSettingChange('completionSound', v)} 
              />
            </div>

            {/* Theme Selectors */}
            <div className="bg-[#121A2F] border border-[#1E293B] hover:border-[#334155] rounded-xl p-6 transition-colors">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#1E293B] flex items-center justify-center flex-shrink-0 text-gray-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M2 12h20"></path>
                      <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Interface Theme</h3>
                    <p className="text-sm text-gray-400">Visual appearance preview (non-functional).</p>
                  </div>
                </div>
                <Badge variant="default">PREVIEW ONLY</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button 
                  onClick={() => handleSettingChange('theme', 'dark')}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${settings.theme === 'dark' ? 'border-blue-500 bg-[#0A0E17]' : 'border-[#1E293B] bg-[#0A0E17] opacity-60 hover:opacity-100'}`}
                >
                  <div className="h-2 w-3/4 bg-[#1E293B] rounded-full mb-2"></div>
                  <div className="h-2 w-1/2 bg-[#1E293B] rounded-full mb-6"></div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4">Dark</div>
                  {settings.theme === 'dark' && (
                    <div className="absolute bottom-4 right-4 text-blue-500">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    </div>
                  )}
                </button>
                <button 
                  onClick={() => handleSettingChange('theme', 'light')}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${settings.theme === 'light' ? 'border-blue-500 bg-white' : 'border-[#1E293B] bg-white opacity-60 hover:opacity-100'}`}
                >
                  <div className="h-2 w-3/4 bg-gray-200 rounded-full mb-2"></div>
                  <div className="h-2 w-1/2 bg-gray-200 rounded-full mb-6"></div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4">Light</div>
                  {settings.theme === 'light' && (
                    <div className="absolute bottom-4 right-4 text-blue-500">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    </div>
                  )}
                </button>
                <button 
                  onClick={() => handleSettingChange('theme', 'custom')}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${settings.theme === 'custom' ? 'border-blue-500 bg-[#2A3172]' : 'border-transparent bg-[#2A3172] opacity-60 hover:opacity-100'}`}
                >
                  <div className="h-2 w-3/4 bg-[#3B4394] rounded-full mb-2"></div>
                  <div className="h-2 w-1/2 bg-[#3B4394] rounded-full mb-6"></div>
                  <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mt-4">Custom</div>
                  {settings.theme === 'custom' && (
                    <div className="absolute bottom-4 right-4 text-white">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-4 pl-1">ACCOUNT</h2>
          <div className="bg-[#121A2F] border border-[#1E293B] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-900 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-white font-bold pb-0.5 shadow-inner">
                  {profile.displayName.charAt(0).toUpperCase()}
               </div>
               <div>
                  <h3 className="font-semibold text-white tracking-wide">{profile.displayName}</h3>
                  <p className="text-sm text-gray-400">{profile.email}</p>
               </div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-6 py-2.5 bg-[#1E293B] hover:bg-[#283548] text-white text-sm font-semibold rounded-lg border border-[#334155] transition-colors flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              SIGN OUT
            </button>
          </div>
        </section>
      </div>
    </HubContainer>
  );
}
