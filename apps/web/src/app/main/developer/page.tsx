'use client';
import { useState } from 'react';
import { Avatar, Button, Card, Badge, Modal } from '@/components/ui';
import { formatRelative } from '@/lib/format';

const MOCK_PROJECTS = [
  {
    id: 'pr1', name: 'Alpha Network', description: 'Plataforma social adaptativa',
    isPublic: false, role: 'owner',
    membersCount: 6, filesCount: 24, tasksCount: 8,
    updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'pr2', name: 'Shadow Garden API', description: 'API REST do sistema de autenticação',
    isPublic: true, role: 'member',
    membersCount: 2, filesCount: 7, tasksCount: 3,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
];

const MOCK_FILES = [
  { id: 'f1', name: 'main.ts', path: 'src/main.ts' },
  { id: 'f2', name: 'app.module.ts', path: 'src/app.module.ts' },
  { id: 'f3', name: 'auth.service.ts', path: 'src/auth/auth.service.ts' },
  { id: 'f4', name: 'schema.prisma', path: 'prisma/schema.prisma' },
];

const MOCK_TASKS = [
  { id: 't1', title: 'Implementar JWT refresh token', completed: true },
  { id: 't2', title: 'Criar endpoint de registo', completed: true },
  { id: 't3', title: 'Adicionar Google OAuth', completed: false },
  { id: 't4', title: 'Testes de integração', completed: false },
];

const MOCK_MESSAGES = [
  { id: 'm1', authorId: 'u2', authorName: 'Alpha', content: 'O endpoint de login está pronto para testar.', createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
  { id: 'm2', authorId: 'u3', authorName: 'Beta', content: 'Testei aqui, está a funcionar! 🎉', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: 'm3', authorId: 'u1', authorName: 'Shadow', content: 'Excelente. Podem avançar para o refresh token.', createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
];

const MOCK_FILE_CONTENT = `import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(3001);
  console.log('🚀 API running on http://localhost:3001/api/v1');
}
bootstrap();`;

function Workspace({ project, onBack }: { project: any; onBack: () => void }) {
  const [view, setView]             = useState<'files' | 'tasks' | 'chat'>('files');
  const [activeFile, setActiveFile] = useState<any>(MOCK_FILES[0]);
  const [fileContent, setFileContent] = useState(MOCK_FILE_CONTENT);
  const [tasks, setTasks]           = useState(MOCK_TASKS);
  const [messages, setMessages]     = useState(MOCK_MESSAGES);
  const [newTask, setNewTask]       = useState('');
  const [chatText, setChatText]     = useState('');

  function toggleTask(id: string) {
    // TODO: PATCH /api/v1/developer/tasks/:id
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }

  function addTask() {
    if (!newTask.trim()) return;
    // TODO: POST /api/v1/developer/projects/:id/tasks
    setTasks(prev => [...prev, { id: Date.now().toString(), title: newTask, completed: false }]);
    setNewTask('');
  }

  function sendMessage() {
    if (!chatText.trim()) return;
    // TODO: socket.emit('message.send', { projectId, content: chatText })
    setMessages(prev => [...prev, {
      id: Date.now().toString(), authorId: 'u1', authorName: 'Shadow',
      content: chatText, createdAt: new Date().toISOString(),
    }]);
    setChatText('');
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar do projecto */}
      <aside className="w-56 bg-alpha-surface border-r border-alpha-border flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-alpha-border">
          <button onClick={onBack} className="text-text-muted hover:text-text-primary text-xs mb-2 block transition-colors">
            ← Projectos
          </button>
          <p className="font-display text-gold text-sm tracking-wide truncate">{project.name}</p>
          <div className="flex gap-1 mt-1">
            <Badge variant={project.isPublic ? 'blue' : 'gray'}>{project.isPublic ? 'Público' : 'Privado'}</Badge>
            <Badge variant="gold">{project.role}</Badge>
          </div>
        </div>

        {/* Nav */}
        <div className="flex border-b border-alpha-border">
          {[{ id: 'files', icon: '📁' }, { id: 'tasks', icon: '✅' }, { id: 'chat', icon: '💬' }].map(v => (
            <button key={v.id} onClick={() => setView(v.id as any)}
              className={`flex-1 py-2 text-sm transition-colors ${view === v.id ? 'bg-gold/10 text-gold' : 'text-text-muted hover:text-text-primary'}`}>
              {v.icon}
            </button>
          ))}
        </div>

        {/* Conteúdo da sidebar */}
        {view === 'files' && (
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {MOCK_FILES.map(f => (
              <button key={f.id} onClick={() => setActiveFile(f)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors truncate ${
                  activeFile?.id === f.id ? 'bg-gold/10 text-gold' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}>
                📄 {f.name}
              </button>
            ))}
            <button className="w-full text-left px-2 py-1.5 rounded text-xs text-text-muted hover:text-gold transition-colors">
              {/* TODO: abrir modal para criar ficheiro */}
              + novo ficheiro
            </button>
          </div>
        )}

        {view === 'tasks' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-2">
                <input type="checkbox" checked={t.completed} onChange={() => toggleTask(t.id)}
                  className="accent-gold cursor-pointer" />
                <span className={`text-xs flex-1 ${t.completed ? 'line-through text-text-muted' : 'text-text-secondary'}`}>
                  {t.title}
                </span>
              </div>
            ))}
            <div className="pt-2 flex gap-1">
              <input value={newTask} onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Nova tarefa..." className="flex-1 bg-alpha-bg border border-alpha-border rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-muted outline-none" />
              <Button size="sm" variant="ghost" onClick={addTask}>+</Button>
            </div>
          </div>
        )}

        {view === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden p-0">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map(m => (
                <div key={m.id}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-xs font-medium text-gold">{m.authorName}</span>
                    <span className="text-[10px] text-text-muted">{formatRelative(m.createdAt)}</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{m.content}</p>
                </div>
              ))}
            </div>
            {/* TODO: socket.io-client — ver guia Alexandre Dia 12 */}
            <div className="p-2 border-t border-alpha-border flex gap-1">
              <input value={chatText} onChange={e => setChatText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Mensagem..." className="flex-1 bg-alpha-bg border border-alpha-border rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-muted outline-none" />
              <Button size="sm" variant="primary" onClick={sendMessage}>↑</Button>
            </div>
          </div>
        )}
      </aside>

      {/* Área principal — editor de ficheiro */}
      {view === 'files' && activeFile && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-alpha-border bg-alpha-surface flex items-center gap-2">
            <span className="text-xs text-text-muted font-mono">{activeFile.path}</span>
            <Badge variant="blue">TypeScript</Badge>
          </div>
          <textarea
            className="flex-1 bg-alpha-bg p-4 text-xs font-mono text-text-primary resize-none outline-none leading-relaxed"
            value={fileContent}
            onChange={e => {
              setFileContent(e.target.value);
              // TODO: PATCH /api/v1/developer/files/:id { content }
            }}
          />
        </div>
      )}

      {(view === 'tasks' || view === 'chat') && (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          <p>Usa a sidebar para navegar</p>
        </div>
      )}
    </div>
  );
}

