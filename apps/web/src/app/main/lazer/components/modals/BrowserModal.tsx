'use client';

import React, { useState } from 'react';

// URL do Backend onde vive o Shield Breaker Proxy
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface BrowserModalProps {
  initialUrl: string;
  onClose: () => void;
  themeColor: string;
}

export function BrowserModal({ initialUrl, onClose, themeColor: c }: BrowserModalProps) {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [iframeKey, setIframeKey] = useState(0);

  const handleRefresh = () => {
    setIframeKey(k => k + 1);
  };

  const proxyUrl = `${API}/api/v1/lazer/proxy?target=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col p-4 md:p-12 animate-in fade-in duration-500" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(40px)' }}>
       {/* Virtual Floating Tablet Container */}
       <div className="w-full h-full max-w-[1600px] mx-auto bg-[#0a0a0a] rounded-[32px] md:rounded-[48px] border-[1.5px] border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden relative"
            style={{ borderColor: `${c}50`, boxShadow: `0 30px 100px ${c}20`, transform: 'perspective(2000px) rotateX(1deg)' }}>
          
          {/* Glowing Aura */}
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: `radial-gradient(circle at top, ${c}, transparent 60%)` }}/>

          {/* Browser Header Panel */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5 bg-white/5 backdrop-blur-2xl shrink-0 z-20 relative shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
             <div className="flex items-center gap-2 mr-2">
                <div onClick={onClose} className="w-3.5 h-3.5 rounded-full bg-[#ff3b30] hover:bg-[#ff6b60] cursor-pointer transition-colors shadow-[0_0_10px_rgba(255,59,48,0.4)]"/>
                <div className="w-3.5 h-3.5 rounded-full bg-[#ffcc00] cursor-default opacity-80"/>
                <div className="w-3.5 h-3.5 rounded-full bg-[#28cd41] cursor-default opacity-80"/>
             </div>

             <div className="flex gap-2">
                <button onClick={onClose} className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-white/70 shadow-sm">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                </button>
                <button onClick={handleRefresh} className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-white/70 shadow-sm">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 2.1-5.7L2 8"/></svg>
                </button>
             </div>

             <div className="flex-1 max-w-3xl flex items-center bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 mx-2 md:mx-4 shadow-inner ring-1 ring-white/5">
                <span className="text-[14px] opacity-40 mr-3">🌐</span>
                <input 
                  value={currentUrl}
                  readOnly
                  className="w-full bg-transparent border-none outline-none text-[12px] md:text-[13px] font-bold text-white/60 tracking-wide font-mono truncate"
                />
             </div>

             {/* Web Extraction / PopOut Button */}
             <button 
                onClick={() => window.open(currentUrl, '_blank')}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-bold tracking-widest text-[10px] uppercase ml-auto"
                style={{ color: c }}
             >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                FORÇAR ABERTURA EXTERNA
             </button>
             
             <div className="flex md:hidden ml-auto text-[10px] uppercase font-black tracking-[4px]" style={{ color: c }}>
                A.N.
             </div>
          </div>

          {/* Render Area (iframe) */}
          <div className="flex-1 relative z-10 bg-white">
             <iframe 
               key={iframeKey}
               src={proxyUrl} 
               className="w-full h-full border-none"
               sandbox="allow-same-origin allow-forms allow-popups"
               title="Alpha Secure Browser"
             />
          </div>
       </div>
    </div>
  );
}
