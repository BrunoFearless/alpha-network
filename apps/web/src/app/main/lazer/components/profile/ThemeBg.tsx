export function hex2rgb(hex?: string) {
  if (!hex || !hex.startsWith('#')) return [232, 121, 249]; // default pink
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function luminance(hex?: string) {
  if (!hex || !hex.startsWith('#')) return 0;
  const [r, g, b] = hex2rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

interface ThemeBgProps {
  color: string;
  mode: 'light' | 'dark';
}

export function ThemeBg({ color, mode }: ThemeBgProps) {
  const [r, g, b] = hex2rgb(color);
  const isLight = mode === 'light';

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div 
        className={`absolute inset-0 ${isLight ? 'bg-gray-50' : 'bg-[#09090b]'}`} 
      />
      <div 
        className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full blur-[120px]" 
        style={{ background: `rgba(${r},${g},${b},${isLight ? 0.18 : 0.12})` }} 
      />
      <div 
        className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full blur-[100px]" 
        style={{ background: `rgba(${r},${g},${b},${isLight ? 0.14 : 0.09})` }} 
      />
      <div 
        className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full blur-[80px]" 
        style={{ background: `rgba(${r},${g},${b},${isLight ? 0.09 : 0.06})` }} 
      />
    </div>
  );
}
