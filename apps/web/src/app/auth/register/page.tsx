'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';

export default function RegisterPage() {
  const router   = useRouter();
  const register = useAuthStore(s => s.register);
  const loading  = useAuthStore(s => s.isLoading);

  const [email,    setEmail]    = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await register(email, password, username);
      router.push('/main');
    } catch (err: any) {
      setError(err.message);
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
          <h2 className="font-display text-base text-text-primary mb-6 tracking-wide">Criar conta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              placeholder="o_teu_username"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase())}
              hint="Só letras, números e _. Não pode ser alterado depois."
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="o-teu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
            <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
              Criar conta
            </Button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-text-muted text-sm">Já tens conta? </span>
            <Link href="/auth/login" className="text-gold text-sm hover:text-gold-light transition-colors">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
