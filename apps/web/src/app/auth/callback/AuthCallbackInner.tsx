'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AuthCallbackInner() {
  const router      = useRouter();
  const params      = useSearchParams();
  const { setUser } = useAuthStore();
  const [status, setStatus]   = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState('A concluir autenticação…');

  useEffect(() => {
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Token não encontrado. Tenta novamente.');
      return;
    }

    fetch(`${API}/api/v1/auth/me`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('Token inválido.');
        return res.json();
      })
      .then(data => {
        setUser(data.data, token);
        router.replace('/main');
      })
      .catch(() => {
        setStatus('error');
        setMessage('Falha na autenticação. Por favor tenta novamente.');
      });
  }, [params, router, setUser]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07080d',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      fontFamily: "'Crimson Pro', serif",
      color: '#e8e0f0',
    }}>
      {status === 'loading' ? (
        <>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '2px solid rgba(201,168,76,0.15)',
            borderTopColor: '#c9a84c',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: 15, color: '#9890b8', fontStyle: 'italic' }}>
            {message}
          </p>
        </>
      ) : (
        <>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(192,40,74,0.12)',
            border: '1px solid rgba(192,40,74,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
          }}>
            ✕
          </div>
          <p style={{ fontSize: 15, color: '#e06070', textAlign: 'center', maxWidth: 320 }}>
            {message}
          </p>
          <button
            onClick={() => router.replace('/auth/login')}
            style={{
              marginTop: 8,
              padding: '8px 20px',
              background: 'transparent',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: 6,
              color: '#e8c97a',
              fontFamily: "'Cinzel', serif",
              fontSize: 11,
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            Voltar ao Login
          </button>
        </>
      )}
    </div>
  );
}
