'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '@/lib/api';
import type { BuilderFlowV1, BuilderNode } from './flow-types';

function TriggerNode({ id, data }: NodeProps) {
  const { setNodes } = useReactFlow();
  const event = (data.event as string) || 'MESSAGE_CREATE';
  return (
    <div
      style={{
        background: '#141620',
        border: '1px solid rgba(201,168,76,0.35)',
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 200,
        color: '#E8E0F0',
        fontSize: 12,
      }}
    >
      <div style={{ color: '#C9A84C', fontWeight: 700, marginBottom: 4 }}>Trigger</div>
      <select
        value={event}
        onChange={e => {
          setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, event: e.target.value } } : n)));
        }}
        style={{
          width: '100%',
          background: '#07080D',
          border: '1px solid rgba(180,160,255,0.15)',
          borderRadius: 6,
          padding: '6px 8px',
          color: '#E8E0F0',
          fontSize: 12,
        }}
      >
        <option value="MESSAGE_CREATE">Mensagem</option>
        <option value="MEMBER_JOIN">Membro entra</option>
        <option value="MEMBER_LEAVE">Membro sai</option>
        <option value="REACTION_ADD">Reação</option>
      </select>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function ConditionNode({ id, data }: NodeProps) {
  const { setNodes } = useReactFlow();
  const kind = (data.kind as string) || 'contains';
  return (
    <div
      style={{
        background: '#141620',
        border: '1px solid rgba(96,165,250,0.35)',
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 200,
        color: '#E8E0F0',
        fontSize: 12,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ color: '#93c5fd', fontWeight: 700, marginBottom: 4 }}>Condição</div>

      <select
        value={String(kind)}
        onChange={e => {
          setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, kind: e.target.value } } : n)));
        }}
        style={{
          width: '100%',
          background: '#07080D',
          border: '1px solid rgba(180,160,255,0.15)',
          borderRadius: 6,
          padding: '6px 8px',
          color: '#E8E0F0',
          fontSize: 12,
          marginBottom: 8,
        }}
      >
        <option value="contains">contém</option>
        <option value="channel">canal</option>
        <option value="admin">admin</option>
        <option value="role">role</option>
        <option value="userId">userId</option>
      </select>

      {kind === 'contains' && (
        <label style={{ display: 'block' }}>
          <input
            value={String(data.value ?? '')}
            onChange={e => {
              const v = e.target.value;
              setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, value: v } } : n)));
            }}
            placeholder="Texto..."
            style={{
              width: '100%',
              background: '#07080D',
              border: '1px solid rgba(180,160,255,0.15)',
              borderRadius: 6,
              padding: '6px 8px',
              color: '#E8E0F0',
              fontSize: 12,
            }}
          />
        </label>
      )}

      {kind === 'channel' && (
        <label style={{ display: 'block' }}>
          <input
            value={String(data.channelId ?? '')}
            onChange={e => {
              const v = e.target.value;
              setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, channelId: v } } : n)));
            }}
            placeholder="Channel ID..."
            style={{
              width: '100%',
              background: '#07080D',
              border: '1px solid rgba(180,160,255,0.15)',
              borderRadius: 6,
              padding: '6px 8px',
              color: '#E8E0F0',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          />
        </label>
      )}

      {kind === 'admin' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={(data.requireAdmin ?? false) === true}
            onChange={e => {
              setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, requireAdmin: e.target.checked } } : n)));
            }}
          />
          <span style={{ fontSize: 11 }}>Requer admin</span>
        </label>
      )}

      {kind === 'role' && (
        <label style={{ display: 'block' }}>
          <input
            value={String(data.roleId ?? '')}
            onChange={e => {
              const v = e.target.value;
              setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, roleId: v } } : n)));
            }}
            placeholder="Role ID..."
            style={{
              width: '100%',
              background: '#07080D',
              border: '1px solid rgba(180,160,255,0.15)',
              borderRadius: 6,
              padding: '6px 8px',
              color: '#E8E0F0',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          />
        </label>
      )}

      {kind === 'userId' && (
        <label style={{ display: 'block' }}>
          <input
            value={String(data.userId ?? '')}
            onChange={e => {
              const v = e.target.value;
              setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, userId: v } } : n)));
            }}
            placeholder="User ID..."
            style={{
              width: '100%',
              background: '#07080D',
              border: '1px solid rgba(180,160,255,0.15)',
              borderRadius: 6,
              padding: '6px 8px',
              color: '#E8E0F0',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          />
        </label>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function ActionNode({ id, data }: NodeProps) {
  const { setNodes } = useReactFlow();
  const kind = (data.kind as string) || 'reply';
  return (
    <div
      style={{
        background: '#141620',
        border: '1px solid rgba(74,222,128,0.35)',
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 220,
        color: '#E8E0F0',
        fontSize: 12,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ color: '#86efac', fontWeight: 700, marginBottom: 4 }}>Ação</div>

      <select
        value={String(kind)}
        onChange={e => {
          setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, kind: e.target.value } } : n)));
        }}
        style={{
          width: '100%',
          background: '#07080D',
          border: '1px solid rgba(180,160,255,0.15)',
          borderRadius: 6,
          padding: '6px 8px',
          color: '#E8E0F0',
          fontSize: 12,
          marginBottom: 8,
        }}
      >
        <option value="reply">responder</option>
        <option value="sendMessage">enviar msg</option>
        <option value="deleteMessage">deletar msg</option>
        <option value="assignRole">atribuir role</option>
        <option value="mute">mutar</option>
        <option value="wait">aguardar</option>
      </select>

      {(kind === 'reply' || kind === 'sendMessage') && (
        <label style={{ display: 'block' }}>
          <textarea
            value={String(data.text ?? '')}
            onChange={e => {
              const v = e.target.value;
              setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, text: v } } : n)));
            }}
            placeholder="Mensagem..."
            rows={3}
            style={{
              width: '100%',
              background: '#07080D',
              border: '1px solid rgba(180,160,255,0.15)',
              borderRadius: 6,
              padding: '6px 8px',
              color: '#E8E0F0',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          />
        </label>
      )}

      {kind === 'deleteMessage' && (
        <div style={{ fontSize: 11, color: '#A8A0C0', padding: '8px 0' }}>
          Deleta mensagem que acionou
        </div>
      )}

      {kind === 'assignRole' && (
        <label style={{ display: 'block' }}>
          <input
            value={String(data.roleId ?? '')}
            onChange={e => {
              const v = e.target.value;
              setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, roleId: v } } : n)));
            }}
            placeholder="Role ID..."
            style={{
              width: '100%',
              background: '#07080D',
              border: '1px solid rgba(180,160,255,0.15)',
              borderRadius: 6,
              padding: '6px 8px',
              color: '#E8E0F0',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          />
        </label>
      )}

      {kind === 'mute' && (
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 10, color: '#A8A0C0' }}>Duração (ms, máx 24h)</span>
          <input
            type="number"
            value={String(data.durationMs ?? 3600000)}
            onChange={e => {
              const v = Math.max(1, Math.min(86400000, parseInt(e.target.value) || 3600000));
              setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, durationMs: v } } : n)));
            }}
            min="1"
            max="86400000"
            step="1000"
            style={{
              width: '100%',
              background: '#07080D',
              border: '1px solid rgba(180,160,255,0.15)',
              borderRadius: 6,
              padding: '6px 8px',
              color: '#E8E0F0',
              fontSize: 11,
            }}
          />
        </label>
      )}

      {kind === 'wait' && (
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 10, color: '#A8A0C0' }}>Delay (ms, máx 60s)</span>
          <input
            type="number"
            value={String(data.delayMs ?? 5000)}
            onChange={e => {
              const v = Math.max(1, Math.min(60000, parseInt(e.target.value) || 5000));
              setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, delayMs: v } } : n)));
            }}
            min="1"
            max="60000"
            step="1000"
            style={{
              width: '100%',
              background: '#07080D',
              border: '1px solid rgba(180,160,255,0.15)',
              borderRadius: 6,
              padding: '6px 8px',
              color: '#E8E0F0',
              fontSize: 11,
            }}
          />
        </label>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

