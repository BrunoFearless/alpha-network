'use client';
import { useState } from 'react';
import { Avatar, Button, Card, Badge, Modal } from '@/components/ui';
import { formatTime, formatRelative } from '@/lib/format';

const MOCK_ME = { id: 'u1', username: 'shadow', displayName: 'Shadow', avatarUrl: null };

const MOCK_SERVERS = [
  {
    id: 's1', name: 'Shadow Garden', description: 'Servidor oficial da Shadow Garden',
    imageUrl: null, membersCount: 7, role: 'admin', inviteCode: 'sg-2026',
    channels: [
      { id: 'c1', name: 'geral', type: 'text' },
      { id: 'c2', name: 'anúncios', type: 'text' },
      { id: 'c3', name: 'desenvolvimento', type: 'text' },
    ],
  },
  {
    id: 's2', name: 'Alpha Devs', description: 'Comunidade de developers da Alpha',
    imageUrl: null, membersCount: 24, role: 'member', inviteCode: 'alpha-dev',
    channels: [
      { id: 'c4', name: 'geral', type: 'text' },
      { id: 'c5', name: 'projectos', type: 'text' },
    ],
  },
];

const MOCK_MEMBERS = [
  { id: 'u1', username: 'shadow', displayName: 'Shadow', role: 'admin', avatarUrl: null },
  { id: 'u2', username: 'alpha', displayName: 'Alpha', role: 'admin', avatarUrl: null },
  { id: 'u3', username: 'beta', displayName: 'Beta', role: 'member', avatarUrl: null },
  { id: 'u4', username: 'gamma', displayName: 'Gamma', role: 'member', avatarUrl: null },
  { id: 'u5', username: 'delta', displayName: 'Delta', role: 'member', avatarUrl: null },
];

