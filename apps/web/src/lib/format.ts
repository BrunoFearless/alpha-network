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
