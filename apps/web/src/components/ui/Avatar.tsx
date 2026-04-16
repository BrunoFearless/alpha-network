import clsx from 'clsx';
import { useState, useMemo, useEffect, useRef } from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: React.CSSProperties;
  play?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getInitials(name: string) {
  if (!name) return '?';
  return name.trim().split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase() || '?';
}

const sizes = {
  xs: 'w-6  h-6  text-[10px]',
  sm: 'w-8  h-8  text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-32 h-32 text-4xl', // 128px
};

export function Avatar({ src: rawSrc, name, size = 'md', className, style, play = true }: AvatarProps) {
  const [error, setError] = useState(false);
  const [isVideo, setIsVideo] = useState<boolean | null>(null);
  const [fallbackAttempted, setFallbackAttempted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const src = useMemo(() => {
    if (!rawSrc || rawSrc === 'null' || rawSrc === 'undefined') return null;

    let url = String(rawSrc);
    if (!url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      const path = url.startsWith('/') ? url : `/${url}`;
      url = `${API_BASE}${path}`;
    }
    return url;
  }, [rawSrc]);

  useEffect(() => {
    setError(false);
    setFallbackAttempted(false);
    if (!src) {
      setIsVideo(false);
      return;
    }

    const isKnownVideo = /\.(mp4|webm|mov|ogg|m4v|3gp|flv|quicktime)(?:\?|#|$)/i.test(src) ||
      src.startsWith('data:video/') ||
      src.startsWith('blob:') ||
      src.toLowerCase().includes('video');

    setIsVideo(isKnownVideo);
  }, [src]);

  // Optimized Playback Control
  useEffect(() => {
    if (!videoRef.current) return;
    if (play) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [play, isVideo, src]);

  const initialsLayer = (
    <div
      className={clsx(
        'absolute inset-0 flex items-center justify-center font-display text-gold bg-gold/10 border border-gold/25 rounded-full',
        className
      )}
      style={style}
    >
      {getInitials(name)}
    </div>
  );

  if (!src || error) {
    return (
      <div className={clsx('relative flex-shrink-0 flex items-center justify-center', sizes[size], className)} style={style}>
        {initialsLayer}
      </div>
    );
  }

  return (
    <div className={clsx('relative flex-shrink-0 overflow-hidden rounded-full shadow-inner', sizes[size], className)} style={style}>
      {initialsLayer}

      {!error && (
        <div className="absolute inset-0 z-10 w-full h-full">
          {isVideo ? (
            <video
              ref={videoRef}
              key={`${src}-vid`}
              src={src}
              autoPlay={play}
              muted
              loop
              playsInline
              preload="metadata"
              disablePictureInPicture
              disableRemotePlayback
              onError={() => {
                if (isVideo === true && !fallbackAttempted) {
                  setFallbackAttempted(true);
                  setIsVideo(false);
                } else {
                  setError(true);
                }
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              key={`${src}-img`}
              src={src}
              alt=""
              onError={() => {
                if (isVideo === false && !fallbackAttempted) {
                  setFallbackAttempted(true);
                  setIsVideo(true);
                } else {
                  setError(true);
                }
              }}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}
    </div>
  );
}