export default function DeveloperPage() {
  const [projects, setProjects]       = useState(MOCK_PROJECTS);
  const [activeProject, setActive]    = useState<any>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [newProject, setNewProject]   = useState({ name: '', description: '', isPublic: false });

  function handleCreate() {
    if (!newProject.name.trim()) return;
    // TODO: POST /api/v1/developer/projects
    const p = { id: Date.now().toString(), ...newProject, role: 'owner', membersCount: 1, filesCount: 0, tasksCount: 0, updatedAt: new Date().toISOString() };
    setProjects(prev => [p, ...prev]);
    setNewProject({ name: '', description: '', isPublic: false });
    setShowCreate(false);
  }

  if (activeProject) return <Workspace project={activeProject} onBack={() => setActive(null)} />;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl text-text-primary tracking-wide">💻 Developer</h1>
          <p className="text-text-muted text-sm mt-0.5">Os teus projectos de código</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>+ Novo projecto</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {projects.map(p => (
          <Card key={p.id} variant="bordered" className="p-5 cursor-pointer hover:border-gold/30 transition-colors" onClick={() => setActive(p)}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-text-primary text-sm tracking-wide truncate">{p.name}</h3>
                <p className="text-text-muted text-xs mt-0.5 truncate">{p.description}</p>
              </div>
              <div className="flex gap-1 ml-2">
                <Badge variant={p.isPublic ? 'blue' : 'gray'}>{p.isPublic ? 'Público' : 'Privado'}</Badge>
                <Badge variant="gold">{p.role}</Badge>
              </div>
            </div>
            <div className="flex gap-4 text-xs text-text-muted">
              <span>👥 {p.membersCount}</span>
              <span>📄 {p.filesCount}</span>
              <span>✅ {p.tasksCount}</span>
              <span className="ml-auto">{formatRelative(p.updatedAt)}</span>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Novo projecto">
        <div className="space-y-3">
          <input className="w-full bg-alpha-bg border border-alpha-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none" placeholder="Nome do projecto *" value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} />
          <input className="w-full bg-alpha-bg border border-alpha-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none" placeholder="Descrição" value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={newProject.isPublic} onChange={e => setNewProject(p => ({ ...p, isPublic: e.target.checked }))} className="accent-gold" />
            <span className="text-sm text-text-secondary">Projecto público</span>
          </label>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={handleCreate}>Criar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
