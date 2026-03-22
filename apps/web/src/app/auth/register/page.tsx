'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import AuthPage from '@/components/features/auth/AuthPage';

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center overflow-hidden">
      <AuthPage initialMode="register" />
    </main>
  );
}



