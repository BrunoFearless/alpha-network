'use client';

import React, { useState } from 'react';
// --- INLINED ICONS ---
const IconGift = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-9"/><path d="M19.3 9.4A2 2 0 0 0 18 8h-1.2l-1.4-1.4A2 2 0 0 0 14 6h-4a2 2 0 0 0-1.4.6L7.2 8H6a2 2 0 0 0-1.3 1.4A2 2 0 0 0 5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-.7-1.6z"/><path d="M12 8V6"/></svg>
);
const IconDiamond = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="m11 3-3 6 4 12 4-12-3-6"/><path d="M2 9h20"/></svg>
);
const IconSticker = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8a2 2 0 0 0-2-2h-4V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4h4a2 2 0 0 0 2-2z"/></svg>
);
const IconShield = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const IconX = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
);
const IconLock = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></svg>
);
const IconWorld = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M3.6 9h16.8"/><path d="M3.6 15h16.8"/><path d="M11.5 3a17 17 0 0 0 0 18"/><path d="M12.5 3a17 17 0 0 1 0 18"/></svg>
);

interface GiftSelectionModalProps {
  receiverName: string;
  onClose: () => void;
  onSend: (type: string, message: string, isPrivate: boolean) => Promise<void>;
}

const GIFT_TYPES = [
  { 
    id: 'STICKER', 
    name: 'Pack de Stickers', 
    description: 'Envia um set de stickers animados exclusivos.', 
    icon: <IconSticker size={24} />, 
    color: '#A5E600',
    gradient: 'linear-gradient(135deg, #A5E600 0%, #5865F2 100%)'
  },
  { 
    id: 'BADGE', 
    name: 'Emblema Premium', 
    description: 'Um badge raro para o perfil do utilizador.', 
    icon: <IconShield size={24} />, 
    color: '#F0B132',
    gradient: 'linear-gradient(135deg, #F0B132 0%, #D83C3E 100%)'
  },
  { 
    id: 'NITRO', 
    name: 'Alpha Nitro (Trial)', 
    description: 'Dá acesso a funcionalidades premium por tempo limitado.', 
    icon: <IconDiamond size={24} />, 
    color: '#5865F2',
    gradient: 'linear-gradient(135deg, #5865F2 0%, #EB459E 100%)'
  },
];

export function GiftSelectionModal({ receiverName, onClose, onSend }: GiftSelectionModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!selectedType) return;
    setSending(true);
    try {
      await onSend(selectedType, message, isPrivate);
      onClose();
    } catch (err) {
      console.error('Failed to send gift:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: 480,
        background: '#111214',
        borderRadius: 24,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Enviar Presente</h2>
            <p style={{ margin: '4px 0 0', color: '#B5BAC1', fontSize: 13 }}>Surpreende @{receiverName} com algo especial</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B5BAC1', cursor: 'pointer' }}>
            <IconX size={18} />
          </button>
        </div>

        <div style={{ padding: '0 24px 24px', flex: 1, overflowY: 'auto' }}>
          {/* Gift List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {GIFT_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 16,
                  background: selectedType === type.id ? 'rgba(165, 230, 0, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${selectedType === type.id ? '#A5E600' : 'rgba(255, 255, 255, 0.05)'}`,
                  borderRadius: 16,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={e => {
                  if (selectedType !== type.id) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                }}
                onMouseLeave={e => {
                  if (selectedType !== type.id) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: type.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: `0 8px 20px ${type.color}33`
                }}>
                  {type.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{type.name}</div>
                  <div style={{ color: '#B5BAC1', fontSize: 12 }}>{type.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Privacy Toggle */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#B5BAC1', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Privacidade</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={() => setIsPrivate(false)}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: 12, 
                  background: !isPrivate ? 'rgba(165, 230, 0, 0.1)' : 'rgba(255, 255, 255, 0.03)', 
                  border: `1px solid ${!isPrivate ? '#A5E600' : 'rgba(255, 255, 255, 0.05)'}`,
                  color: !isPrivate ? '#A5E600' : '#B5BAC1',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer'
                }}
              >
                <IconWorld size={16} /> Público
              </button>
              <button 
                onClick={() => setIsPrivate(true)}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: 12, 
                  background: isPrivate ? 'rgba(165, 230, 0, 0.1)' : 'rgba(255, 255, 255, 0.03)', 
                  border: `1px solid ${isPrivate ? '#A5E600' : 'rgba(255, 255, 255, 0.05)'}`,
                  color: isPrivate ? '#A5E600' : '#B5BAC1',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer'
                }}
              >
                <IconLock size={16} /> Privado
              </button>
            </div>
          </div>

          {/* Optional Message */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#B5BAC1', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Mensagem Personalizada</label>
            <textarea
              placeholder="Escreve algo carinhoso..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
                padding: 12,
                color: '#fff',
                fontSize: 14,
                minHeight: 80,
                outline: 'none',
                resize: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#A5E600'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
          </div>

          {/* Action Button */}
          <button
            onClick={handleSend}
            disabled={!selectedType || sending}
            style={{
              width: '100%',
              padding: '14px',
              background: '#A5E600',
              border: 'none',
              borderRadius: 12,
              color: '#000',
              fontWeight: 800,
              fontSize: 15,
              cursor: (!selectedType || sending) ? 'not-allowed' : 'pointer',
              opacity: (!selectedType || sending) ? 0.6 : 1,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
            onMouseEnter={e => {
              if (selectedType && !sending) e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              if (selectedType && !sending) e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {sending ? 'A enviar...' : (
              <>
                <IconGift size={20} /> Enviar Presente
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
