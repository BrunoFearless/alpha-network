'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const MODES = [
  { id: 'lazer',     label: 'Lazer',      icon: '🎮', href: '/main/lazer',     color: 'text-green-400'  },
  { id: 'creator',   label: 'Criador',    icon: '✍️',  href: '/main/creator',   color: 'text-purple-400' },
  { id: 'developer', label: 'Developer',  icon: '💻', href: '/main/developer', color: 'text-blue-400'   },
  { id: 'community', label: 'Comunidade', icon: '🏘️',  href: '/main/community', color: 'text-orange-400' },
  { id: 'bots',      label: 'Bots',       icon: '🤖', href: '/main/bots',      color: 'text-pink-400'   },
];

interface SidebarProps {
  activeModes?: string[];
  collapsed?: boolean;
}

export function Sidebar({ activeModes = [], collapsed = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={clsx(
      'bg-alpha-surface border-r border-alpha-border flex flex-col transition-all duration-200',
      collapsed ? 'w-14' : 'w-56',
    )}>
      <div className="flex-1 py-4 space-y-1 overflow-y-auto">
        {MODES.map(mode => {
          const isActive  = pathname.startsWith(mode.href);
          const isEnabled = activeModes.includes(mode.id);

          return (
            <Link
              key={mode.id}
              href={isEnabled ? mode.href : '/main'}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all',
                isActive  ? 'bg-gold/10 text-gold' : 'text-text-secondary hover:text-text-primary hover:bg-white/5',
                !isEnabled && 'opacity-40 cursor-not-allowed',
              )}
            >
              <span className="text-lg flex-shrink-0">{mode.icon}</span>
              {!collapsed && (
                <span className="text-sm font-medium truncate">{mode.label}</span>
              )}
              {!collapsed && isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" />
              )}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
