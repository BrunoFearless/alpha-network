import { useState, useEffect } from 'react';

export function useImageColor(imageUrl: string | null) {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setColor(null);
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    
    img.onload = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Scale down to a very small size for extremely fast processing
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);

        const imageData = ctx.getImageData(0, 0, 50, 50);
        const data = imageData.data;
        
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let i = 0; i < data.length; i += 16) { // Step by 16 for performance
          if (data[i+3] < 128) continue; // Ignore transparent pixels
          
          r += data[i];
          g += data[i+1];
          b += data[i+2];
          count++;
        }
        
        if (count > 0) {
          r = Math.floor(r / count);
          g = Math.floor(g / count);
          b = Math.floor(b / count);
          
          // Boost saturation slightly for better glow
          const max = Math.max(r, g, b);
          if (max > 0) {
             const multiplier = Math.min(255 / max, 1.2);
             r = Math.min(255, Math.floor(r * multiplier));
             g = Math.min(255, Math.floor(g * multiplier));
             b = Math.min(255, Math.floor(b * multiplier));
          }

          setColor(`${r}, ${g}, ${b}`);
        }
      } catch (e) {
        console.warn('Could not extract image color:', e);
        // Fallback or do nothing
      }
    };

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  return color; // Returns string "r, g, b"
}
