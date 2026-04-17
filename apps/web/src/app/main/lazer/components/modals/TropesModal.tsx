'use client';

import React, { useState, useEffect } from 'react';
import { useLazerStore, TrendingTrope } from '@/store/lazer.store';

// ── Icons ─────────────────────────────────────────────────────────────────
const IconClose = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const IconFlame = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
const IconArrowRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
const IconTrendingUp = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IconSparkle = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>;
const IconMessage = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;

interface TropesModalProps {
  onClose: () => void;
  c: string; // theme color
  isLight: boolean;
  onTropeClick?: (tropeName: string) => void;
}

export function TropesModal({ onClose, c, isLight, onTropeClick }: TropesModalProps) {
  const { trendingTropes, fetchTrendingTropes } = useLazerStore();
  const [activeTab, setActiveTab] = useState('Top 100');
  const [hoverTrope, setHoverTrope] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch if not already populated or if forced refresh is desired
    if (trendingTropes.length === 0) fetchTrendingTropes();
  }, [trendingTropes.length]);

  const bgStyle = isLight 
    ? 'rgba(255, 255, 255, 0.9)' 
    : 'rgba(5, 5, 10, 0.95)';
  const textPrimary = isLight ? 'text-black' : 'text-white';
  const textSecondary = isLight ? 'text-black/60' : 'text-white/60';
  const cardBgStyle = isLight ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.03)';
  const borderCol = isLight ? `${c}30` : `${c}15`;

  const tabs = ['Top 100', 'Rising', 'New'];

  return (
    <div className="fixed inset-0 z-50 flex flex-col font-[Nunito,sans-serif]"
         style={{ background: bgStyle, backdropFilter: 'blur(40px)' }}>
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] pointer-events-none"
           style={{ background: c }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full opacity-20 blur-[100px] pointer-events-none"
           style={{ background: '#fbbf24' }} />

      {/* Header */}
      <div className="w-full flex items-center justify-between px-8 py-6 shrink-0 relative z-10">
        <button onClick={onClose} 
           className={`w-12 h-12 flex items-center justify-center rounded-ull border border-transparent bg-transparent cursor-pointer transition-all hover:scale-110 active:scale-95 ${textPrimary}`}
           style={{ background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}>
          <IconClose />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-20 relative z-10 w-full max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row gap-12 md:items-end mb-12">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl" style={{ background: `linear-gradient(135deg, ${c}, #fbbf24)`, color: '#000' }}>
                <IconFlame />
              </span>
              <h1 className={`text-4xl md:text-5xl font-black uppercase tracking-tight ${textPrimary}`}>
                Trendings
              </h1>
            </div>
            <p className={`text-lg font-medium mt-4 max-w-xl leading-relaxed ${textSecondary}`}>
              Acompanha as experiências emocionais e vibes mais discutidas em toda a Alpha Network. Junta-te às comunidades que partilham a mesma paixão.
            </p>
          </div>
          
          <div className="flex gap-2 p-1.5 rounded-2xl shrink-0" style={{ background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }}>
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-6 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all border-none cursor-pointer"
                style={{ 
                  background: activeTab === tab ? c : 'transparent', 
                  color: activeTab === tab ? '#000' : (isLight ? '#666' : '#999'),
                  boxShadow: activeTab === tab ? `0 4px 14px ${c}40` : 'none'
                }}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trendingTropes.length === 0 ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-50">
              <IconTrendingUp />
              <p className={`mt-4 font-bold text-lg ${textPrimary}`}>Nenhum trope em alta no momento.</p>
            </div>
          ) : (
            trendingTropes.map((trope: TrendingTrope, idx: number) => {
              const rankColor = idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : c;
              
              return (
                <div key={trope.id} 
                  onMouseEnter={() => setHoverTrope(trope.id)}
                  onMouseLeave={() => setHoverTrope(null)}
                  className="group relative rounded-[28px] p-6 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
                  style={{ 
                    background: cardBgStyle, 
                    border: `1.5px solid ${hoverTrope === trope.id ? rankColor : borderCol}`,
                    boxShadow: hoverTrope === trope.id ? `0 12px 40px ${rankColor}15` : '0 4px 20px rgba(0,0,0,0.05)',
                    transform: hoverTrope === trope.id ? 'translateY(-4px)' : 'none'
                  }}
                  onClick={() => {
                    if (onTropeClick) onTropeClick(trope.name);
                    onClose();
                  }}>
                  
                  {/* Background Rank Number */}
                  <div className="absolute -right-4 -bottom-8 text-[120px] font-black opacity-[0.03] pointer-events-none select-none transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-2 group-hover:rotate-[-5deg]"
                       style={{ color: textPrimary }}>
                    {idx + 1}
                  </div>

                  <div className="flex items-start justify-between relative z-10 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center font-black text-lg rounded-full"
                        style={{ background: `${rankColor}15`, color: rankColor, boxShadow: `0 0 20px ${rankColor}20` }}>
                        #{idx + 1}
                      </div>
                      <span className="text-3xl drop-shadow-md">{trope.iconEmoji}</span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border"
                      style={{ background: 'rgba(0,0,0,0.2)', borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)', color: textPrimary }}>
                      {trope.category}
                    </span>
                  </div>

                  <h3 className={`text-xl font-black mb-1 truncate ${textPrimary}`}>#{trope.name}</h3>
                  <p className={`text-xs font-medium line-clamp-2 min-h-[32px] ${textSecondary}`}>
                    {trope.description || 'Uma vibe incrível a dominar a Alpha Network.'}
                  </p>

                  <div className="mt-5 pt-4 flex items-center gap-4 relative z-10 border-t" style={{ borderColor: borderCol }}>
                    <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#f59e0b' }}>
                      <IconSparkle /> {trope.metrics?.sparkles?.toLocaleString() || 0}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                      <IconMessage /> {trope.metrics?.talking?.toLocaleString() || 0}
                    </div>
                    
                    <div className="ml-auto w-8 h-8 rounded-full flex items-center justify-center transition-all bg-transparent group-hover:bg-black group-hover:text-white"
                         style={{ color: textPrimary }}>
                      <IconArrowRight />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
