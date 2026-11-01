/** Formata uma data para "há X minutos", "ontem", etc. */
export function formatRelative(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diff < 60)     return 'agora mesmo';
  if (diff < 3600)   return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400)  return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`;
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

/** Formata hora: 14:32 */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

/** Formata data completa: 1 jan. 2026 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Retorna o tempo decorrido no formato padrão das redes sociais:
 * "10s", "30min", "2d", "3 semanas", "5 meses", "3 anos"
 */
export function formatTimeAgo(date: string | Date | number): string {
  if (!date) return '';
  const d = typeof date === 'number' ? new Date(date) : new Date(date);
  const time = d.getTime();
  if (isNaN(time)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));

  if (diffSec < 10) return 'agora';
  if (diffSec < 60) return `${diffSec}s`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'}`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'}`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} ${diffYears === 1 ? 'ano' : 'anos'}`;
}
