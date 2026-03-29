import { Suspense } from 'react';
import AuthCallbackInner from './AuthCallbackInner';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <AuthCallbackInner />
    </Suspense>
  );
}

function CallbackLoading() {
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
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '2px solid rgba(201,168,76,0.15)',
        borderTopColor: '#c9a84c',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: 15, color: '#9890b8', fontStyle: 'italic' }}>
        A carregar…
      </p>
    </div>
  );
}