function flowToReactFlow(flow: BuilderFlowV1): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let y = 0;
  const x = 40;
  for (let i = 0; i < flow.nodes.length; i++) {
    const n = flow.nodes[i];
    const id = n.id || `n${i}`;
    if (n.type === 'trigger') {
      nodes.push({
        id,
        type: 'trigger',
        position: { x, y },
        data: { event: n.event },
      });
    } else if (n.type === 'condition') {
      const condData: Record<string, any> = { kind: n.kind };
      if (n.kind === 'contains') condData.value = n.value;
      else if (n.kind === 'channel') condData.channelId = n.channelId;
      else if (n.kind === 'admin') condData.requireAdmin = n.requireAdmin ?? false;
      else if (n.kind === 'role') condData.roleId = n.roleId;
      else if (n.kind === 'userId') condData.userId = n.userId;
      nodes.push({
        id,
        type: 'condition',
        position: { x, y },
        data: condData,
      });
    } else if (n.type === 'action') {
      const actData: Record<string, any> = { kind: n.kind };
      if (n.kind === 'reply' || n.kind === 'sendMessage') actData.text = n.text;
      else if (n.kind === 'assignRole') actData.roleId = n.roleId;
      else if (n.kind === 'mute') actData.durationMs = n.durationMs;
      else if (n.kind === 'wait') actData.delayMs = n.delayMs;
      nodes.push({
        id,
        type: 'action',
        position: { x, y },
        data: actData,
      });
    }
    y += 130;
    if (i > 0) {
      const prev = nodes[i - 1].id;
      edges.push({ id: `e${i}`, source: prev, target: id });
    }
  }
  return { nodes, edges };
}

