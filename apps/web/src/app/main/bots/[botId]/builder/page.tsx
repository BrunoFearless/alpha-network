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

function TriggerNode({ data }: NodeProps) {
  return (
    <div
      style={{
        background: '#141620',
        border: '1px solid rgba(201,168,76,0.35)',
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 160,
        color: '#E8E0F0',
        fontSize: 12,
      }}
    >
      <div style={{ color: '#C9A84C', fontWeight: 700, marginBottom: 4 }}>Trigger</div>
      <div>{String(data.event ?? 'MESSAGE_CREATE')}</div>
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
        minWidth: 180,
        color: '#E8E0F0',
        fontSize: 12,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ color: '#93c5fd', fontWeight: 700, marginBottom: 4 }}>Condição</div>
      {kind === 'contains' && (
        <label style={{ display: 'block' }}>
          <span style={{ color: '#504870', display: 'block', marginBottom: 4 }}>contém</span>
          <input
            value={String(data.value ?? '')}
            onChange={e => {
              const v = e.target.value;
              setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, value: v } } : n)));
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
          />
        </label>
      )}
      {kind === 'channel' && (
        <label style={{ display: 'block' }}>
          <span style={{ color: '#504870', display: 'block', marginBottom: 4 }}>canal (id)</span>
          <input
            value={String(data.channelId ?? '')}
            onChange={e => {
              const v = e.target.value;
              setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, channelId: v } } : n)));
            }}
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
  return (
    <div
      style={{
        background: '#141620',
        border: '1px solid rgba(74,222,128,0.35)',
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 200,
        color: '#E8E0F0',
        fontSize: 12,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ color: '#86efac', fontWeight: 700, marginBottom: 4 }}>Ação</div>
      <label style={{ display: 'block' }}>
        <span style={{ color: '#504870', display: 'block', marginBottom: 4 }}>resposta (reply)</span>
        <textarea
          value={String(data.text ?? '')}
          onChange={e => {
            const v = e.target.value;
            setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, text: v } } : n)));
          }}
          rows={3}
          style={{
            width: '100%',
            background: '#07080D',
            border: '1px solid rgba(180,160,255,0.15)',
            borderRadius: 6,
            padding: '6px 8px',
            color: '#E8E0F0',
            fontSize: 12,
            resize: 'vertical',
          }}
        />
      </label>
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
      nodes.push({
        id,
        type: 'condition',
        position: { x, y },
        data:
          n.kind === 'contains'
            ? { kind: 'contains', value: n.value }
            : { kind: 'channel', channelId: n.channelId },
      });
    } else if (n.type === 'action') {
      nodes.push({
        id,
        type: 'action',
        position: { x, y },
        data: { kind: 'reply', text: n.kind === 'reply' ? n.text : '' },
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
        event: (n.data.event as 'MESSAGE_CREATE') ?? 'MESSAGE_CREATE',
      });
    } else if (n.type === 'condition') {
      const k = n.data.kind as string;
      if (k === 'channel') {
        out.push({ id: n.id, type: 'condition', kind: 'channel', channelId: String(n.data.channelId ?? '') });
      } else {
        out.push({ id: n.id, type: 'condition', kind: 'contains', value: String(n.data.value ?? '') });
      }
    } else if (n.type === 'action') {
      out.push({ id: n.id, type: 'action', kind: 'reply', text: String(n.data.text ?? '') });
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

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge(params, eds)),
    [setEdges],
  );

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
        Liga os blocos de cima para baixo: Trigger → Condição → Ação. O motor corre na ordem das ligações.
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
