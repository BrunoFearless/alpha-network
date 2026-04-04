'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Stats {
  total: number;
  success: number;
  failed: number;
  successRate: number;
  avgLatency: number;
}

interface TimelineEntry {
  hour: string;
  count: number;
  success: number;
  failed: number;
}

interface TriggerEntry {
  trigger: string;
  count: number;
  success: number;
  failed: number;
}

export default function BotAnalyticsPage() {
  const { botId } = useParams<{ botId: string }>();
  const router = useRouter();
  const [botName, setBotName] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [triggers, setTriggers] = useState<TriggerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      const [botRes, statsRes, timelineRes, triggersRes] = await Promise.all([
        api.get<{ name: string }>(`/bots/${botId}`).catch(() => null),
        api.get<Stats>(`/bots/${botId}/analytics/stats`),
        api.get<TimelineEntry[]>(`/bots/${botId}/analytics/timeline`),
        api.get<TriggerEntry[]>(`/bots/${botId}/analytics/triggers`),
      ]);

      if (botRes) setBotName(botRes.name);
      setStats(statsRes);
      setTimeline(timelineRes);
      setTriggers(triggersRes);
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, 5000); // Atualizar a cada 5s
    return () => clearInterval(interval);
  }, [botId, autoRefresh]);

  const S = {
    page: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '24px 16px',
    },
    header: {
      display: 'flex' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 24,
      paddingBottom: 16,
      borderBottom: '1px solid rgba(180,160,255,0.1)',
    },
    title: {
      fontFamily: 'Cinzel, serif',
      fontSize: 24,
      color: '#E8E0F0',
      margin: 0,
    },
    subtitle: {
      fontSize: 13,
      color: '#504870',
    },
    cardGrid: {
      display: 'grid' as const,
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 16,
      marginBottom: 32,
    },
    card: {
      background: '#141620',
      border: '1px solid rgba(180,160,255,0.1)',
      borderRadius: 12,
      padding: 20,
      textAlign: 'center' as const,
    },
    cardValue: {
      fontSize: 32,
      fontWeight: 700,
      color: '#C9A84C',
      margin: '8px 0',
    },
    cardLabel: {
      fontSize: 12,
      color: '#504870',
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
    },
    section: {
      background: '#141620',
      border: '1px solid rgba(180,160,255,0.1)',
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 700,
      color: '#E8E0F0',
      marginBottom: 16,
      margin: 0,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: 12,
    },
    th: {
      textAlign: 'left' as const,
      padding: '12px 8px',
      color: '#C9A84C',
      borderBottom: '1px solid rgba(180,160,255,0.15)',
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase' as const,
    },
    td: {
      padding: '12px 8px',
      borderBottom: '1px solid rgba(180,160,255,0.08)',
      color: '#E8E0F0',
    },
    badge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 700,
    },
    badgeSuccess: {
      background: 'rgba(34,197,94,0.15)',
      color: '#22c55e',
    },
    badgeError: {
      background: 'rgba(239,68,68,0.15)',
      color: '#f87171',
    },
    timelineBar: {
      display: 'flex' as const,
      alignItems: 'center',
      gap: 8,
    },
    bar: (ratio: number) => ({
      width: `${Math.max(20, ratio * 100)}px`,
      height: 24,
      background: 'linear-gradient(90deg, #C9A84C, #E8C97A)',
      borderRadius: 4,
      transition: 'all 0.3s',
    }),
    btn: {
      background: '#383356',
      color: '#E8E0F0',
      border: '1px solid rgba(180,160,255,0.15)',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 12,
      cursor: 'pointer',
    },
    btnActive: {
      background: '#C9A84C',
      color: '#07080D',
      borderColor: '#C9A84C',
    },
  };

  if (loading) {
    return (
      <div style={{ ...S.page as any, textAlign: 'center' }}>
        <div style={{ padding: 80 }}>
          <div style={{ fontSize: 14, color: '#504870' }}>Carregando analytics...</div>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...timeline.map(t => t.count), 1);

  return (
    <div style={S.page as any}>
      <div style={S.header as any}>
        <div>
          <h1 style={S.title as any}>{botName || 'Bot'} — Analytics</h1>
          <div style={S.subtitle}>Últimas 24 horas</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ ...(S.btn as any), ...(autoRefresh ? (S.btnActive as any) : {}) } as any}
          >
            {autoRefresh ? '⏸️ Auto-off' : '▶️ Auto-on'}
          </button>
          <button onClick={fetchData} style={S.btn as any}>
            🔄 Refresh
          </button>
          <Link href={`/main/bots/${botId}`}>
            <button style={S.btn as any}>👈 Voltar</button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={S.cardGrid as any}>
          <div style={S.card as any}>
            <div style={S.cardLabel as any}>Total Eventos</div>
            <div style={S.cardValue as any}>{stats.total}</div>
          </div>
          <div style={S.card as any}>
            <div style={S.cardLabel as any}>Taxa Sucesso</div>
            <div style={S.cardValue as any}>{stats.successRate}%</div>
          </div>
          <div style={S.card as any}>
            <div style={S.cardLabel as any}>Sucesso</div>
            <div style={{ ...S.cardValue, color: '#22c55e' } as any}>{stats.success}</div>
          </div>
          <div style={S.card as any}>
            <div style={S.cardLabel as any}>Erro</div>
            <div style={{ ...S.cardValue, color: '#f87171' } as any}>{stats.failed}</div>
          </div>
          <div style={S.card as any}>
            <div style={S.cardLabel as any}>Latência Média</div>
            <div style={S.cardValue as any}>{stats.avgLatency}ms</div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div style={S.section as any}>
          <h2 style={S.sectionTitle as any}>📈 Timeline (por hora)</h2>
          <div>
            {timeline.map((entry, idx) => {
              const hour = new Date(entry.hour).toLocaleTimeString('pt-PT', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const ratio = entry.count / maxCount;
              return (
                <div key={idx} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ minWidth: 50, fontSize: 11, color: '#504870' }}>{hour}</div>
                  <div style={S.timelineBar as any}>
                    <div style={S.bar(ratio) as any} title={`${entry.count} events`} />
                    <span style={{ fontSize: 11, color: '#E8E0F0', minWidth: 60 }}>
                      <span style={{ color: '#22c55e' }}>{entry.success}</span> /{' '}
                      <span style={{ color: '#f87171' }}>{entry.failed}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Triggers Breakdown */}
      {triggers.length > 0 && (
        <div style={S.section as any}>
          <h2 style={S.sectionTitle as any}>🎯 Por Trigger</h2>
          <table style={S.table as any}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(180,160,255,0.15)' }}>
                <th style={S.th as any}>Trigger</th>
                <th style={S.th as any}>Total</th>
                <th style={S.th as any}>Sucesso</th>
                <th style={S.th as any}>Erro</th>
              </tr>
            </thead>
            <tbody>
              {triggers.map((t, idx) => {
                const rate = t.count > 0 ? Math.round((t.success / t.count) * 100) : 0;
                return (
                  <tr key={idx}>
                    <td style={S.td as any}>{t.trigger}</td>
                    <td style={S.td as any}>{t.count}</td>
                    <td style={S.td as any}>
                      <span style={{ ...S.badge, ...S.badgeSuccess } as any}>{t.success}</span>
                    </td>
                    <td style={S.td as any}>
                      <span style={{ ...S.badge, ...S.badgeError } as any}>{t.failed}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!stats || stats.total === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#504870',
            fontSize: 14,
          }}
        >
          Nenhum evento registrado nas últimas 24 horas. Dispara eventos para ver analytics! 🤖
        </div>
      ) : null}
    </div>
  );
}
