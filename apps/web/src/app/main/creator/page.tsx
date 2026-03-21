'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Button, Card, Badge, Modal } from '@/components/ui';
import { formatDate } from '@/lib/format';

const MOCK_ARTICLES = [
  {
    id: 'a1', title: 'Como construir uma rede social em 2026',
    content: '# Como construir uma rede social\n\nNeste artigo vou partilhar...',
    slug: 'como-construir-rede-social-2026', published: true,
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 'a2', title: 'Arquitectura de microserviços — guia prático',
    content: '# Microserviços\n\nUma abordagem moderna...',
    slug: 'arquitectura-microservicos', published: false,
    publishedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'a3', title: 'TypeScript avançado — tipos que vão mudar a tua vida',
    content: '# TypeScript avançado\n\nVamos explorar...',
    slug: 'typescript-avancado', published: true,
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
];

const MOCK_PORTFOLIO = [
  { id: 'pi1', title: 'Alpha Network', description: 'Plataforma social adaptativa', link: 'https://alpha.network', imageUrl: null },
  { id: 'pi2', title: 'Shadow Garden API', description: 'API REST com NestJS e Prisma', link: null, imageUrl: null },
];

function ArticleCard({ article, onDelete, onPublish }: any) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <Card variant="bordered" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant={article.published ? 'green' : 'gray'}>
              {article.published ? 'Publicado' : 'Rascunho'}
            </Badge>
            <span className="text-xs text-text-muted">
              {article.published
                ? `Publicado em ${formatDate(article.publishedAt)}`
                : `Criado em ${formatDate(article.createdAt)}`}
            </span>
          </div>
          <h3 className="text-text-primary font-medium text-sm leading-snug">{article.title}</h3>
          <p className="text-text-muted text-xs mt-1 line-clamp-1">
            {article.content.replace(/[#*`]/g, '').trim().substring(0, 80)}...
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!article.published && (
            <Button variant="secondary" size="sm" onClick={() => onPublish(article.id)}>
              Publicar
            </Button>
          )}
          <Button variant="ghost" size="sm">Editar</Button>
          <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>✕</Button>
        </div>
      </div>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Apagar artigo?" size="sm">
        <p className="text-text-secondary text-sm mb-4">Esta acção não pode ser desfeita.</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>Cancelar</Button>
          <Button variant="danger" size="sm" onClick={() => { onDelete(article.id); setShowConfirm(false); }}>
            Apagar
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

export default function CreatorPage() {
  const router = useRouter();
  const [articles, setArticles] = useState(MOCK_ARTICLES);
  const [portfolio, setPortfolio] = useState(MOCK_PORTFOLIO);
  const [tab, setTab] = useState<'articles' | 'portfolio'>('articles');
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', description: '', link: '' });

  const published = articles.filter(a => a.published);
  const drafts    = articles.filter(a => !a.published);

  function handleDelete(id: string) {
    // TODO: DELETE /api/v1/creator/articles/:id
    setArticles(prev => prev.filter(a => a.id !== id));
  }

  function handlePublish(id: string) {
    // TODO: PATCH /api/v1/creator/articles/:id { published: true }
    setArticles(prev => prev.map(a => a.id === id ? { ...a, published: true, publishedAt: new Date().toISOString() } : a));
  }

  function handleAddPortfolio() {
    if (!newItem.title.trim()) return;
    // TODO: POST /api/v1/creator/portfolio
    setPortfolio(prev => [...prev, { id: Date.now().toString(), ...newItem, imageUrl: null }]);
    setNewItem({ title: '', description: '', link: '' });
    setShowAddPortfolio(false);
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl text-text-primary tracking-wide">✍️ Criador</h1>
          <p className="text-text-muted text-sm mt-0.5">Os teus artigos e portfólio</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => router.push('/main/creator/articles/new')}>
          + Novo artigo
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-alpha-surface border border-alpha-border rounded-lg p-1 mb-6 w-fit">
        {[{ id: 'articles', label: 'Artigos' }, { id: 'portfolio', label: 'Portfólio' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-1.5 rounded-md text-sm transition-all font-medium ${
              tab === t.id ? 'bg-gold text-alpha-bg' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'articles' && (
        <div className="space-y-6">
          {/* Publicados */}
          <div>
            <h2 className="text-xs font-display tracking-widest text-text-muted uppercase mb-3">
              Publicados ({published.length})
            </h2>
            {published.length === 0
              ? <p className="text-text-muted text-sm italic">Nenhum artigo publicado ainda.</p>
              : <div className="space-y-3">{published.map(a => <ArticleCard key={a.id} article={a} onDelete={handleDelete} onPublish={handlePublish} />)}</div>
            }
          </div>

          {/* Rascunhos */}
          <div>
            <h2 className="text-xs font-display tracking-widest text-text-muted uppercase mb-3">
              Rascunhos ({drafts.length})
            </h2>
            {drafts.length === 0
              ? <p className="text-text-muted text-sm italic">Nenhum rascunho.</p>
              : <div className="space-y-3">{drafts.map(a => <ArticleCard key={a.id} article={a} onDelete={handleDelete} onPublish={handlePublish} />)}</div>
            }
          </div>
        </div>
      )}

      {tab === 'portfolio' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button variant="secondary" size="sm" onClick={() => setShowAddPortfolio(true)}>
              + Adicionar trabalho
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {portfolio.map(item => (
              <Card key={item.id} variant="bordered" className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-text-primary font-medium text-sm">{item.title}</h3>
                    {item.description && <p className="text-text-muted text-xs mt-1">{item.description}</p>}
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer"
                        className="text-gold text-xs mt-1 hover:text-gold-light inline-block">
                        🔗 Ver projecto
                      </a>
                    )}
                  </div>
                  <button
                    className="text-text-muted hover:text-red-400 text-xs"
                    onClick={() => {
                      // TODO: DELETE /api/v1/creator/portfolio/:id
                      setPortfolio(prev => prev.filter(p => p.id !== item.id));
                    }}
                  >✕</button>
                </div>
              </Card>
            ))}
          </div>

          <Modal isOpen={showAddPortfolio} onClose={() => setShowAddPortfolio(false)} title="Adicionar ao portfólio">
            <div className="space-y-3">
              <input className="w-full bg-alpha-bg border border-alpha-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none" placeholder="Título *" value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))} />
              <input className="w-full bg-alpha-bg border border-alpha-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none" placeholder="Descrição" value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} />
              <input className="w-full bg-alpha-bg border border-alpha-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none" placeholder="Link (https://...)" value={newItem.link} onChange={e => setNewItem(p => ({ ...p, link: e.target.value }))} />
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="ghost" size="sm" onClick={() => setShowAddPortfolio(false)}>Cancelar</Button>
                <Button variant="primary" size="sm" onClick={handleAddPortfolio}>Adicionar</Button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}
