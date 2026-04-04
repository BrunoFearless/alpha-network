'use client';
import React from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useBotBuilderStore, BuilderNode } from '@/store/bot-builder.store';
import { TriggerNode, ConditionNode, ActionNode } from './builder-nodes';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

const nodeTypes = {
  trigger: TriggerNode as React.ComponentType<any>,
  condition: ConditionNode as React.ComponentType<any>,
  action: ActionNode as React.ComponentType<any>,
};

interface BotBuilderProps {
  botId: string;
  onSave: (flow: any) => Promise<void>;
}

export function BotBuilder({ botId, onSave }: BotBuilderProps) {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    errors,
    addNode,
    addEdge: storeAddEdge,
    deleteNode,
    deleteEdge,
    validateFlow,
    getFlowJSON,
    clearFlow,
  } = useBotBuilderStore();

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(
    storeNodes.map(n => ({
      id: n.id,
      data: n.data,
      position: n.position,
      type: n.type,
    }))
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    storeEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }))
  );

  const [saving, setSaving] = useState(false);

  // Sincronizar Zustand com React Flow
  React.useEffect(() => {
    setNodes(
      storeNodes.map(n => ({
        id: n.id,
        data: n.data,
        position: n.position,
        type: n.type,
      }))
    );
  }, [storeNodes, setNodes]);

  React.useEffect(() => {
    setEdges(
      storeEdges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }))
    );
  }, [storeEdges, setEdges]);

  const handleConnect = (connection: Connection) => {
    if (connection.source && connection.target) {
      storeAddEdge(connection.source, connection.target);
    }
  };

  const handleAddNode = (type: 'trigger' | 'condition' | 'action') => {
    const randomX = Math.random() * 300;
    const randomY = Math.random() * 300 + 100;
    addNode(type, { x: randomX, y: randomY });
  };

  const handleDelete = (id: string) => {
    deleteNode(id);
  };

  const handleClear = () => {
    if (confirm('Limpar toda a flow?')) {
      clearFlow();
    }
  };

  const handleValidate = () => {
    validateFlow();
  };

  const handleSave = async () => {
    if (!validateFlow()) {
      return;
    }

    const flow = getFlowJSON();
    if (!flow) return;

    setSaving(true);
    try {
      await onSave(flow);
      alert('Flow salvo com sucesso!');
    } catch (err) {
      alert(`Erro ao salvar: ${(err as Error)?.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gold/20 bg-alpha-card p-4">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">🤖 Bot Builder</h2>
            <p className="text-sm text-text-secondary mt-1">Cria fluxos automáticos com drag-drop</p>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleValidate}>
              ✓ Validar
            </Button>
            <Button variant="secondary" size="sm" onClick={handleClear}>
              🗑️ Limpar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={saving || storeNodes.length === 0}
            >
              💾 Guardar Flow
            </Button>
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {/* React Flow Canvas */}
        <div className="flex-1 rounded-lg border border-alpha-border overflow-hidden bg-alpha-surface">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Sidebar - Tools + Info */}
        <div className="w-72 flex flex-col gap-4">
          {/* Add Nodes */}
          <div className="rounded-lg border border-alpha-border bg-alpha-card p-4">
            <h3 className="font-bold text-sm text-text-primary mb-3">Adicionar Nós</h3>
            <div className="space-y-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAddNode('trigger')}
                className="w-full text-left"
              >
                🎯 Trigger
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAddNode('condition')}
                className="w-full text-left"
              >
                ⚙️ Condition
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAddNode('action')}
                className="w-full text-left"
              >
                ✅ Action
              </Button>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <h4 className="font-bold text-sm text-red-600 mb-2">❌ Erros</h4>
              <ul className="space-y-1">
                {errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-600">
                    • {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Flow Info */}
          <div className="rounded-lg border border-alpha-border bg-alpha-card p-4">
            <h4 className="font-bold text-sm text-text-primary mb-2">📊 Info</h4>
            <div className="space-y-1 text-xs text-text-secondary">
              <p>Nós: {storeNodes.length}/32</p>
              <p>Conexões: {storeEdges.length}</p>
              <p>Status: {errors.length ? '❌ Inválido' : '✅ Válido'}</p>
            </div>
          </div>

          {/* Help */}
          <div className="rounded-lg border border-gold/20 bg-gold/10 p-4">
            <h4 className="font-bold text-sm text-gold mb-2">💡 Dica</h4>
            <p className="text-xs text-text-secondary">
              1. Adiciona um Trigger (inicio)
              2. Adiciona Conditions (filtros)
              3. Adiciona uma Action (resultado)
              4. Valida e Guarda!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
