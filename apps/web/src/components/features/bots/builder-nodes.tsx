'use client';
import { Handle, Position } from 'reactflow';
import { useBotBuilderStore } from '@/store/bot-builder.store';

interface TrigerNodeProps {
  data: any;
  id: string;
}

export function TriggerNode({ data, id }: TrigerNodeProps) {
  const updateNode = useBotBuilderStore(s => s.updateNode);

  const events = ['MESSAGE_CREATE', 'MEMBER_JOIN', 'MEMBER_LEAVE', 'REACTION_ADD'];

  return (
    <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-4 min-w-[200px]">
      <h3 className="font-bold text-sm text-blue-900 mb-2">🎯 Trigger</h3>
      <select
        value={data.event || 'MESSAGE_CREATE'}
        onChange={e => updateNode(id, { event: e.target.value })}
        className="w-full px-2 py-1 border rounded text-sm bg-white"
      >
        {events.map(e => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

interface ConditionNodeProps {
  data: any;
  id: string;
}

export function ConditionNode({ data, id }: ConditionNodeProps) {
  const updateNode = useBotBuilderStore(s => s.updateNode);

  const conditionKinds = ['contains', 'channel', 'admin', 'role', 'userId'];

  return (
    <div className="rounded-lg border-2 border-yellow-500 bg-yellow-50 p-4 min-w-[250px]">
      <h3 className="font-bold text-sm text-yellow-900 mb-2">⚙️ Condition</h3>

      <div className="space-y-2">
        <select
          value={data.kind || 'contains'}
          onChange={e => updateNode(id, { kind: e.target.value })}
          className="w-full px-2 py-1 border rounded text-sm bg-white"
        >
          {conditionKinds.map(k => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        {data.kind === 'contains' && (
          <input
            type="text"
            placeholder="Texto para procurar..."
            value={data.value || ''}
            onChange={e => updateNode(id, { value: e.target.value })}
            className="w-full px-2 py-1 border rounded text-sm"
          />
        )}

        {data.kind === 'channel' && (
          <input
            type="text"
            placeholder="Channel ID..."
            value={data.channelId || ''}
            onChange={e => updateNode(id, { channelId: e.target.value })}
            className="w-full px-2 py-1 border rounded text-sm"
          />
        )}

        {data.kind === 'admin' && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.requireAdmin || false}
              onChange={e => updateNode(id, { requireAdmin: e.target.checked })}
            />
            Requer admin
          </label>
        )}

        {data.kind === 'role' && (
          <input
            type="text"
            placeholder="Role ID..."
            value={data.roleId || ''}
            onChange={e => updateNode(id, { roleId: e.target.value })}
            className="w-full px-2 py-1 border rounded text-sm"
          />
        )}

        {data.kind === 'userId' && (
          <input
            type="text"
            placeholder="User ID..."
            value={data.userId || ''}
            onChange={e => updateNode(id, { userId: e.target.value })}
            className="w-full px-2 py-1 border rounded text-sm"
          />
        )}
      </div>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

interface ActionNodeProps {
  data: any;
  id: string;
}

export function ActionNode({ data, id }: ActionNodeProps) {
  const updateNode = useBotBuilderStore(s => s.updateNode);

  const actionKinds = ['reply', 'sendMessage', 'deleteMessage', 'assignRole', 'mute', 'wait'];

  return (
    <div className="rounded-lg border-2 border-green-500 bg-green-50 p-4 min-w-[250px]">
      <h3 className="font-bold text-sm text-green-900 mb-2">✅ Action</h3>

      <div className="space-y-2">
        <select
          value={data.kind || 'reply'}
          onChange={e => updateNode(id, { kind: e.target.value })}
          className="w-full px-2 py-1 border rounded text-sm bg-white"
        >
          {actionKinds.map(k => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        {(data.kind === 'reply' || data.kind === 'sendMessage') && (
          <textarea
            placeholder="Mensagem de resposta..."
            value={data.text || ''}
            onChange={e => updateNode(id, { text: e.target.value })}
            className="w-full px-2 py-1 border rounded text-sm resize-none"
            rows={3}
            maxLength={2000}
          />
        )}

        {data.kind === 'deleteMessage' && (
          <p className="text-xs text-gray-600">Apagar mensagem que disparou</p>
        )}

        {data.kind === 'assignRole' && (
          <input
            type="text"
            placeholder="Role ID..."
            value={data.roleId || ''}
            onChange={e => updateNode(id, { roleId: e.target.value })}
            className="w-full px-2 py-1 border rounded text-sm"
          />
        )}

        {data.kind === 'mute' && (
          <div className="space-y-1">
            <label className="block text-xs font-medium">Duração (ms)</label>
            <input
              type="number"
              min="1000"
              max="86400000"
              value={data.durationMs || 3600000}
              onChange={e => updateNode(id, { durationMs: Number(e.target.value) })}
              className="w-full px-2 py-1 border rounded text-sm"
            />
            <p className="text-xs text-gray-500">
              {(data.durationMs / 1000 / 60).toFixed(0)} minutos
            </p>
          </div>
        )}

        {data.kind === 'wait' && (
          <div className="space-y-1">
            <label className="block text-xs font-medium">Delay (ms)</label>
            <input
              type="number"
              min="100"
              max="60000"
              value={data.delayMs || 1000}
              onChange={e => updateNode(id, { delayMs: Number(e.target.value) })}
              className="w-full px-2 py-1 border rounded text-sm"
            />
            <p className="text-xs text-gray-500">
              {(data.delayMs / 1000).toFixed(1)}s
            </p>
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Top} />
    </div>
  );
}