const MOCK_MESSAGES: Record<string, any[]> = {
  c1: [
    { id: 'm1', authorId: 'u2', authorName: 'Alpha', authorType: 'user', content: 'Bem-vindos ao servidor da Shadow Garden! 🌑', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: 'm2', authorId: 'u3', authorName: 'Beta', authorType: 'user', content: 'Obrigada, Alpha! Já criei o canal de desenvolvimento.', createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: 'm3', authorId: 'u1', authorName: 'Sombra Bot', authorType: 'bot', content: '✦ Bem-vindo ao servidor! Usa !ajuda para ver os comandos disponíveis.', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  ],
  c2: [
    { id: 'm4', authorId: 'u2', authorName: 'Alpha', authorType: 'user', content: '📢 A Alpha Network v1 está em desenvolvimento activo. Actualizações em breve.', createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
  ],
  c3: [
    { id: 'm5', authorId: 'u4', authorName: 'Gamma', authorType: 'user', content: 'A migration do Prisma foi concluída com sucesso! ✅', createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: 'm6', authorId: 'u5', authorName: 'Delta', authorType: 'user', content: 'Quando testamos o WebSocket?', createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
  ],
};

function ServerWorkspace({ server, onBack }: { server: any; onBack: () => void }) {
  const [activeChannel, setActiveChannel] = useState(server.channels[0]);
  const [messages, setMessages] = useState<Record<string, any[]>>(MOCK_MESSAGES);
  const [text, setText] = useState('');

  const channelMsgs = messages[activeChannel.id] ?? [];

  function sendMessage() {
    if (!text.trim()) return;
    // TODO: socket.emit('message.send', { channelId: activeChannel.id, content: text })
    // namespace: /community — ver guia Bruno Dias 10-11
    const newMsg = {
      id: Date.now().toString(), authorId: MOCK_ME.id,
      authorName: MOCK_ME.displayName, authorType: 'user',
      content: text, createdAt: new Date().toISOString(),
    };
    setMessages(prev => ({ ...prev, [activeChannel.id]: [...(prev[activeChannel.id] ?? []), newMsg] }));
    setText('');
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar — canais */}
      <aside className="w-56 bg-alpha-surface border-r border-alpha-border flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-alpha-border">
          <button onClick={onBack} className="text-text-muted hover:text-text-primary text-xs mb-2 block">← Servidores</button>
          <p className="font-display text-gold text-sm tracking-wide">{server.name}</p>
          <p className="text-text-muted text-xs">{server.membersCount} membros</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-[10px] font-display tracking-widest text-text-muted uppercase px-2 mb-1 mt-2">Canais de texto</p>
          {server.channels.map((ch: any) => (
            <button key={ch.id} onClick={() => setActiveChannel(ch)}
              className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                activeChannel.id === ch.id ? 'bg-gold/10 text-gold' : 'text-text-muted hover:text-text-primary hover:bg-white/5'
              }`}>
              # {ch.name}
            </button>
          ))}
          {server.role === 'admin' && (
            <button className="w-full text-left px-3 py-1.5 rounded text-xs text-text-muted hover:text-gold transition-colors mt-1">
              {/* TODO: POST /api/v1/community/servers/:id/channels */}
              + novo canal
            </button>
          )}
        </div>

        {/* Membros */}
        <div className="border-t border-alpha-border p-2">
          <p className="text-[10px] font-display tracking-widest text-text-muted uppercase px-2 mb-2">Membros</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {MOCK_MEMBERS.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-2 py-1">
                <Avatar src={m.avatarUrl} name={m.displayName} size="xs" />
                <span className="text-xs text-text-secondary truncate">{m.displayName}</span>
                {m.role === 'admin' && <span className="text-[10px] text-gold ml-auto">admin</span>}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header do canal */}
        <div className="px-4 py-3 border-b border-alpha-border bg-alpha-surface flex items-center gap-2">
          <span className="text-text-muted">#</span>
          <span className="font-medium text-text-primary">{activeChannel.name}</span>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {channelMsgs.map(msg => (
            <div key={msg.id} className="flex items-start gap-3">
              {msg.authorType === 'bot' ? (
                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs text-blue-400 font-bold flex-shrink-0">
                  🤖
                </div>
              ) : (
                <Avatar src={null} name={msg.authorName} size="sm" />
              )}
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-sm font-medium ${msg.authorType === 'bot' ? 'text-blue-400' : 'text-text-primary'}`}>
                    {msg.authorName}
                  </span>
                  {msg.authorType === 'bot' && <Badge variant="blue">Bot</Badge>}
                  <span className="text-xs text-text-muted">{formatTime(msg.createdAt)}</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {channelMsgs.length === 0 && (
            <div className="text-center py-12 text-text-muted text-sm">
              <p>Nenhuma mensagem ainda em #{activeChannel.name}</p>
              <p className="text-xs mt-1">Sê o primeiro a escrever!</p>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-alpha-border">
          <div className="flex gap-2 bg-alpha-card border border-alpha-border rounded-lg px-3 py-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={`Mensagem em #${activeChannel.name}`}
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            />
            <button onClick={sendMessage} className="text-text-muted hover:text-gold transition-colors text-sm">↑</button>
          </div>
          <p className="text-[10px] text-text-muted mt-1 px-1">
            {/* TODO: ligar ao Socket.io — namespace /community — ver guia Bruno */}
            ⚡ Chat em tempo real via WebSocket (a implementar)
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const [servers, setServers]     = useState(MOCK_SERVERS);
  const [activeServer, setActive] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin]   = useState(false);
  const [newServer, setNewServer] = useState({ name: '', description: '' });
  const [inviteCode, setInviteCode] = useState('');

  function handleCreate() {
    if (!newServer.name.trim()) return;
    // TODO: POST /api/v1/community/servers
    const s = {
      id: Date.now().toString(), ...newServer, imageUrl: null,
      membersCount: 1, role: 'admin', inviteCode: Math.random().toString(36).slice(2, 8),
      channels: [{ id: Date.now().toString(), name: 'geral', type: 'text' }],
    };
    setServers(prev => [s, ...prev]);
    setShowCreate(false);
    setNewServer({ name: '', description: '' });
  }

  function handleJoin() {
    // TODO: POST /api/v1/community/servers/join/:inviteCode
    alert(`Entrar com código: ${inviteCode} (a implementar)`);
    setShowJoin(false);
    setInviteCode('');
  }

  if (activeServer) return <ServerWorkspace server={activeServer} onBack={() => setActive(null)} />;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl text-text-primary tracking-wide">🏘️ Comunidade</h1>
          <p className="text-text-muted text-sm mt-0.5">Os teus servidores</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowJoin(true)}>Entrar com código</Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>+ Criar servidor</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {servers.map(s => (
          <Card key={s.id} variant="bordered" className="p-5 cursor-pointer hover:border-gold/30 transition-colors" onClick={() => setActive(s)}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center font-display text-gold text-lg flex-shrink-0">
                {s.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary text-sm truncate">{s.name}</p>
                <p className="text-text-muted text-xs">{s.membersCount} membros</p>
              </div>
              <Badge variant={s.role === 'admin' ? 'gold' : 'gray'}>{s.role}</Badge>
            </div>
            {s.description && <p className="text-text-muted text-xs line-clamp-2">{s.description}</p>}
            <div className="mt-3 flex gap-2 text-xs text-text-muted">
              <span>💬 {s.channels.length} canais</span>
              <span className="ml-auto">Código: {s.inviteCode}</span>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Criar servidor">
        <div className="space-y-3">
          <input className="w-full bg-alpha-bg border border-alpha-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none" placeholder="Nome do servidor *" value={newServer.name} onChange={e => setNewServer(p => ({ ...p, name: e.target.value }))} />
          <input className="w-full bg-alpha-bg border border-alpha-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none" placeholder="Descrição" value={newServer.description} onChange={e => setNewServer(p => ({ ...p, description: e.target.value }))} />
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={handleCreate}>Criar</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showJoin} onClose={() => setShowJoin(false)} title="Entrar num servidor" size="sm">
        <div className="space-y-3">
          <input className="w-full bg-alpha-bg border border-alpha-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none" placeholder="Código de convite" value={inviteCode} onChange={e => setInviteCode(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowJoin(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={handleJoin} disabled={!inviteCode.trim()}>Entrar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
