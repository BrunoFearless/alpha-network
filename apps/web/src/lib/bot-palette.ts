/**
 * Bot Color Palette
 * Predefined colors for bot customization
 */

export interface ColorOption {
  name: string;
  hex: string;
  label: string;
}

export const BOT_COLOR_PALETTE: ColorOption[] = [
  { name: 'Gold', hex: '#C9A84C', label: '✨ Ouro' },
  { name: 'Crimson', hex: '#DC2626', label: '❤️ Carmesim' },
  { name: 'Sky', hex: '#0EA5E9', label: '🔵 Céu' },
  { name: 'Emerald', hex: '#10B981', label: '💚 Esmeralda' },
  { name: 'Purple', hex: '#A855F7', label: '💜 Roxo' },
  { name: 'Orange', hex: '#F97316', label: '🧡 Laranja' },
  { name: 'Pink', hex: '#EC4899', label: '💖 Rosa' },
  { name: 'Teal', hex: '#14B8A6', label: '💎 Teal' },
  { name: 'Indigo', hex: '#6366F1', label: '💙 Índigo' },
  { name: 'Amber', hex: '#F59E0B', label: '🌟 Âmbar' },
];

export const DEFAULT_BOT_COLOR = '#C9A84C';

export function getColorByHex(hex: string): ColorOption | undefined {
  return BOT_COLOR_PALETTE.find(c => c.hex.toUpperCase() === hex.toUpperCase());
}

export function getColorLabel(hex: string): string {
  const color = getColorByHex(hex);
  return color ? color.label : hex;
}
