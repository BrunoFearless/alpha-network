import clsx from 'clsx';

interface BadgeProps {
  variant?: 'gold' | 'green' | 'red' | 'blue' | 'purple' | 'gray';
  children: React.ReactNode;
  className?: string;
}

const variants = {
  gold:   'bg-gold/10 text-gold border-gold/30',
  green:  'bg-green-500/10 text-green-400 border-green-500/30',
  red:    'bg-red-500/10 text-red-400 border-red-500/30',
  blue:   'bg-blue-500/10 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  gray:   'bg-white/5 text-text-muted border-alpha-border',
};

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium',
      variants[variant], className,
    )}>
      {children}
    </span>
  );
}
