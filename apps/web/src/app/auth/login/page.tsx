'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const router  = useRouter();
  const login   = useAuthStore(s => s.login);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/main');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-alpha-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-gold tracking-widest">ALPHA</h1>
          <p className="text-text-muted text-sm mt-1 tracking-wider">NETWORK</p>
        </div>

        <div className="bg-alpha-surface border border-alpha-border rounded-xl p-6">
          <h2 className="font-display text-base text-text-primary mb-6 tracking-wide">Entrar</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="o-teu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
              Entrar
            </Button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-text-muted text-sm">Não tens conta? </span>
            <Link href="/auth/register" className="text-gold text-sm hover:text-gold-light transition-colors">
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}