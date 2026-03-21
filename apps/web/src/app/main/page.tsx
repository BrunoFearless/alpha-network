'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

const MODES = [
  {
    id: 'lazer',
    label: 'Lazer',
    icon: '🎮',
    description: 'Feed de posts, reações e comentários. A tua zona social.',
    color: 'border-green-500/30 hover:border-green-500/50',
    badgeVariant: 'green' as const,
  },
  {
    id: 'creator',
    label: 'Criador',
    icon: '✍️',
    description: 'Publica artigos, partilha o teu portfólio e constrói a tua presença.',
    color: 'border-purple-500/30 hover:border-purple-500/50',
    badgeVariant: 'purple' as const,
  },
  {
    id: 'developer',
    label: 'Developer',
    icon: '💻',
    description: 'Projectos, ficheiros e chat em tempo real integrado.',
    color: 'border-blue-500/30 hover:border-blue-500/50',
    badgeVariant: 'blue' as const,
  },
  {
    id: 'community',
    label: 'Comunidade',
    icon: '🏘️',
    description: 'Servidores, canais de texto e chat ao estilo Discord.',
    color: 'border-orange-500/30 hover:border-orange-500/50',
    badgeVariant: 'gold' as const,
  },
  {
    id: 'bots',
    label: 'Bots',
    icon: '🤖',
    description: 'Cria bots com comandos personalizados para os teus servidores.',
    color: 'border-pink-500/30 hover:border-pink-500/50',
    badgeVariant: 'red' as const,
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user, setUser, accessToken } = useAuthStore();
  const [toggling, setToggling] = useState<string | null>(null);

  const activeModes = user?.profile?.activeModes ?? [];

  async function toggleMode(modeId: string) {
    setToggling(modeId);
    const isActive = activeModes.includes(modeId);
    const newModes = isActive
      ? activeModes.filter(m => m !== modeId)
      : [...activeModes, modeId];
    try {
      await api.patch('/users/me/modes', { modes: newModes });
      if (user) {
        setUser(
          { ...user, profile: user.profile ? { ...user.profile, activeModes: newModes } : user.profile },
          accessToken!,
        );
        if (!isActive) router.push(`/main/${modeId}`);
      }
    } catch {
      // falha silenciosa — o estado local já foi optimistically actualizado
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl text-text-primary tracking-wide mb-2">
          Olá, {user?.profile?.displayName ?? user?.profile?.username ?? 'Shadow'} ✦
        </h1>
        <p className="text-text-secondary">
          Activa os modos que queres usar. Podes mudar a qualquer momento.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODES.map(mode => {
          const isActive = activeModes.includes(mode.id);
          return (
            <Card
              key={mode.id}
              variant="bordered"
              className={`p-5 flex flex-col gap-3 border transition-colors ${mode.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">{mode.icon}</span>
                {isActive && <Badge variant={mode.badgeVariant}>Activo</Badge>}
              </div>
              <div className="flex-1">
                <h3 className="font-display text-base text-text-primary mb-1">{mode.label}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{mode.description}</p>
              </div>
              <Button
                variant={isActive ? 'secondary' : 'primary'}
                size="sm"
                loading={toggling === mode.id}
                onClick={() => toggleMode(mode.id)}
                className="w-full"
              >
                {isActive ? 'Desactivar' : 'Activar'}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
