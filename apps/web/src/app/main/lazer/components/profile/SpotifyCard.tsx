'use client';
import React from 'react';

interface SpotifyPlayback {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  albumArt?: string;
  url?: string;
  timestamp?: string;
  lastPlayed?: {
    title: string;
    artist: string;
    albumArt: string;
    url: string;
    timestamp: string;
  };
}

interface SpotifyCardProps {
  playback: SpotifyPlayback | null;
  accentColor: string;
  isLight: boolean;
}

export function SpotifyCard({ playback, accentColor, isLight }: SpotifyCardProps) {
  const isActuallyPlaying = playback?.isPlaying ?? false;
  const data = isActuallyPlaying ? playback : playback?.lastPlayed;

  if (!data) return null;

  return (
    <div 
      className="w-full rounded-[24px] p-4 flex items-center gap-4 border-[1.5px] shadow-lg backdrop-blur-3xl transition-all hover:scale-[1.02] cursor-pointer"
      style={{ 
        backgroundColor: isLight ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
        borderColor: isActuallyPlaying ? '#1db95460' : `${accentColor}20`
      }}
      onClick={() => data.url && window.open(data.url, '_blank')}
    >
      {/* Album Art with Pulse if playing */}
      <div className="relative shrink-0">
        <img 
          src={data.albumArt} 
          alt="Album Art" 
          className="w-16 h-16 rounded-2xl object-cover shadow-2xl"
        />
        {isActuallyPlaying && (
          <div className="absolute -bottom-1 -right-1 bg-[#1db954] p-1.5 rounded-full shadow-lg border-2 border-alpha-bg">
             <div className="flex gap-0.5 items-end h-2">
                <div className="w-0.5 bg-white animate-[spotify-bar_0.6s_ease-in-out_infinite]" />
                <div className="w-0.5 bg-white animate-[spotify-bar_0.8s_ease-in-out_infinite] delay-100" />
                <div className="w-0.5 bg-white animate-[spotify-bar_0.5s_ease-in-out_infinite] delay-200" />
             </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 text-[#1db954]">
           {isActuallyPlaying ? (
             <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Ouvindo Agora</span>
           ) : (
             <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Ouviu por último</span>
           )}
           <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.492 17.301c-.216.353-.673.465-1.026.249-2.859-1.748-6.458-2.143-10.697-1.176-.403.092-.806-.162-.898-.565-.092-.403.162-.806.565-.898 4.639-1.061 8.611-.611 11.807 1.344.353.216.465.673.249 1.026v.02zm1.465-3.264c-.272.443-.85.586-1.294.314-3.273-2.012-8.259-2.593-12.127-1.419-.496.151-1.027-.129-1.178-.625-.151-.497.129-1.028.625-1.178 4.417-1.34 9.914-.689 13.66 1.614.444.272.587.85.314 1.294zm.126-3.414c-3.924-2.33-10.395-2.546-14.156-1.404-.602.183-1.241-.163-1.424-.764-.183-.601.163-1.241.764-1.424 4.316-1.31 11.455-1.054 15.962 1.621.541.321.718 1.018.397 1.559-.321.541-1.018.718-1.559.397l.016-.01z"/></svg>
        </div>
        <p className={`m-0 font-black text-sm truncate ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
          {data.title}
        </p>
        <p className={`m-0 text-[12px] font-bold truncate opacity-60 ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>
          {data.artist}
        </p>
      </div>

      <style jsx>{`
        @keyframes spotify-bar {
          0%, 100% { height: 2px; }
          50% { height: 8px; }
        }
      `}</style>
    </div>
  );
}