function nodesToPayload(nodes: Node[], edges: Edge[]): BuilderFlowV1 {
  const ordered = orderNodesByEdges(nodes, edges);
  const out: BuilderNode[] = [];
  for (const n of ordered) {
    if (n.type === 'trigger') {
      out.push({
        id: n.id,
        type: 'trigger',
        event: (n.data.event as any) ?? 'MESSAGE_CREATE',
      });
    } else if (n.type === 'condition') {
      const k = n.data.kind as string;
      if (k === 'contains') {
        out.push({ id: n.id, type: 'condition', kind: 'contains', value: String(n.data.value ?? '') });
      } else if (k === 'channel') {
        out.push({ id: n.id, type: 'condition', kind: 'channel', channelId: String(n.data.channelId ?? '') });
      } else if (k === 'admin') {
        out.push({ id: n.id, type: 'condition', kind: 'admin', requireAdmin: (n.data.requireAdmin as boolean) ?? false });
      } else if (k === 'role') {
        out.push({ id: n.id, type: 'condition', kind: 'role', roleId: String(n.data.roleId ?? '') });
      } else if (k === 'userId') {
        out.push({ id: n.id, type: 'condition', kind: 'userId', userId: String(n.data.userId ?? '') });
      }
    } else if (n.type === 'action') {
      const k = n.data.kind as string;
      if (k === 'reply') {
        out.push({ id: n.id, type: 'action', kind: 'reply', text: String(n.data.text ?? '') });
      } else if (k === 'sendMessage') {
        out.push({ id: n.id, type: 'action', kind: 'sendMessage', text: String(n.data.text ?? '') });
      } else if (k === 'deleteMessage') {
        out.push({ id: n.id, type: 'action', kind: 'deleteMessage' });
      } else if (k === 'assignRole') {
        out.push({ id: n.id, type: 'action', kind: 'assignRole', roleId: String(n.data.roleId ?? '') });
      } else if (k === 'mute') {
        out.push({ id: n.id, type: 'action', kind: 'mute', durationMs: Math.max(1, Math.min(86400000, (n.data.durationMs as number) ?? 3600000)) });
      } else if (k === 'wait') {
        out.push({ id: n.id, type: 'action', kind: 'wait', delayMs: Math.max(1, Math.min(60000, (n.data.delayMs as number) ?? 5000)) });
      }
    }
  }
  return { version: 1, nodes: out };
}

function orderNodesByEdges(nodes: Node[], edges: Edge[]): Node[] {
  const trigger = nodes.find(n => n.type === 'trigger');
  if (!trigger) return nodes;
  const byId = new Map(nodes.map(n => [n.id, n]));
  const ordered: Node[] = [];
  const seen = new Set<string>();
  let cur: string | undefined = trigger.id;
  while (cur && byId.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    ordered.push(byId.get(cur)!);
    const e = edges.find(edge => edge.source === cur);
    cur = e?.target;
  }
  if (ordered.length === nodes.length) return ordered;
  return nodes;
}

