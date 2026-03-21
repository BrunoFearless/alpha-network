'use client';
import { useState } from 'react';
import { Avatar, Button, Card, Badge } from '@/components/ui';
import { formatRelative } from '@/lib/format';

// ── MOCK DATA (substituir por chamadas reais à API) ──────────────────
const MOCK_USER = { id: 'u1', username: 'shadow', displayName: 'Shadow', avatarUrl: null };

const MOCK_POSTS = [
  {
    id: 'p1', content: 'Primeiro post na Alpha Network. Esta plataforma vai ser incrível! 🚀',
    imageUrl: null, createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    author: { id: 'u2', username: 'alpha', displayName: 'Alpha', avatarUrl: null },
    reactionsCount: 12, commentsCount: 3, userReacted: false,
  },
  {
    id: 'p2', content: 'A Shadow Garden está a crescer. Em breve teremos notícias.',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    author: { id: 'u3', username: 'beta', displayName: 'Beta', avatarUrl: null },
    reactionsCount: 28, commentsCount: 7, userReacted: true,
  },
  {
    id: 'p3', content: 'Treino concluído. Delta não descansa nunca 💪',
    imageUrl: null, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    author: { id: 'u4', username: 'delta', displayName: 'Delta', avatarUrl: null },
    reactionsCount: 45, commentsCount: 12, userReacted: false,
  },
];

// ── COMPONENTE PostCard ───────────────────────────────────────────────
function PostCard({ post }: { post: typeof MOCK_POSTS[0] }) {
  const [liked, setLiked]   = useState(post.userReacted);
  const [likes, setLikes]   = useState(post.reactionsCount);
  const [showComments, setShowComments] = useState(false);

  function toggleLike() {
    // TODO: chamar POST /api/v1/lazer/posts/:id/reactions
    setLiked(prev => !prev);
    setLikes(prev => liked ? prev - 1 : prev + 1);
  }

  return (
    <Card variant="bordered" className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar src={post.author.avatarUrl} name={post.author.displayName} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-text-primary font-medium text-sm">{post.author.displayName}</p>
          <p className="text-text-muted text-xs">@{post.author.username} · {formatRelative(post.createdAt)}</p>
        </div>
        {post.author.id === MOCK_USER.id && (
          <button className="text-text-muted hover:text-red-400 text-xs transition-colors">
            {/* TODO: chamar DELETE /api/v1/lazer/posts/:id */}
            ✕
          </button>
        )}
      </div>

      {/* Conteúdo */}
      <p className="text-text-primary text-sm leading-relaxed mb-3">{post.content}</p>

      {/* Imagem opcional */}
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt=""
          className="rounded-lg w-full object-cover max-h-64 mb-3"
        />
      )}

      {/* Acções */}
      <div className="flex items-center gap-5 pt-2 border-t border-alpha-border">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-red-400' : 'text-text-muted hover:text-red-400'}`}
        >
          <span>{liked ? '❤️' : '🤍'}</span>
          <span>{likes}</span>
        </button>
        <button
          onClick={() => setShowComments(prev => !prev)}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <span>💬</span>
          <span>{post.commentsCount}</span>
        </button>
      </div>

      {/* Comentários (mock) */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-alpha-border space-y-2">
          <div className="flex gap-2">
            <Avatar src={null} name="Gamma" size="xs" />
            <div className="bg-alpha-bg rounded-lg px-3 py-1.5 flex-1">
              <p className="text-xs text-gold font-medium">Gamma</p>
              <p className="text-xs text-text-secondary">Excelente! 🎯</p>
            </div>
          </div>
          {/* TODO: carregar comentários reais via GET /api/v1/lazer/posts/:id/comments */}
          <div className="flex gap-2 mt-2">
            <Avatar src={MOCK_USER.avatarUrl} name={MOCK_USER.displayName} size="xs" />
            <input
              className="flex-1 bg-alpha-bg border border-alpha-border rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-gold/40"
              placeholder="Escreve um comentário..."
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  // TODO: POST /api/v1/lazer/posts/:id/comments
                }
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

// ── COMPONENTE CreatePostForm ─────────────────────────────────────────
function CreatePostForm({ onPost }: { onPost: (post: any) => void }) {
  const [content,  setContent]  = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) return;
    setLoading(true);
    // TODO: substituir por POST /api/v1/lazer/posts
    await new Promise(r => setTimeout(r, 600));
    onPost({
      id: Date.now().toString(), content, imageUrl: imageUrl || null,
      createdAt: new Date().toISOString(), author: MOCK_USER,
      reactionsCount: 0, commentsCount: 0, userReacted: false,
    });
    setContent(''); setImageUrl(''); setExpanded(false); setLoading(false);
  }

  return (
    <Card variant="bordered" className="p-4">
      <div className="flex gap-3">
        <Avatar src={MOCK_USER.avatarUrl} name={MOCK_USER.displayName} size="md" />
        <div className="flex-1">
          <textarea
            className="w-full bg-alpha-bg border border-alpha-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none outline-none focus:border-gold/40 transition-colors"
            placeholder="O que estás a pensar, Shadow?"
            rows={expanded ? 3 : 1}
            value={content}
            onFocus={() => setExpanded(true)}
            onChange={e => setContent(e.target.value)}
          />
          {expanded && (
            <div className="mt-2 space-y-2">
              <input
                className="w-full bg-alpha-bg border border-alpha-border rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-gold/40"
                placeholder="URL de imagem (opcional)"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setExpanded(false); setContent(''); }}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" loading={loading} onClick={handleSubmit} disabled={!content.trim()}>
                  Publicar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────
export default function LazerPage() {
  const [posts, setPosts] = useState(MOCK_POSTS);

  function handleNewPost(post: any) {
    setPosts(prev => [post, ...prev]);
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-display text-xl text-text-primary tracking-wide">🎮 Lazer</h1>
          <p className="text-text-muted text-sm mt-0.5">O teu feed social</p>
        </div>
        <Badge variant="green">Activo</Badge>
      </div>

      {/* Criar post */}
      <CreatePostForm onPost={handleNewPost} />

      {/* Feed */}
      <div className="space-y-4">
        {posts.map(post => <PostCard key={post.id} post={post} />)}
      </div>

      {/* Carregar mais */}
      <div className="text-center pt-2">
        <Button variant="ghost" size="sm" onClick={() => {
          // TODO: GET /api/v1/lazer/feed?cursor=<lastId>
        }}>
          Carregar mais
        </Button>
      </div>
    </div>
  );
}
