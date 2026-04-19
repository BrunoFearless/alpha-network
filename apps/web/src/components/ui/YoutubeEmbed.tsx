'use client';
import React, { useState } from 'react';

/**
 * Extracts a YouTube video ID from any standard YouTube URL format:
 * - https://www.youtube.com/watch?v=ID
 * - https://youtu.be/ID
 * - https://youtube.com/shorts/ID
 */
export function extractYoutubeId(text: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return null;
}

interface YoutubeEmbedProps {
  videoId: string;
  title?: string;
  channel?: string;
  thumbnail?: string;
  accentColor?: string;
  compact?: boolean; // compact = thumbnail preview + click to load iframe (avoids layout shift)
}

export function YoutubeEmbed({ videoId, title, channel, thumbnail, accentColor = '#e879f9', compact = true }: YoutubeEmbedProps) {
  const [loaded, setLoaded] = useState(!compact);
  const thumbUrl = thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

  if (!loaded) {
    return (
      <div
        className="relative w-full rounded-2xl overflow-hidden cursor-pointer group"
        style={{ aspectRatio: '16/9', background: '#000' }}
        onClick={() => setLoaded(true)}
      >
        <img src={thumbUrl} alt={title || 'YouTube Video'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90"/>
        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl border-2 border-white/30 transition-transform group-hover:scale-110"
            style={{ background: accentColor }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
        {/* Bottom info */}
        {(title || channel) && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            {title && <p className="text-white text-[12px] font-bold leading-tight line-clamp-1">{title}</p>}
            {channel && <p className="text-white/60 text-[10px] mt-0.5 font-semibold">{channel}</p>}
          </div>
        )}
        {/* YouTube badge */}
        <div className="absolute top-2.5 right-2.5 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow">YT</div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
        title={title || 'YouTube Video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-0"
      />
    </div>
  );
}
