'use client';

import React, { useState, useEffect } from 'react';
import { HubContainer } from '@/components/layout/HubContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createBrowserClient } from '@/lib/supabase/client';

export default function ProfilePage() {
  const supabase = createBrowserClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');

  // Fallback states
  const [showAvatarFallback, setShowAvatarFallback] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'fallback'>('idle');

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        setFullName(user.user_metadata?.display_name || '');
        setNickname(user.user_metadata?.nickname || '');
      }
      setIsLoading(false);
    }
    loadProfile();
  }, [supabase.auth]);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          display_name: fullName,
          nickname: nickname
        }
      });
      if (error) throw error;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!email) return;
    try {
      setPasswordStatus('idle');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setPasswordStatus('sent');
      setTimeout(() => setPasswordStatus('idle'), 4000);
    } catch (e) {
      console.error(e);
      setPasswordStatus('error');
    }
  };

  const confirmDelete = () => {
    setDeleteStatus('fallback');
    // We intentionally do not attempt `supabase.auth.admin.deleteUser()` 
    // or unbacked cascade deletes to prevent bridging destructive refactors.
  };

  if (isLoading) {
    return (
      <HubContainer>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </HubContainer>
    );
  }

  const displayNameRender = nickname || fullName || email.split('@')[0] || 'User';

  return (
    <HubContainer>
      <div className="max-w-4xl px-4 pb-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Profile</h1>
            <p className="text-gray-400">Manage your account details.</p>
          </div>
          <div className={`transition-opacity duration-300 ${saveStatus === 'saved' ? 'opacity-100' : 'opacity-0'}`}>
             <span className="flex items-center gap-1.5 px-3 py-1 bg-[#1E293B]/60 text-gray-300 rounded-full text-xs font-semibold">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M20 6L9 17l-5-5"/>
               </svg>
               Changes saved
             </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#121A2F] border border-[#1E293B] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <div 
                className="relative cursor-pointer group mb-4"
                onClick={() => {
                  setShowAvatarFallback(true);
                  setTimeout(() => setShowAvatarFallback(false), 3000);
                }}
              >
                <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-blue-900 to-[#1E293B] border-2 border-[#1E293B] flex items-center justify-center text-4xl font-bold text-white shadow-inner group-hover:border-[#334155] transition-colors overflow-hidden relative">
                  {displayNameRender.charAt(0).toUpperCase()}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#1E293B] border-2 border-[#0A0E17] flex items-center justify-center text-gray-400 shadow-xl group-hover:text-white transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </div>
                
                {/* Fallback tooltip */}
                <div className={`absolute top-full mt-4 left-1/2 -translate-x-1/2 w-48 bg-[#0A0E17] border border-[#1E293B] text-xs text-center p-2 rounded-lg text-gray-300 transition-opacity z-10 shadow-2xl ${showAvatarFallback ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  Custom avatar uploads are coming soon.
                </div>
              </div>
              <h2 className="text-xl font-bold text-white">{displayNameRender}</h2>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-1">USER</p>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-[#121A2F] border border-[#1E293B] rounded-2xl p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div>
                  <Input 
                    label="FULL NAME" 
                    placeholder="Enter full name" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <Input 
                    label="NICKNAME" 
                    placeholder="Enter nickname" 
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="mb-8">
                <Input 
                  label="EMAIL ADDRESS" 
                  value={email}
                  disabled
                />
              </div>

              <div className="mb-10">
                <h3 className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-3 px-1">SECURITY & ACCESS</h3>
                <button 
                  onClick={handlePasswordChange}
                  className="w-full bg-[#0A0E17] hover:bg-[#1E293B]/50 border border-[#1E293B] hover:border-[#334155] rounded-xl p-4 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3 text-sm font-semibold text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400 group-hover:text-blue-400 transition-colors">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Change password
                  </div>
                  <div className="text-gray-500 group-hover:text-white transition-colors">
                    {passwordStatus === 'idle' && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    )}
                    {passwordStatus === 'sent' && <span className="text-emerald-400 text-xs font-bold mr-1">RESET LINK SENT. CHECK INBOX.</span>}
                    {passwordStatus === 'error' && <span className="text-red-400 text-xs font-bold mr-1">ERROR</span>}
                  </div>
                </button>
              </div>

              <div className="flex justify-start">
                <Button 
                  onClick={handleSaveChanges} 
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-2.5 rounded-lg text-sm transition-colors w-full sm:w-auto"
                >
                  {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
                </Button>
              </div>
            </div>

            {/* Delete Account Card */}
            <div className="bg-[#121A2F] border border-[#1E293B] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Delete account</h3>
                <p className="text-sm text-gray-400 max-w-sm">Permanently remove all operational data and history.</p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex-shrink-0 px-6 py-2.5 bg-[#450a0a]/30 hover:bg-[#450a0a]/50 text-red-500 hover:text-red-400 text-xs font-bold tracking-wider rounded-lg border border-red-900/30 transition-colors"
                title="Delete Account"
              >
                DELETE ACCOUNT
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121A2F] border border-[#1E293B] rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl relative overflow-hidden">
            {deleteStatus === 'idle' ? (
              <>
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-6 mx-auto">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6L18.1 20.3a2 2 0 0 1-2 1.7H7.9a2 2 0 0 1-2-1.7L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M10 6V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"></path></svg>
                </div>
                <h3 className="text-lg font-bold text-white text-center mb-2">Delete your account forever?</h3>
                <p className="text-gray-400 text-sm text-center mb-8">
                  This action cannot be undone. All your node progress, generated flows, and focus history will be wiped.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2.5 bg-[#1E293B] hover:bg-[#283548] text-gray-300 rounded-xl text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-red-500/20 w-max"
                  >
                    Confirm Delete
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                 <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 mx-auto">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
                <h3 className="text-lg font-bold text-white text-center mb-2">Manual Processing Required</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Secure cascade deletion is currently handled offline. Please message support@poddesk.arch to have your workspace purged.
                </p>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-2 bg-[#1E293B] hover:bg-[#283548] text-white rounded-lg text-sm font-medium transition-colors inline-block"
                >
                  Understood
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </HubContainer>
  );
}