function BuilderCanvas({ botId }: { botId: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge(params, eds)),
    [setEdges],
  );

  const addNode = (type: 'trigger' | 'condition' | 'action') => {
    const newId = `${type[0]}${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type,
      position: { x: 40, y: (nodes.length * 130) + 40 },
      data: type === 'trigger'
        ? { event: 'MESSAGE_CREATE' }
        : type === 'condition' 
          ? { kind: 'contains', value: '' }
          : { kind: 'reply', text: '' },
    };
    setNodes(nds => [...nds, newNode]);
  };

  const deleteNode = (id: string) => {
    const nodeToDelete = nodes.find(n => n.id === id);
    if (nodeToDelete?.type === 'trigger') {
      setErr('Não podes deletar triggers. Cada fluxo precisa de pelo menos um gatilho.');
      return;
    }
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    setSelectedId(null);
    setErr('');
  };

  const nt = useMemo(() => nodeTypes, []);

  useEffect(() => {
    api
      .get<{ name: string; builderFlow?: BuilderFlowV1 | null }>(`/bots/${botId}`)
      .then(b => {
        setName(b.name);
        if (b.builderFlow?.version === 1 && b.builderFlow.nodes?.length) {
          const { nodes: n, edges: e } = flowToReactFlow(b.builderFlow);
          setNodes(n);
          setEdges(e);
        } else {
          const flow: BuilderFlowV1 = {
            version: 1,
            nodes: [
              { id: 't1', type: 'trigger', event: 'MESSAGE_CREATE' },
              { id: 'c1', type: 'condition', kind: 'contains', value: 'olá' },
              { id: 'a1', type: 'action', kind: 'reply', text: 'Olá! 👋' },
            ],
          };
          const { nodes: n, edges: e } = flowToReactFlow(flow);
          setNodes(n);
          setEdges(e);
        }
      })
      .catch(() => router.push('/main/bots'));
  }, [botId, router, setEdges, setNodes]);

  async function save() {
    setSaving(true);
    setErr('');
    try {
      const payload = nodesToPayload(nodes, edges);
      await api.patch(`/bots/${botId}`, { builderFlow: payload });
      router.push(`/main/bots/${botId}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  }

  const S: Record<string, React.CSSProperties> = {
    page: { height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' as const },
    bar: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderBottom: '1px solid rgba(180,160,255,0.1)',
      background: '#0a0b10',
    },
    controls: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '12px 16px',
      borderBottom: '1px solid rgba(180,160,255,0.08)',
      background: 'rgba(201,168,76,0.05)',
    },
    btn: {
      background: '#383356',
      color: '#E8E0F0',
      border: '1px solid rgba(180,160,255,0.15)',
      borderRadius: 6,
      padding: '6px 12px',
      fontSize: 12,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    btnAdd: {
      background: '#C9A84C',
      color: '#07080D',
      border: 'none',
      fontWeight: 700,
    },
    btnDel: {
      background: 'rgba(239,68,68,0.1)',
      color: '#f87171',
      borderColor: 'rgba(239,68,68,0.2)',
    },
    flow: { flex: 1, minHeight: 400 },
  };

  return (
    <div style={S.page}>
      <div style={S.bar}>
        <button
          type="button"
          onClick={() => router.push(`/main/bots/${botId}`)}
          style={{ background: 'none', border: 'none', color: '#504870', fontSize: 13, cursor: 'pointer' }}
        >
          ← {name || 'Bot'}
        </button>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#E8E0F0', margin: 0, flex: 1 }}>
          Builder visual
        </h1>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{
            background: '#C9A84C',
            color: '#07080D',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            fontWeight: 700,
            cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? '…' : 'Guardar fluxo'}
        </button>
      </div>
      <div style={S.controls}>
        <span style={{ fontSize: 11, color: '#A8A0C0' }}>Adicionar:</span>
        <button type="button" onClick={() => addNode('trigger')} style={{ ...S.btn, ...S.btnAdd }}>
          ➕ Trigger
        </button>
        <button type="button" onClick={() => addNode('condition')} style={{ ...S.btn, ...S.btnAdd }}>
          ➕ Condição
        </button>
        <button type="button" onClick={() => addNode('action')} style={{ ...S.btn, ...S.btnAdd }}>
          ➕ Ação
        </button>
        {selectedId && nodes.find(n => n.id === selectedId)?.type !== 'trigger' && (
          <button 
            type="button" 
            onClick={() => deleteNode(selectedId)} 
            style={{ ...S.btn, ...S.btnDel, marginLeft: 'auto' }}
          >
            🗑️ Deletar nó
          </button>
        )}
      </div>
      {err && (
        <div style={{ padding: '8px 16px', color: '#f87171', fontSize: 12, background: 'rgba(239,68,68,0.08)' }}>{err}</div>
      )}
      <div style={S.flow}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nt}
          fitView
          onSelectionChange={(selection) => {
            setSelectedId(selection.nodes.length > 0 ? selection.nodes[0].id : null);
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="#1a1c28" />
          <Controls />
          <MiniMap
            style={{ background: '#07080D' }}
            maskColor="rgba(10,11,16,0.85)"
            nodeColor={() => '#383356'}
          />
        </ReactFlow>
      </div>
      <p style={{ padding: '8px 16px', color: '#383356', fontSize: 11, margin: 0 }}>
        Liga os blocos de cima para baixo: Trigger → Condição → Ação. O motor corre na ordem das ligações. Seleciona um nó e clica &quot;Deletar nó&quot; para remover.
      </p>
    </div>
  );
}

export default function BotBuilderPage() {
  const { botId } = useParams<{ botId: string }>();
  return (
    <ReactFlowProvider>
      <BuilderCanvas botId={botId} />
    </ReactFlowProvider>
  );
}
